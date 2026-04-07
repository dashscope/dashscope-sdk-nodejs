/** ASR biasing vocabulary service (Python `VocabularyService` parity). */
import BaseApi from '../../common/baseApi';
import { HTTP_STATUS_OK } from '../../common/consts';

export class VocabularyServiceException extends Error {
  requestId: string;
  statusCode: number;
  code: string;

  constructor(requestId: string, statusCode: number, code: string, errorMessage: string) {
    super(errorMessage);
    this.name = 'VocabularyServiceException';
    this.requestId = requestId;
    this.statusCode = statusCode;
    this.code = code;
  }
}

export interface VocabularyItem {
  word: string;
  weight?: number;
}

class Vocabulary extends BaseApi {
  private static SERVICE_PATH = 'services/audio/asr/customization';
  private static DEFAULT_MODEL = 'speech-biasing';

  protected service = Vocabulary.SERVICE_PATH;

  private model = Vocabulary.DEFAULT_MODEL;
  private lastRequestId: string | null = null;

  constructor(configuration: import('../../configuration').default, model?: string) {
    super(configuration);
    if (model) this.model = model;
  }

  private validateRequired(value: unknown, fieldName: string): void {
    if (!value) throw new Error(`${fieldName} is required`);
  }

  private validateVocabularyId(vocabularyId: string): void {
    this.validateRequired(vocabularyId, 'vocabulary_id');
  }

  private validateTargetModel(targetModel: string): void {
    this.validateRequired(targetModel, 'target_model');
  }

  private validatePrefix(prefix: string): void {
    this.validateRequired(prefix, 'prefix');
  }

  private validateVocabulary(vocabulary: VocabularyItem[]): void {
    if (!vocabulary || vocabulary.length === 0) {
      throw new Error('vocabulary is required');
    }
  }

  private async callWithInput(input: Record<string, unknown>) {
    const result = await this.request({
      method: 'post',
      data: {
        model: this.model,
        input,
      },
    });
    const status = result.status ?? result.data?.status;
    const data = result.data || {};
    if (status === HTTP_STATUS_OK) {
      this.lastRequestId = data.request_id;
      return { status, data };
    }
    throw new VocabularyServiceException(
      data?.request_id || '',
      status || -1,
      data?.code || '',
      data?.message || 'Unknown error',
    );
  }

  /** Create a vocabulary. */
  async createVocabulary(
    targetModel: string,
    prefix: string,
    vocabulary: VocabularyItem[],
  ): Promise<string> {
    this.validateTargetModel(targetModel);
    this.validatePrefix(prefix);
    this.validateVocabulary(vocabulary);
    const { data } = await this.callWithInput({
      action: 'create_vocabulary',
      target_model: targetModel,
      prefix,
      vocabulary,
    });
    const output = data.output ?? data;
    return output.vocabulary_id;
  }

  /** List vocabularies. */
  async listVocabularies(
    prefix?: string,
    pageIndex = 0,
    pageSize = 10,
  ): Promise<Array<VocabularyItem & Record<string, unknown>>> {
    const input: Record<string, unknown> = {
      action: 'list_vocabulary',
      page_index: pageIndex,
      page_size: pageSize,
    };
    if (prefix) input.prefix = prefix;
    const { data } = await this.callWithInput(input);
    const output = data.output ?? data;
    return output.vocabulary_list || [];
  }

  /** Fetch vocabulary entries. */
  async queryVocabulary(vocabularyId: string): Promise<Record<string, unknown>> {
    this.validateVocabularyId(vocabularyId);
    const { data } = await this.callWithInput({
      action: 'query_vocabulary',
      vocabulary_id: vocabularyId,
    });
    return data.output ?? data ?? {};
  }

  /** Replace vocabulary contents. */
  async updateVocabulary(vocabularyId: string, vocabulary: VocabularyItem[]): Promise<void> {
    this.validateVocabularyId(vocabularyId);
    this.validateVocabulary(vocabulary);
    await this.callWithInput({
      action: 'update_vocabulary',
      vocabulary_id: vocabularyId,
      vocabulary,
    });
  }

  /** Delete a vocabulary. */
  async deleteVocabulary(vocabularyId: string): Promise<void> {
    this.validateVocabularyId(vocabularyId);
    await this.callWithInput({
      action: 'delete_vocabulary',
      vocabulary_id: vocabularyId,
    });
  }

  getLastRequestId(): string | null {
    return this.lastRequestId;
  }
}

export default Vocabulary;
