import 'dotenv/config';

function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: requireEnv('MONGO_URI', 'mongodb://127.0.0.1:27017/lifeline'),
  jwtSecret: requireEnv('JWT_SECRET', 'dev-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '30d',
  medicaApiKey: requireEnv('MEDICA_API_KEY'),
};
