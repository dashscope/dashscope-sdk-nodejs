'use strict';

const path = require('path');
const nock = require('nock');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

exports.mochaHooks = {
  beforeAll() {
    if (process.env.DASHSCOPE_LIVE_API === '1' || process.env.DASHSCOPE_LIVE_API === 'true') {
      return;
    }
    nock.disableNetConnect();
  },
  afterEach() {
    nock.cleanAll();
  },
  afterAll() {
    nock.enableNetConnect();
  },
};
