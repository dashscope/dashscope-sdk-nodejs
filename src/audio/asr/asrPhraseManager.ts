/**
 * ASR phrase hotlist management (Python `AsrPhraseManager` parity) on top of fine-tune endpoints.
 */
import BaseApi from '../../common/baseApi';
import { HTTP_STATUS_OK } from '../../common/consts';

/** Phrase string to weight map, e.g. `{ next: 90, prev: 90 }`. */
export type PhraseList = Record<string, number>;

class AsrPhraseManager extends BaseApi {
  private static FINE_TUNES_PATH = 'fine-tunes';
  private static FINE_TUNES_OUTPUTS_PATH = 'fine-tunes/outputs';
  private static DEFAULT_TRAINING_TYPE = 'compile_asr_phrase';

  private validatePhraseId(phraseId: string): void {
    if (!phraseId) throw new Error('phrase_id is required');
  }

  private validatePhrases(phrases: PhraseList): void {
    if (!phrases || Object.keys(phrases).length === 0) {
      throw new Error('phrases is required');
    }
  }

  private buildPhraseRequestData(
    model: string,
    phrases: PhraseList,
    trainingType: string,
    phraseId?: string,
  ): Record<string, unknown> {
    const data: Record<string, unknown> = {
      model,
      training_file_ids: [],
      validation_file_ids: [],
      training_type: trainingType,
      hyper_parameters: { phrase_list: phrases },
    };
    if (phraseId) {
      data.finetuned_output = phraseId;
    }
    return data;
  }

  private checkResponseStatus(result: { status?: number; data?: unknown }): void {
    const status = result.status;
    if (status === undefined || status !== HTTP_STATUS_OK) {
      const data = typeof result.data === 'object' && result.data !== null ? result.data as Record<string, unknown> : {};
      const message = (data.message as string) || (data.code as string) || 'Request failed';
      const statusCode = status === undefined ? 'unknown' : status;
      throw new Error(`AsrPhraseManager API error (status: ${statusCode}): ${message}`);
    }
  }

  private async sendPhraseRequest(
    model: string,
    phrases: PhraseList,
    trainingType: string,
    phraseId?: string,
    workspace?: string,
  ) {
    if (!model) throw new Error('model is required');
    this.validatePhrases(phrases);
    if (phraseId) {
      this.validatePhraseId(phraseId);
    }
    const data = this.buildPhraseRequestData(model, phrases, trainingType, phraseId);
    const result = await this.request({
      method: 'post',
      service: AsrPhraseManager.FINE_TUNES_PATH,
      data,
      workspace,
    });
    this.checkResponseStatus(result);
    return result.data;
  }

  /** Create a phrase list job. */
  async createPhrases(
    model: string,
    phrases: PhraseList,
    trainingType = AsrPhraseManager.DEFAULT_TRAINING_TYPE,
    workspace?: string,
  ) {
    return this.sendPhraseRequest(model, phrases, trainingType, undefined, workspace);
  }

  /** Update phrases for an existing phrase id. */
  async updatePhrases(
    model: string,
    phraseId: string,
    phrases: PhraseList,
    trainingType = AsrPhraseManager.DEFAULT_TRAINING_TYPE,
    workspace?: string,
  ) {
    return this.sendPhraseRequest(model, phrases, trainingType, phraseId, workspace);
  }

  /** Fetch phrase metadata by id. */
  async queryPhrases(phraseId: string, workspace?: string) {
    this.validatePhraseId(phraseId);
    const result = await this.request({
      method: 'get',
      service: AsrPhraseManager.FINE_TUNES_OUTPUTS_PATH,
      api: phraseId,
      workspace,
    });
    this.checkResponseStatus(result);
    return result.data;
  }

  /** Page through phrase resources. */
  async listPhrases(page = 1, pageSize = 10, workspace?: string) {
    const result = await this.request({
      method: 'get',
      service: AsrPhraseManager.FINE_TUNES_OUTPUTS_PATH,
      params: { page_no: page, page_size: pageSize },
      workspace,
    });
    this.checkResponseStatus(result);
    return result.data;
  }

  /** Delete phrases by resource id. */
  async deletePhrases(phraseId: string, workspace?: string) {
    this.validatePhraseId(phraseId);
    const result = await this.request({
      method: 'delete',
      service: AsrPhraseManager.FINE_TUNES_OUTPUTS_PATH,
      api: phraseId,
      workspace,
    });
    this.checkResponseStatus(result);
    return result.data;
  }
}

export default AsrPhraseManager;
