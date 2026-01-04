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
    it('should return "Hello World!"', () => {
      return request(app.getHttpServer())
        .get('/')
        .expect(200)
        .expect('Hello World!');
    });
  });

  describe('GET /data', () => {
    it('should return sample data with metadata', () => {
      return request(app.getHttpServer())
        .get('/data')
        .expect(200)
        .expect({
          data: {
            id: 1,
            name: 'hello',
          },
          metadata: {
            total: 1,
            next_page: 1,
            size: 10,
          },
        });
    });
  });
});
