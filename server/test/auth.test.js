import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

describe('Authentication Module & Tenant Context', { timeout: 25000 }, () => {
  const timestamp = Date.now();
  const testUser = {
    email: `test_${timestamp}@example.com`,
    password: 'Password123!',
    name: 'Ada Lovelace',
    companyName: `Lovelace Analytics ${timestamp}`,
  };

  let accessToken = '';
  let refreshToken = '';
  let createdUserId = '';
  let createdCompanyId = '';

  afterAll(async () => {
    // Cleanup created test company and user (cascades memberships and audit logs)
    if (createdCompanyId) {
      await prisma.company.deleteMany({ where: { id: createdCompanyId } });
    }
    if (createdUserId) {
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/auth/signup', () => {
    it('should reject signup with missing or invalid fields', async () => {
      const res = await request(app).post('/api/auth/signup').send({
        email: 'not-an-email',
        password: 'short',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error', 'Validation failed');
      expect(res.body.details).toBeInstanceOf(Array);
    });

    it('should successfully register a user and company workspace', async () => {
      const res = await request(app).post('/api/auth/signup').send(testUser);

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.user.name).toBe(testUser.name);
      expect(res.body.user).not.toHaveProperty('passwordHash');

      expect(res.body).toHaveProperty('company');
      expect(res.body.company.name).toBe(testUser.companyName);
      expect(res.body.company.role).toBe('OWNER');

      expect(res.body).toHaveProperty('tokens');
      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');

      accessToken = res.body.tokens.accessToken;
      refreshToken = res.body.tokens.refreshToken;
      createdUserId = res.body.user.id;
      createdCompanyId = res.body.company.id;
    });

    it('should reject duplicate email registration with 409 Conflict', async () => {
      const res = await request(app).post('/api/auth/signup').send(testUser);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should reject invalid password with 401', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: 'WrongPassword999!',
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid email or password');
    });

    it('should reject non-existent user with 401', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'nobody@nowhere-futon.dev',
        password: 'Password123!',
      });

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty('error', 'Invalid email or password');
    });

    it('should authenticate user and return company workspace context', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: testUser.email,
        password: testUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.companies.length).toBeGreaterThanOrEqual(1);
      expect(res.body.activeCompany.id).toBe(createdCompanyId);
      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should reject invalid refresh token', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid.token.string' });

      expect(res.status).toBe(401);
    });

    it('should issue new access token with valid refresh token', async () => {
      const res = await request(app).post('/api/auth/refresh').send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');
    });
  });

  describe('GET /api/auth/me (Protected Route & Tenant Scoping)', () => {
    it('should reject request without token with 401', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should return authenticated user and active company context', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.id).toBe(createdUserId);
      expect(res.body.company.id).toBe(createdCompanyId);
      expect(res.body.membership.role).toBe('OWNER');
    });

    it('should attach requested workspace when x-company-id header is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-company-id', createdCompanyId);

      expect(res.status).toBe(200);
      expect(res.body.company.id).toBe(createdCompanyId);
    });

    it('should reject cross-tenant access when company does not belong to user', async () => {
      const randomCompanyId = '00000000-0000-0000-0000-000000000000';
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-company-id', randomCompanyId);

      expect(res.status).toBe(403);
      expect(res.body).toHaveProperty('error');
    });
  });

  describe('Password Reset Endpoints', () => {
    it('POST /api/auth/forgot-password should return success message even for unknown email (no leak)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'unknown_reset@example.com' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('message');
    });

    it('POST /api/auth/reset-password should reject invalid or expired reset token', async () => {
      const res = await request(app).post('/api/auth/reset-password').send({
        token: 'invalid-nonexistent-token',
        newPassword: 'NewSecurePassword123!',
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty('error');
    });
  });
});
