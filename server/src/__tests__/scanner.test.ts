import express from 'express';
import request from 'supertest';
import scanRouter from '../routes/scan';
import { validateDomain } from '../services/domainValidation';

const app = express();
app.use(express.json());
app.use('/api/scan', scanRouter);

describe('domain validation', () => {
  test('normalizes a public domain', () => {
    expect(validateDomain(' Example.COM. ')).toBe('example.com');
  });

  test.each(['127.0.0.1', 'localhost', 'service.internal', 'example', 'bad..example.com'])(
    'rejects unsafe or malformed input: %s',
    (domain) => {
      expect(() => validateDomain(domain)).toThrow();
    },
  );
});

describe('scan route', () => {
  test('rejects invalid domains before starting outbound work', async () => {
    const response = await request(app)
      .post('/api/scan')
      .send({ domain: '192.168.1.1' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('INVALID_DOMAIN');
  });
});
