import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

/**
 * Simplified E2E test for AppController
 * Tests the controller in isolation without full AppModule dependencies
 */
describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /', () => {
    it('should return Hello World', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('GET /data', () => {
    it('should return data structure', () => {
      return request(app.getHttpServer())
        .get('/data')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(res.body.data).toHaveProperty('id');
          expect(res.body.data).toHaveProperty('name');
          expect(res.body).toHaveProperty('metadata');
        });
    });
  });

  describe('GET /error', () => {
    it('should return 400 bad request', () => {
      return request(app.getHttpServer()).get('/error').expect(400);
    });
  });
});
