import { registerAs } from '@nestjs/config';

export default registerAs('twelvedata', () => ({
  apiKey: process.env.TWELVE_DATA_API_KEY || '',
  baseUrl: 'https://api.twelvedata.com',
}));

