import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose']
  });

  // Enhanced CORS configuration for all origins
  app.enableCors({  
    origin: true, // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',               
      'Origin',
      'X-Requested-With',
      'Access-Control-Request-Method',
      'Access-Control-R equest-Headers',
      'x-cache-warmup'
    ], 
    credentials: true,
    optionsSuccessStatus: 200, // For legacy browser support
    preflightContinue: false,
  });

  // Additional middleware to handle CORS manually (fallback)
  app.use((req: any, res: any, next: any) => {
    // Set CORS headers manually as a fallback
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-cache-warmup'
    );
    res.header(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD'
    );

    // Handle preflight requests with proper logging
    if (req.method === 'OPTIONS') {
      console.log(`✅ CORS Preflight handled for: ${req.url}`);
      return res.status(200).end();
    }

    next();
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
    console.log(`🔓 CORS: All origins allowed`);
  });
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});