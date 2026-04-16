const request = require('supertest');
const app = require('../src/index');

jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  pool: { on: jest.fn(), connect: jest.fn(), end: jest.fn() },
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_token'),
  verify: jest.fn(),
}));

jest.mock('nanoid', () => ({ nanoid: jest.fn().mockReturnValue('abc1234') }));

const { query } = require('../src/config/database');
const jwt = require('jsonwebtoken');

const mockUser = { id: 'user-uuid-1', email: 'test@example.com' };
const AUTH_HEADER = { Authorization: 'Bearer mock_token' };

beforeEach(() => {
  jest.clearAllMocks();
  jwt.verify.mockReturnValue(mockUser);
});

describe('POST /api/urls', () => {
  it('should create a short URL', async () => {
    query
      .mockResolvedValueOnce({ rows: [] }) // no existing custom code check
      .mockResolvedValueOnce({
        rows: [{
          id: 'url-uuid-1',
          user_id: mockUser.id,
          original_url: 'https://example.com',
          short_code: 'abc1234',
          expires_at: null,
          is_active: true,
          created_at: new Date(),
        }],
      });

    const res = await request(app)
      .post('/api/urls')
      .set(AUTH_HEADER)
      .send({ original_url: 'https://example.com' });

    expect(res.statusCode).toBe(201);
    expect(res.body.data.short_code).toBe('abc1234');
    expect(res.body.data).toHaveProperty('short_url');
  });

  it('should return 400 for an invalid URL', async () => {
    const res = await request(app)
      .post('/api/urls')
      .set(AUTH_HEADER)
      .send({ original_url: 'not-a-url' });

    expect(res.statusCode).toBe(400);
  });

  it('should return 409 if custom code is already taken', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'url-uuid-2', short_code: 'mycode' }],
    });

    const res = await request(app)
      .post('/api/urls')
      .set(AUTH_HEADER)
      .send({ original_url: 'https://example.com', custom_code: 'mycode' });

    expect(res.statusCode).toBe(409);
  });

  it('should return 401 without auth', async () => {
    const res = await request(app)
      .post('/api/urls')
      .send({ original_url: 'https://example.com' });

    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/urls', () => {
  it('should return paginated list of user URLs', async () => {
    query
      .mockResolvedValueOnce({
        rows: [{
          id: 'url-uuid-1',
          original_url: 'https://example.com',
          short_code: 'abc1234',
          expires_at: null,
          is_active: true,
          created_at: new Date(),
          click_count: 5,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ total: 1 }] });

    const res = await request(app).get('/api/urls').set(AUTH_HEADER);

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination.total).toBe(1);
  });
});

describe('DELETE /api/urls/:id', () => {
  it('should delete a URL owned by the user', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 'url-uuid-1' }] });

    const res = await request(app)
      .delete('/api/urls/url-uuid-1')
      .set(AUTH_HEADER);

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/deleted/i);
  });

  it('should return 404 if URL does not belong to user', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/urls/other-uuid')
      .set(AUTH_HEADER);

    expect(res.statusCode).toBe(404);
  });
});

describe('GET /:shortCode (redirect)', () => {
  it('should redirect to the original URL', async () => {
    query
      .mockResolvedValueOnce({
        rows: [{
          id: 'url-uuid-1',
          original_url: 'https://example.com',
          short_code: 'abc1234',
          expires_at: null,
          is_active: true,
        }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 'click-uuid-1', clicked_at: new Date() }] });

    const res = await request(app).get('/abc1234');

    expect(res.statusCode).toBe(301);
    expect(res.headers.location).toBe('https://example.com');
  });

  it('should return 404 for unknown short code', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/unknown');
    expect(res.statusCode).toBe(404);
  });

  it('should return 410 for a deactivated URL', async () => {
    query.mockResolvedValueOnce({
      rows: [{
        id: 'url-uuid-1',
        original_url: 'https://example.com',
        short_code: 'abc1234',
        expires_at: null,
        is_active: false,
      }],
    });

    const res = await request(app).get('/abc1234');
    expect(res.statusCode).toBe(410);
  });
});
