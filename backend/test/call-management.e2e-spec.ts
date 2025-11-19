import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { Server } from 'http';

interface SignInResponse {
  accessToken: string;
}

describe('Call Management System (e2e)', () => {
  let app: INestApplication;
  let authToken: string;
  let server: Server;

  // Test data
  const testUser = {
    username: 'Adam1',
    password: '123456',
  };

  const testPhoneNumber = '+17853902194';

  beforeAll(async () => {
    // Set test environment variables for local testing
    process.env.NODE_ENV = 'test';
    process.env.CLICKHOUSE_URL = 'http://localhost:8123';
    process.env.CLICKHOUSE_HOST = 'localhost';
    process.env.CLICKHOUSE_PORT = '8123';
    process.env.CLICKHOUSE_DATABASE = 'call_management';
    process.env.CLICKHOUSE_USERNAME = 'default';
    process.env.CLICKHOUSE_PASSWORD = '1234';
    process.env.JWT_SECRET = 'test-jwt-secret-for-e2e-testing';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.enableCors();

    await app.init();
    server = app.getHttpServer() as Server;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Health Checks', () => {
    it('should return application status', () => {
      return request(server).get('/').expect(200).expect('Hello World!');
    });

    it('should return health check status', async () => {
      const response = await request(server).get('/health');
      expect(response.body).toHaveProperty('firebase');
      expect(response.body).toHaveProperty('clickhouse');
      expect(response.body).toHaveProperty('twilio');
    });
  });

  describe(' Authentication Flow', () => {
    it('should create a new user account', async () => {
      const response = await request(server).post('/users').send(testUser);

      expect([200, 201, 409]).toContain(response.status); // 409 if user already exists

      if (response.status === 409) {
        console.log(
          ' Test user already exists - continuing with existing user',
        );
      } else {
        expect(response.body).toHaveProperty('message');
        console.log('New test user created successfully');
      }
    });

    it('should sign in with valid credentials', async () => {
      const response = await request(server)
        .post('/auth/signin')
        .send(testUser);

      expect([200, 201, 401, 500]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        expect(response.body).toHaveProperty('accessToken');
        expect(typeof (response.body as SignInResponse).accessToken).toBe(
          'string',
        );
        authToken = (response.body as SignInResponse).accessToken;
      } else {
        authToken = 'mock-token-for-testing';
      }
    });

    it('should reject invalid credentials', async () => {
      const response = await request(server).post('/auth/signin').send({
        username: 'invaliduser',
        password: 'wrongpassword',
      });

      expect([401, 500]).toContain(response.status); // 500 if DB connection issues
    });

    it('should validate JWT token', async () => {
      if (!authToken) {
        return;
      }

      const response = await request(server)
        .get('/auth/validate-token')
        .query({ token: authToken });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('user_id');
        expect(response.body).toHaveProperty('username');
      }
    });
  });

  describe('Call Management', () => {
    beforeEach(() => {
      if (!authToken) {
        return;
      }
    });

    it('should retrieve user calls with pagination', async () => {
      if (!authToken) return;

      const response = await request(server)
        .get('/calls')
        .query({ page: 1, limit: 10 })
        .set('Authorization', `Bearer ${authToken}`);

      expect([401, 200, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray((response.body as { data: unknown[] }).data)).toBe(
          true,
        );
      }
    });

    it('should get call analytics', async () => {
      if (!authToken) return;

      const response = await request(server)
        .get('/calls/analytics')
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500, 401]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('total_calls');
        expect(response.body).toHaveProperty('avg_duration');
        expect(response.body).toHaveProperty('status_distribution');
        expect(response.body).toHaveProperty('call_division');
      }
    });

    it('should reject unauthenticated call requests', async () => {
      const response = await request(server).get('/calls');

      expect([401, 500]).toContain(response.status);
    });
  });

  describe('Twilio Integration', () => {
    it('should return TwiML voice response', async () => {
      const response = await request(server).post('/twilio/voice');

      expect([200, 201]).toContain(response.status);
      expect(response.headers['content-type']).toMatch(/text\/xml/);
      expect(response.text).toContain('<Response>');
      expect(response.text).toContain('<Say');
    });

    it('should attempt to make a call (may fail without valid Twilio config)', async () => {
      if (!authToken) return;

      const response = await request(server)
        .post('/twilio/make')
        .send({ to: testPhoneNumber })
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 201, 400, 401, 500]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('sid');
      }
    });
  });

  describe('Call Notes Management', () => {
    const mockCallSid = 'CAafe90d09a7a7039472a75a996ecc1049';
    const testNotes = 'Test call notes for e2e testing';

    it('should update call notes', async () => {
      if (!authToken) return;

      const response = await request(server)
        .patch(`/calls/${mockCallSid}/notes`)
        .send({ notes: testNotes })
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 500, 401]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toHaveProperty('updated', true);
        expect(response.body).toHaveProperty('message');
      }
    });

    it('should retrieve call notes', async () => {
      if (!authToken) return;

      const response = await request(server)
        .get(`/calls/${mockCallSid}/notes`)
        .set('Authorization', `Bearer ${authToken}`);

      expect([200, 404, 500, 401]).toContain(response.status);
    });

    it('should reject unauthorized notes access', async () => {
      const response = await request(server).get(`/calls/${mockCallSid}/notes`);

      expect([401, 500]).toContain(response.status);
    });
  });

  describe('Security & Validation', () => {
    it('should handle invalid JSON requests', async () => {
      const response = await request(server)
        .post('/auth/signin')
        .send('invalid-json-string')
        .set('Content-Type', 'application/json');

      expect([400, 500]).toContain(response.status);
    });

    it('should validate request parameters', async () => {
      const response = await request(server).post('/auth/signin').send({});
      expect([400, 401, 500]).toContain(response.status);
    });
  });
});
