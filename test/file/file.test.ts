import { join } from 'path';
import { tmpdir } from 'os';
import { writeFileSync, unlinkSync } from 'fs';
import { ok } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import { MOCK_HTTP_ORIGIN, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('File API', function() {

  let api: DashscopeApi;
  let fileId: string;
  this.timeout(60000);

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('upload file', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post('/api/v1/files', () => true)
        .reply(200, {
          data: { uploaded_files: [{ file_id: 'mock-file-1' }] },
          request_id: 'f-up-1',
        });
    }
    const tmpFile = join(tmpdir(), 'fine_tune.jsonl');
    const jsonlContent = [
      { text: '\n\nHuman: What day was yesterday if today is Monday?\n\nAssistant: Sunday.' },
    ].map(line => JSON.stringify(line)).join('\n');
    writeFileSync(tmpFile, jsonlContent, 'utf-8');

    const result = await api.uploadFile({
      file_path: tmpFile,
      purpose: 'fine_tune',
    });
    fileId = result.data.uploaded_files[0].file_id;
    ok(fileId);

    unlinkSync(tmpFile);
  });

  it('get file', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .get(`/api/v1/files/${fileId}`)
        .reply(200, {
          data: { file_id: fileId },
          request_id: 'f-get-1',
        });
    }
    const result = await api.getFile(fileId);
    ok(result.data.file_id === fileId);
  });

  it('list files', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .get('/api/v1/files')
        .query({ page_no: '1', page_size: '5' })
        .reply(200, {
          data: { files: [{ file_id: fileId, name: 'a.jsonl' }] },
          request_id: 'f-list-1',
        });
    }
    const result = await api.listFiles({
      page_no: 1,
      page_size: 5,
    });
    ok(result.data.files.length);
  });

  it('delete file', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .delete(`/api/v1/files/${fileId}`)
        .reply(200, { request_id: 'f-del-1' });
      nock(MOCK_HTTP_ORIGIN)
        .get(`/api/v1/files/${fileId}`)
        .reply(200, { data: null });
    }
    await api.deleteFile(fileId);
    const result = await api.getFile(fileId);
    ok(!result.data);
  });
});
