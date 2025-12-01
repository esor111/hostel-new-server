import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose']
  });

  // Simple and effective CORS configuration
  app.enableCors({
    origin: '*', // Allow all origins explicitly
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: '*', // Allow all headers
    exposedHeaders: ['Authorization'],
    maxAge: 3600,
  });

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));

  app.setGlobalPrefix("hostel/api");
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  const config = new DocumentBuilder()
    .setTitle("KAHA-HOSTEL")
    .setDescription("KAHA Hostel Management API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("hostel/api/v1/docs", app, document);

  const port = Number(process.env.PORT) || Number(process.env.APP_PORT) || 3001;

  await app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 Hostel Server running on: http://localhost:${port}`);
    console.log(`📚 API Docs available at: http://localhost:${port}/hostel/api/v1/docs`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔓 CORS: All origins allowed with credentials`);
  });
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});