import BaseApi from '../../../common/baseApi';
import { waitForTask } from '../../../common/asyncTask';
import { TranscriptionOptions } from '../../../types';

class Transcription extends BaseApi {

  protected service = 'services/audio/asr/transcription';

  async fetch(taskId: string) {
    const result = await this.request({
      service: 'tasks',
      api: taskId,
      method: 'get',
      headers: {
        'X-DashScope-Async': 'enable',
      },
    });
    return result.data;
  }

  async asyncCall(options: TranscriptionOptions) {
    const { model, file_urls, ...rest } = options;
    const result = await this.request({
      method: 'post',
      headers: {
        'X-DashScope-Async': 'enable',
      },
      data: {
        model,
        parameters: { ...rest },
        input: { file_urls },
      },
    });
    return result.data;
  }

  async call(options: TranscriptionOptions) {
    const createResult = await this.asyncCall(options);
    return waitForTask(createResult, (taskId) => this.fetch(taskId));
  }
}

export default Transcription;
