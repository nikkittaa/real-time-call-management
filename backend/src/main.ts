import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.enableCors();
  const logger = app.get<Logger>(WINSTON_MODULE_PROVIDER);
  app.useLogger(logger);

  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unknown fields
      transform: true, // auto-transforms payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // auto-converts types (e.g., string → number)
      },
    }),
  );

  await app.listen(3002);
  logger.info('Application is running on port 3002');
}
bootstrap().catch((err) => {
  console.error(' Error during app startup:', err);
  process.exit(1);
});
