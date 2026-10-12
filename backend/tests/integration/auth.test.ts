import request from 'supertest';
import { app } from '../helpers/api';
import { clearTestDb, startTestDb, stopTestDb } from '../helpers/db';

beforeAll(startTestDb);
afterEach(clearTestDb);
afterAll(stopTestDb);

const brand = { name: 'Acme Brand', email: 'Brand@Acme.dev ', password: 'password123', role: 'brand' };

describe('POST /api/auth/signup', () => {
  it('creates an account and returns a token, without the password hash', async () => {
    const res = await request(app).post('/api/auth/signup').send(brand).expect(201);

    expect(res.body).toMatchObject({ status: 'success', statusCode: 201, message: 'Account created' });
    expect(res.body.data.token).toEqual(expect.any(String));
    expect(res.body.data.user).toEqual({
      id: expect.any(String),
      name: 'Acme Brand',
      email: 'brand@acme.dev', // trimmed and lower-cased
      role: 'brand',
    });
  });

  it('rejects a second account with the same email', async () => {
    await request(app).post('/api/auth/signup').send(brand).expect(201);
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ ...brand, email: 'brand@acme.dev', role: 'creator' })
      .expect(409);
    expect(res.body).toMatchObject({ status: 'error', code: 'EMAIL_TAKEN' });
  });

  it('explains every invalid field', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'A', email: 'nope', password: 'short', role: 'admin' })
      .expect(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.details.map((d: { path: string }) => d.path).sort()).toEqual(['email', 'name', 'password', 'role']);
  });

  it('reports malformed JSON clearly', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .set('Content-Type', 'application/json')
      .send('{"name": ')
      .expect(400);
    expect(res.body.code).toBe('INVALID_JSON');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/signup').send(brand).expect(201);
  });

  it('logs in with the right password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'brand@acme.dev', password: 'password123' })
      .expect(200);
    expect(res.body.data.user.role).toBe('brand');
  });

  it('gives the same error for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: 'brand@acme.dev', password: 'wrong-password' })
      .expect(401);
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@acme.dev', password: 'password123' })
      .expect(401);
    expect(wrongPassword.body.code).toBe('INVALID_CREDENTIALS');
    expect(unknownEmail.body.message).toBe(wrongPassword.body.message);
  });
});

describe('GET /api/auth/me', () => {
  it('needs a token', async () => {
    const res = await request(app).get('/api/auth/me').expect(401);
    expect(res.body.code).toBe('UNAUTHORIZED');
  });

  it('rejects a tampered token', async () => {
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not.a.token').expect(401);
    expect(res.body.code).toBe('INVALID_TOKEN');
  });

  it('returns the logged-in user', async () => {
    const signup = await request(app).post('/api/auth/signup').send(brand).expect(201);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${signup.body.data.token}`)
      .expect(200);
    expect(res.body.data.email).toBe('brand@acme.dev');
  });
});
