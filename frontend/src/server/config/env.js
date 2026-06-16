// Next.js loads .env / .env.local automatically for server-side code, so we read
// straight from process.env (no dotenv needed at runtime).

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  mongoUri: process.env.MONGODB_URI || process.env.ATLAS_URI,
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  meta: {
    verifyToken: process.env.META_VERIFY_TOKEN || "",
    appSecret: process.env.META_APP_SECRET || "",
    apiVersion: process.env.META_API_VERSION || "v20.0",
  },
  whatsapp: {
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || "",
  },
  instagram: {
    pageId: process.env.INSTAGRAM_PAGE_ID || "",
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || "",
  },
  facebook: {
    pageId: process.env.FACEBOOK_PAGE_ID || "",
    pageAccessToken: process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "",
  },
  ai: {
    provider: process.env.AI_PROVIDER || "mock",
    openaiApiKey: process.env.OPENAI_API_KEY || "",
    openaiModel: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    claudeApiKey: process.env.CLAUDE_API_KEY || "",
    claudeModel: process.env.CLAUDE_MODEL || "claude-3-5-sonnet-latest",
    geminiApiKey: process.env.GEMINI_API_KEY || "",
    geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash",
  },
};

export default env;
