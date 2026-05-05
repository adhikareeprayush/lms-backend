const request = require('supertest');
const app = require('../src/app');

describe('GET /health', () => {
  it('returns OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/running/i);
  });
});
