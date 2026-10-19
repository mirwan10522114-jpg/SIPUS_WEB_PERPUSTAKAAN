/**
 * Integration smoke test (Jest + Supertest) — butuh database dev berjalan & data seed.
 */
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('API smoke test', () => {
  test('GET /api/books — katalog publik dapat diakses tanpa login', async () => {
    const res = await request(app).get('/api/books?limit=5');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta.total).toBeGreaterThan(0);
  });

  test('GET /api/announcements — publik', async () => {
    const res = await request(app).get('/api/announcements');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/auth/login — kredensial admin seed', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'ADM001', password: 'admin123' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.user.role).toBe('admin');
  });

  test('POST /api/auth/login — password salah → 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'ADM001', password: 'salah' });
    expect(res.status).toBe(401);
  });

  test('GET /api/members — tanpa token → 401', async () => {
    const res = await request(app).get('/api/members');
    expect(res.status).toBe(401);
  });

  test('RBAC: siswa tidak boleh akses /api/members → 403', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ identifier: '2026001', password: 'siswa123' });
    expect(login.status).toBe(200);
    const res = await request(app)
      .get('/api/members')
      .set('Authorization', `Bearer ${login.body.data.accessToken}`);
    expect(res.status).toBe(403);
  });
});
