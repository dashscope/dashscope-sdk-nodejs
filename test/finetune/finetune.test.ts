import { join } from 'path';
import { tmpdir } from 'os';
import { writeFileSync, unlinkSync } from 'fs';
import { ok } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import { MOCK_HTTP_ORIGIN, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('Fine-tuning', function() {

  let api!: DashscopeApi;
  let fileId: string;
  let jobId: string;
  this.timeout(60000);

  before(async function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));

    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post('/api/v1/files', () => true)
        .reply(200, {
          data: { uploaded_files: [{ file_id: 'mock-ft-file-1' }] },
          request_id: 'ft-up-1',
        });
    }

    const tmpFile = join(tmpdir(), 'fine_tune.jsonl');
    const jsonlContent = [
      { text: '\n\nHuman: If today is Monday, what day was yesterday?\n\nAssistant: Sunday.' },
    ].map(line => JSON.stringify(line)).join('\n');
    writeFileSync(tmpFile, jsonlContent, 'utf-8');

    const result = await api.uploadFile({
      file_path: tmpFile,
      purpose: 'fine_tune',
    });
    fileId = result.data.uploaded_files[0].file_id;

    unlinkSync(tmpFile);
  });

  it('create fine-tune job', async function() {
    const mockJobId = 'mock-ft-job-1';
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post('/api/v1/fine-tunes')
        .reply(200, {
          output: { job_id: mockJobId, status: 'PENDING' },
          request_id: 'ft-create-1',
        });
    }
    const result = await api.createFineTune({
      model: 'qwen3-14b',
      training_file_ids: [fileId],
    });
    jobId = result.job_id as string;
    ok(jobId);
  });

  it('get fine-tune job', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .get(`/api/v1/fine-tunes/${jobId}`)
        .reply(200, {
          output: { job_id: jobId, status: 'RUNNING' },
          request_id: 'ft-get-1',
        });
    }
    const result = await api.getFineTune(jobId);
    ok(result.job_id === jobId);
  });

  it('list fine-tune jobs', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .get('/api/v1/fine-tunes')
        .query({ page_no: '1', page_size: '5' })
        .reply(200, {
          output: { jobs: [{ job_id: jobId }] },
          request_id: 'ft-list-1',
        });
    }
    const result = await api.listFineTunes({
      page_no: 1,
      page_size: 5,
    });
    ok(result !== undefined);
    ok(Array.isArray(result.jobs));
  });

  it('cancel fine-tune job', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post(`/api/v1/fine-tunes/${jobId}/cancel`)
        .reply(200, { request_id: 'ft-cancel-1' });
      nock(MOCK_HTTP_ORIGIN)
        .get(`/api/v1/fine-tunes/${jobId}`)
        .reply(200, {
          output: { job_id: jobId, status: 'CANCELING' },
          request_id: 'ft-get-2',
        });
    }
    await api.cancelFineTune(jobId);
    const result = await api.getFineTune(jobId);
    ok(['CANCELING', 'CANCELED', 'SUCCEEDED'].includes(result.status || ''));
  });

  it('delete fine-tuned model', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .get(`/api/v1/fine-tunes/${jobId}`)
        .reply(200, {
          output: { job_id: jobId, status: 'CANCELED' },
          request_id: 'ft-get-3',
        });
      nock(MOCK_HTTP_ORIGIN)
        .delete(`/api/v1/fine-tunes/${jobId}`)
        .reply(200, {
          output: { status: 'success' },
          request_id: 'ft-del-1',
        });
    }
    const result = await api.deleteFineTune(jobId);
    ok(result.status === 'success' || result.status === 'deleted' || !result.code);
  });

  after(async function() {
    if (!fileId) return;
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .delete(`/api/v1/files/${fileId}`)
        .reply(200, { request_id: 'ft-clean-1' });
    }
    try {
      await api.deleteFile(fileId);
    } catch {
      /* ignore cleanup errors */
    }
  });
});
