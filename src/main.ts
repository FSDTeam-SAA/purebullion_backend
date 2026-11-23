import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AppLogger } from './common/logger/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true, // required for Stripe Webhook Signature verification
  });

  const configService = app.get(ConfigService);
  const logger = app.get(AppLogger);
  logger.setContext('Bootstrap');
  app.useLogger(logger);

  app.setGlobalPrefix('api/v1');

  // Normalise configured origins (trim + drop trailing slash) so
  // "http://localhost:3000/" in .env still matches the browser Origin header.
  const configured = [
    configService.get<string>('app.frontendUrl'),
    configService.get<string>('app.adminUrl'),
  ];
  // ADMIN_URL defaults to '*' (or can be set to '*' explicitly): allow any
  // origin. Set it to the real dashboard domain(s) to lock this down.
  const allowAll = configured.some((o) => o?.trim() === '*');
  const origins = [...configured, 'http://localhost:3000']
    .filter((o): o is string => !!o && o !== '*' && o !== '#')
    .flatMap((o) => o.split(','))
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: allowAll ? true : [...new Set(origins)],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new GlobalExceptionFilter(configService));
  app.useGlobalInterceptors(new ResponseInterceptor());

  const port = configService.get<number>('app.port', 5000);
  await app.listen(port);
  logger.log(`Server running → http://localhost:${port}/api/v1`);
}

bootstrap();