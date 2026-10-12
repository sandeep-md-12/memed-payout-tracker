import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

const isProduction = process.env.NODE_ENV === 'production';

// Dev and test get safe defaults so `npm run dev` works out of the box;
// production refuses to start without real values.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: isProduction
    ? z.string().min(1)
    : z.string().min(1).default('mongodb://localhost:27017/memed?directConnection=true'),
  JWT_SECRET: isProduction
    ? z.string().min(32, 'JWT_SECRET must be at least 32 characters in production')
    : z.string().min(1).default('dev-only-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  // Comma-separated list of allowed frontend origins, or * for any.
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  // A Spike = at least SPIKE_MIN_GAIN new views, arriving faster than SPIKE_MAX_VIEWS_PER_HOUR.
  SPIKE_MIN_GAIN: z.coerce.number().int().positive().default(5_000),
  SPIKE_MAX_VIEWS_PER_HOUR: z.coerce.number().int().positive().default(50_000),
});

const env = envSchema.parse(process.env);

export const config = {
  ...env,
  corsOrigins: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  spikeRule: { minGain: env.SPIKE_MIN_GAIN, maxViewsPerHour: env.SPIKE_MAX_VIEWS_PER_HOUR },
} as const;
