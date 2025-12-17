import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for mobile access on same network
  app.enableCors({
    origin: true, // Allow all origins in development
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3001, '0.0.0.0'); // Listen on all network interfaces
}
bootstrap();
