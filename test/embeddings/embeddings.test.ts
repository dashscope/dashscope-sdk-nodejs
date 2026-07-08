import { ok, strictEqual } from 'assert';
import nock from 'nock';
import { Configuration, DashscopeApi } from '../../src/index';
import Result from '../../src/embeddings/text-embedding/result';
import { MOCK_HTTP_ORIGIN, testDashscopeConfig, useLiveApi } from '../helpers/mockConfig';

describe('Text embedding', function() {

  const path = '/api/v1/services/embeddings/text-embedding/text-embedding';
  let api: DashscopeApi;

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('single input', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post(path)
        .reply(200, {
          output: { embeddings: [{ text_index: 0, embedding: [0.1, 0.2, 0.3] }] },
          request_id: 'emb-1',
          usage: { input_tokens: 2 },
        });
    }
    const result = await api.createEmbedding({
      model: 'text-embedding-v1',
      input: 'hello world',
    });
    ok(result instanceof Result);
    ok(result.output?.embeddings?.length === 1);
  });

  it('batch input', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post(path)
        .reply(200, {
          output: {
            embeddings: [
              { text_index: 0, embedding: [0.1] },
              { text_index: 1, embedding: [0.2] },
            ],
          },
          request_id: 'emb-2',
        });
    }
    const result = await api.createEmbedding({
      model: 'text-embedding-v1',
      input: ['hello', 'dashscope sdk'],
    });
    ok(result instanceof Result);
    ok((result.output?.embeddings?.length ?? 0) === 2);
  });

  it('text_type parameter', async function() {
    if (!useLiveApi()) {
      nock(MOCK_HTTP_ORIGIN)
        .post(path)
        .reply(200, {
          output: { embeddings: [{ text_index: 0, embedding: [0.5] }] },
          request_id: 'emb-3',
        });
    }
    const result = await api.createEmbedding({
      model: 'text-embedding-v1',
      input: 'sample query text',
      text_type: 'query',
    });
    ok(result instanceof Result);
  });
});

describe('Batch text embedding wait_timeout', function() {
  const asyncPath = '/api/v1/services/embeddings/text-embedding/text-embedding-async';
  const taskId = 'mock-batch-emb-task-1';
  let api: DashscopeApi;

  before(function() {
    api = new DashscopeApi(new Configuration(testDashscopeConfig()));
  });

  it('wait_timeout returns timeout response', async function() {
    if (useLiveApi()) {
      this.skip();
    }
    nock(MOCK_HTTP_ORIGIN)
      .post(asyncPath)
      .reply(200, {
        output: { task_id: taskId },
        request_id: 'batch-emb-1',
      });
    nock(MOCK_HTTP_ORIGIN)
      .persist()
      .get(`/api/v1/tasks/${taskId}`)
      .reply(200, {
        output: { task_status: 'PENDING' },
        request_id: 'batch-emb-poll-1',
      });
    const result = await api.createBatchEmbedding({
      model: 'text-embedding-v2',
      url: 'https://example.com/batch.jsonl',
      wait_timeout: 1,
    });
    strictEqual(result.code, 'WaitTaskTimeout');
    nock.cleanAll();
  });
});
