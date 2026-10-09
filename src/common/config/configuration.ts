import { Subscription } from '../../user/user.schema';

interface AppConfig {
  nodeEnv: 'development' | 'production' | 'test';
  host: string;
  port: number;
  secretKey: string;
  encryptionKey: string;
  mongoUri: string;
  mongoDbName: string;
  redisHost?: string;
  redisPort?: number;
  redisUrl?: string;
  openaiKey: string;
  openaiKey2: string;
  geminiKey: string;
  googleClientId: string;
  lemonSqueezyApiKey: string;
  lemonSqueezySignSecret: string;
  lemonSqueezyVariantIds: any;
  sendGridApiKey: string;
  docStorageLocation: string;
  textractServiceUrl: string;
  visitorMaxPages: number;
  maxTokenLimit: number;
  postmarkApiKey: string;
  outscraperKey: string;
  chatbotUrl: string;
  senderEmailId: string;
  clientUrl: string;
  model: string;
  tokenExpiry: string;
  vakmangidsAdminEmail: string;
  vakmangidsLeadsUrl: string;
  vakmangidsLeadsKey: string;
  senderName: string;
  mailiveryApiKey: string;
  mailiveryApiUrl: string;
  apifyToken: string;
  googleClientSecret: string;
  googleRedirectUrl: string;
  googleCalenderRedirectUrl: string;
  lemonSqueezyStoreId: string;
  lemonSqueezyTopupVariantId: string;
}

const config = (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV as any) || 'development',
  host: process.env.HOST || '127.0.0.1',
  port: parseInt(process.env.PORT as string, 10) || 8000,
  secretKey: process.env.SECRET_KEY || 'secret',
  encryptionKey:
    process.env.ENC_KEY ||
    '4b23f673b133b01777259525a4a1c2097fe309048db6593462312d5c35679ced',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017',
  mongoDbName: process.env.MONGO_DBNAME || 'sitemine',
  redisHost: process.env.REDIS_HOST || 'localhost',
  redisPort: parseInt(process.env.REDIS_PORT as string, 10) || 6379,
  redisUrl: process.env.REDIS_URL,
  openaiKey: process.env.OPENAI_KEY || '',
  openaiKey2: process.env.OPENAI_KEY_2 || '',
  geminiKey: process.env.GEMINI_API_KEY || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUrl: process.env.GOOGLE_REDIRECT_URL || '',
  googleCalenderRedirectUrl: process.env.GOOGLECALENDER_REDIRECT_URL || '',
  lemonSqueezyApiKey: process.env.LEMON_SQUEEZY_API_KEY || '',
  lemonSqueezySignSecret: process.env.LEMON_SQUEEZY_SIGN_SECRET || '',
  lemonSqueezyVariantIds: process.env.LEMON_SQUEEZY_VARIANT_IDS || {},
  lemonSqueezyStoreId: process.env.LEMON_SQUEEZY_STORE_ID || '',
  lemonSqueezyTopupVariantId: process.env.LEMON_SQUEEZY_TOPUP_VARIANT_ID || '',
  sendGridApiKey: process.env.SENDGRID_API_KEY || '',
  postmarkApiKey: process.env.POSTMARK_API_KEY || '',
  docStorageLocation: process.env.DOC_STORAGE_LOCATION || '../storage',
  textractServiceUrl: process.env.TEXTRACT_URL || '',
  visitorMaxPages: parseInt(process.env.VISITOR_MAXPAGES) || 100,
  maxTokenLimit: parseInt(process.env.MAX_TOKEN_COUNT) || 32000,
  outscraperKey: process.env.OUTSCRAPPER_AUTH_KEY || '',
  chatbotUrl: process.env.CHATBOT_URL || '',
  senderEmailId: process.env.POSTMARK_EMAIL_ID || '',
  clientUrl: process.env.CLIENT_URL || '',
  model: process.env.CHATBOT_MODEL || '',
  tokenExpiry: process.env.TOKEN_EXPIRY_TIME || '',
  vakmangidsAdminEmail: process.env.VAKMANGIDS_ADMIN_EMAIL || '',
  vakmangidsLeadsUrl: process.env.VAKMANGIDS_LEAD_URL || '',
  vakmangidsLeadsKey:
    process.env.VAKMANGIDS_LEAD_KEY || process.env.VAKMANGIDS_CRM_TOKEN || '',
  senderName: process.env.SENDER_NAME || '',
  mailiveryApiKey: process.env.MAILIVERY_API_KEY || '',
  mailiveryApiUrl:
    process.env.MAILIVERY_API_URL || 'https://app.mailivery.io/api/v1',
  apifyToken: process.env.APIFY_API_TOKEN || '',
});

export { AppConfig };
export default config;
