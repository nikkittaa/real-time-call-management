import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,             // strips unknown fields
      transform: true,             // auto-transforms payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true, // auto-converts types (e.g., string → number)
      },
    }),
  );
  
  await app.listen(3002);
}
bootstrap();
