import { createApp } from './app.js';
import { config, isSupabaseConfigured, isGeminiConfigured } from './config/index.js';

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`
==================================================================
  DocuMind AI — Intelligent Document Processing Platform (API)
==================================================================
  Server Status:        ONLINE
  Port:                 ${config.PORT}
  Environment:          ${config.NODE_ENV}
  Supabase Status:      ${isSupabaseConfigured ? 'CONNECTED' : 'LOCAL REPOSITORY (Ready for Supabase credentials)'}
  Gemini AI Status:     ${isGeminiConfigured ? `ACTIVE (Model: ${config.GEMINI_MODEL})` : 'DETERMINISTIC FALLBACK ENGINE (Ready for GEMINI_API_KEY)'}
  API Base URL:         http://localhost:${config.PORT}/api
  Health Check:         http://localhost:${config.PORT}/api/health
==================================================================
  `);
});

const handleShutdown = (signal: string) => {
  console.log(`Received ${signal}. Gracefully terminating DocuMind API server...`);
  server.close(() => {
    console.log('HTTP server closed. Exiting process.');
    process.exit(0);
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
