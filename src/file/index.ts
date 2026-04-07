import { createReadStream } from 'fs';
import { createInterface } from 'readline';
import { ListOptions, FileUploadOptions } from '../types';
import BaseApi from '../common/baseApi';

class File extends BaseApi {

  protected service = 'files';

  /** Validate JSONL line-by-line without loading the whole file into memory. */
  private async isJsonl(filePath: string) {
    const input = createReadStream(filePath);
    const lines = createInterface({
      input,
      crlfDelay: Infinity,
    });
    try {
      for await (const line of lines) {
        JSON.parse(line);
      }
      return true;
    } catch {
      return false;
    } finally {
      input.close();
    }
  }

  async list(options: ListOptions) {
    const result = await this.request({
      method: 'get',
      params: options,
    });
    return result.data;
  }

  async fetch(fileId: string) {
    const result = await this.request({
      api: fileId,
      method: 'get',
    });
    return result.data;
  }

  async upload(options: FileUploadOptions) {
    const { file_path, purpose, description } = options;
    if (purpose === 'fine_tune' && !(await this.isJsonl(file_path))) {
      throw new Error(`The file ${file_path} is not in valid jsonl format`);
    }
    const data: Record<string, unknown> = {
      files: createReadStream(file_path),
    };
    if (description) {
      data.descriptions = JSON.stringify([ description ]);
    }
    const result = await this.request({
      method: 'post',
      data,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return result.data;
  }

  async delete(fileId: string) {
    const result = await this.request({
      api: fileId,
      method: 'delete',
    });
    return result.data;
  }
};

export default File;
