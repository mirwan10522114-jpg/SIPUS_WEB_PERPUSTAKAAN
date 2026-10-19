import 'dotenv/config';

export const env = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || 'sipus-dev-access-secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'sipus-dev-refresh-secret',
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES || '2h',
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};
