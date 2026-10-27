import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import aiDataConfig from './ai-data.config';
import { AiDataController } from './ai-data.controller';
import { AiDataService } from './ai-data.service';
import { AiDataException } from './ai-data.exception';
import { ServiceTokenGuard } from './guards/service-token.guard';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { ResponseInterceptor } from '../../common/interceptors/response.interceptor';

// HTTP-level test mirroring main.ts (prefix, ValidationPipe, global filter + interceptor,
// global ThrottlerGuard) to check auth, envelope, error codes and throttle bypass.

const TOKEN = 'test-service-token-0123456789';

describe('AiDataController (HTTP)', () => {
  let app: INestApplication;
  const service = {
    getQuote: jest.fn(),
    getQuotes: jest.fn(),
    getSignal: jest.fn(),
    getMovers: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 2 }])],
      controllers: [AiDataController],
      providers: [
        { provide: AiDataService, useValue: service },
        { provide: aiDataConfig.KEY, useValue: { serviceToken: TOKEN, isDelayed: true, moversUniverse: '' } },
        ServiceTokenGuard,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, transformOptions: { enableImplicitConversion: true } }));
    app.useGlobalFilters(new GlobalExceptionFilter({ get: () => 'test' } as unknown as ConfigService));
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(() => app.close());
  beforeEach(() => jest.resetAllMocks());

  const get = (path: string, token: string | null = TOKEN) => {
    const req = request(app.getHttpServer()).get(`/api/v1/internal/ai${path}`);
    return token === null ? req : req.set('Authorization', `Bearer ${token}`);
  };

  it('401 without token, with wrong token, and with a non-Bearer scheme', async () => {
    for (const res of [
      await get('/quote/AAPL', null),
      await get('/quote/AAPL', 'wrong'),
      await request(app.getHttpServer()).get('/api/v1/internal/ai/quote/AAPL').set('Authorization', `Basic ${TOKEN}`),
    ]) {
      expect(res.status).toBe(401);
      expect(res.body).toMatchObject({ statusCode: 401, success: false, code: 'UNAUTHORIZED' });
    }
    expect(service.getQuote).not.toHaveBeenCalled();
  });

  it('wraps success in the global envelope', async () => {
    service.getQuote.mockResolvedValue({ symbol: 'AAPL', price: 1 });
    const res = await get('/quote/aapl');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ statusCode: 200, success: true, data: { symbol: 'AAPL', price: 1 } });
    expect(service.getQuote).toHaveBeenCalledWith('AAPL');
  });

  it('400 INVALID_SYMBOL for a bad ticker and never defaults to another symbol', async () => {
    const res = await get('/quote/12$X');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ success: false, code: 'INVALID_SYMBOL' });
    expect(service.getQuote).not.toHaveBeenCalled();
  });

  it('503 DATA_UNAVAILABLE and 404 SYMBOL_NOT_FOUND carry their codes', async () => {
    service.getQuote.mockRejectedValueOnce(AiDataException.dataUnavailable());
    const unavailable = await get('/quote/AAPL');
    expect(unavailable.status).toBe(503);
    expect(unavailable.body).toMatchObject({ statusCode: 503, success: false, code: 'DATA_UNAVAILABLE' });
    expect(unavailable.body.stack).toBeUndefined();

    service.getQuote.mockRejectedValueOnce(AiDataException.symbolNotFound('ZZZZ'));
    const notFound = await get('/quote/ZZZZ');
    expect(notFound.status).toBe(404);
    expect(notFound.body.code).toBe('SYMBOL_NOT_FOUND');
  });

  it('400 VALIDATION_ERROR for bad query params', async () => {
    const res = await get('/movers?direction=sideways');
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ code: 'VALIDATION_ERROR', message: 'Validation failed' });
  });

  it('is not blocked by the global throttler', async () => {
    service.getSignal.mockResolvedValue({ signalId: 'PB-2481' });
    for (let i = 0; i < 5; i++) {
      expect((await get('/signals/PB-2481')).status).toBe(200);
    }
  });

  it('exposes no write routes', async () => {
    for (const method of ['post', 'put', 'patch', 'delete'] as const) {
      const res = await request(app.getHttpServer())[method]('/api/v1/internal/ai/signals/PB-2481').set('Authorization', `Bearer ${TOKEN}`);
      expect(res.status).toBe(404);
    }
  });
});

describe('ServiceTokenGuard', () => {
  const ctx = (authorization?: string) =>
    ({ switchToHttp: () => ({ getRequest: () => ({ headers: { authorization } }) }) }) as any;

  it('fails closed when AI_SERVICE_TOKEN is not configured', () => {
    const guard = new ServiceTokenGuard({ serviceToken: '', isDelayed: true, moversUniverse: '' });
    expect(() => guard.canActivate(ctx('Bearer '))).toThrow();
    expect(() => guard.canActivate(ctx('Bearer anything'))).toThrow();
  });

  it('accepts only the exact token', () => {
    const guard = new ServiceTokenGuard({ serviceToken: TOKEN, isDelayed: true, moversUniverse: '' });
    expect(guard.canActivate(ctx(`Bearer ${TOKEN}`))).toBe(true);
    expect(() => guard.canActivate(ctx(`Bearer ${TOKEN}x`))).toThrow();
    expect(() => guard.canActivate(ctx(`Bearer ${TOKEN.slice(0, -1)}`))).toThrow();
  });
});
