import { env } from './config/env';
import { createApp } from './app';
import { startCronJobs } from './jobs/cron';

const app = createApp();

app.listen(env.port, () => {
  console.log(`✅ SIPUS API berjalan di http://localhost:${env.port}`);
  console.log(`📚 Swagger docs:  http://localhost:${env.port}/api/docs`);
});

startCronJobs();
