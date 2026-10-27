import { registerAs } from '@nestjs/config';

// Config for the internal AI data API. Registered via ConfigModule.forFeature()
// in AiDataModule so the shared config index stays untouched.

const parseBool = (value: string | undefined, fallback: boolean): boolean => {
  if (value === undefined || value.trim() === '') return fallback;
  return !['false', '0', 'no', 'off'].includes(value.trim().toLowerCase());
};

export default registerAs('aiData', () => ({
  serviceToken: process.env.AI_SERVICE_TOKEN || '',
  isDelayed: parseBool(process.env.MARKET_DATA_IS_DELAYED, true),
  moversUniverse: process.env.AI_MOVERS_UNIVERSE || '',
}));
