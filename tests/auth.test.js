const request = require('supertest');
const app = require('../src/index');

// Mock the database so tests run without a real PostgreSQL instance
jest.mock('../src/config/database', () => ({
  query: jest.fn(),
  pool: { on: jest.fn(), connect: jest.fn(), end: jest.fn() },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_token'),
  verify: jest.fn(),
}));

const { query } = require('../src/config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should register a new user and return a token', async () => {
    query
      .mockResolvedValueOnce({ rows: [] }) // findByEmail → no existing user
      .mockResolvedValueOnce({             // create → new user row
        rows: [{ id: 'uuid-1', email: 'test@example.com', created_at: new Date() }],
      });

    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'securepassword123',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token', 'mock_token');
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('should return 409 if email is already registered', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'uuid-1', email: 'test@example.com' }],
    });

    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'securepassword123',
    });

    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('Conflict');
  });

  it('should return 400 if email is missing', async () => {
    const res = await request(app).post('/api/auth/register').send({
      password: 'securepassword123',
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('Validation Error');
  });

  it('should return 400 if password is too short', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'test@example.com',
      password: 'short',
    });
    expect(res.statusCode).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should login and return a token for valid credentials', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'uuid-1', email: 'test@example.com', password: 'hashed_password', created_at: new Date() }],
    });
    bcrypt.compare.mockResolvedValueOnce(true);

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'securepassword123',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should return 401 for wrong password', async () => {
    query.mockResolvedValueOnce({
      rows: [{ id: 'uuid-1', email: 'test@example.com', password: 'hashed_password' }],
    });
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app).post('/api/auth/login').send({
      email: 'test@example.com',
      password: 'wrongpassword',
    });

    expect(res.statusCode).toBe(401);
  });

  it('should return 401 for non-existent user', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@example.com',
      password: 'securepassword123',
    });

    expect(res.statusCode).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return user info for a valid token', async () => {
    jwt.verify.mockReturnValueOnce({ id: 'uuid-1', email: 'test@example.com' });
    query.mockResolvedValueOnce({
      rows: [{ id: 'uuid-1', email: 'test@example.com', created_at: new Date() }],
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer mock_token');

    expect(res.statusCode).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
  });

  it('should return 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });
});
