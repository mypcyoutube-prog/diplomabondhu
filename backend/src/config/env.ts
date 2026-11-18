import { z } from 'zod';
import dotenv from 'dotenv';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),
  CORS_ORIGINS: z.string().default(''),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  RESULT_SERVICE_URL: z.string().default(''),
  RESULT_SERVICE_TOKEN: z.string().default(''),
  RESULTS_DB: z.string().default('results_db')
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  // Local/dev convenience: read backend/.env if present. Real environment
  // variables (Render, CI, shell exports) always win - dotenv never overrides.
  dotenv.config({ path: `${process.cwd()}/.env` });
  const merged = source === process.env ? process.env : { ...process.env, ...source };
  const parsed = envSchema.safeParse(merged);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid environment configuration -> ${issues}`);
  }
  return parsed.data;
}
