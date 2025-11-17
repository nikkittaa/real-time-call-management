import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  app.enableCors({
    origin: true, // Allow all origins for iframe embedding
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-Iframe-Token',
    ],
  });

  const logger = app.get<Logger>(WINSTON_MODULE_PROVIDER);
  app.useLogger(logger);

  const config = new DocumentBuilder()
    .setTitle('Real-time Call Management API')
    .setDescription('API documentation for Real-time Call Management System')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unknown fields
      transform: true, // auto-transforms payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
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
