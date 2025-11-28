import { ConfigService } from '@nestjs/config';

// ============================================
// 🔧 ENVIRONMENT CONFIGURATION
// ============================================
// This file centralizes all external API URLs
// Change CURRENT_ENVIRONMENT to switch between:
// - 'development' → dev.kaha.com.np
// - 'production'  → api.kaha.com.np
// ============================================

export type Environment = 'development' | 'production';

// ============================================
// 🎯 SET YOUR ENVIRONMENT HERE
// ============================================
export const CURRENT_ENVIRONMENT: Environment = 'development';

// ============================================
// URL Configuration by Environment
// ============================================
const ENV_URLS: Record<Environment, {
  kahaMainApi: string;
  kahaNotificationApi: string;
  expressNotificationUrl: string;
}> = {
  development: {
    kahaMainApi: 'https://dev.kaha.com.np/main/api/v3',
    kahaNotificationApi: 'https://dev.kaha.com.np/notifications/api/v3',
    expressNotificationUrl: 'https://dev.kaha.com.np',
  },
  production: {
    kahaMainApi: 'https://api.kaha.com.np/main/api/v3',
    kahaNotificationApi: 'https://api.kaha.com.np/notifications/api/v3',
    expressNotificationUrl: 'https://api.kaha.com.np',
  },
};

// ============================================
// External API Configuration Interface
// ============================================
export interface ExternalApiConfig {
  kahaMainApiUrl: string;
  kahaNotificationUrl: string;
  expressNotificationUrl: string;
  environment: Environment;
}

// ============================================
// Get External API Configuration
// ============================================
// Priority: .env file > CURRENT_ENVIRONMENT setting
// ============================================
export const getExternalApiConfig = (configService?: ConfigService): ExternalApiConfig => {
  const urls = ENV_URLS[CURRENT_ENVIRONMENT];
  
  // If ConfigService provided, allow .env to override
  if (configService) {
    return {
      kahaMainApiUrl: configService.get<string>('KAHA_MAIN_API_URL') || urls.kahaMainApi,
      kahaNotificationUrl: configService.get<string>('KAHA_NOTIFICATION_URL') || urls.kahaNotificationApi,
      expressNotificationUrl: configService.get<string>('EXPRESS_NOTIFICATION_URL') || urls.expressNotificationUrl,
      environment: CURRENT_ENVIRONMENT,
    };
  }
  
  // Fallback to environment-based URLs
  return {
    kahaMainApiUrl: urls.kahaMainApi,
    kahaNotificationUrl: urls.kahaNotificationApi,
    expressNotificationUrl: urls.expressNotificationUrl,
    environment: CURRENT_ENVIRONMENT,
  };
};

// ============================================
// Logging Helper
// ============================================
export const logApiConfig = (serviceName: string, config: ExternalApiConfig): void => {
  console.log(`🔧 [${serviceName}] Environment: ${config.environment}`);
  console.log(`   Kaha Main API: ${config.kahaMainApiUrl}`);
  console.log(`   Kaha Notification API: ${config.kahaNotificationUrl}`);
  console.log(`   Express Notification: ${config.expressNotificationUrl}`);
};
