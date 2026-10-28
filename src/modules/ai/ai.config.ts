import { registerAs } from '@nestjs/config';

export default registerAs('ai', () => ({
  url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
  token: process.env.AI_SERVICE_TOKEN || '',
  timeoutMs: Number(process.env.AI_SERVICE_TIMEOUT_MS) || 120000,
  testPlanSlug: process.env.AI_TEST_PLAN_SLUG || 'basic',
}));
