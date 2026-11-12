import { Agent, setGlobalDispatcher } from 'undici';
import dotenv from 'dotenv';
import app from './app.js';
import logger from './config/logger.js';

// SSL bypass is for LOCAL development only (antivirus/firewall HTTPS intercepts).
// On the hosted server it must stay off: it is a security hole there, and replacing
// Node's built-in fetch dispatcher with the npm `undici` package's Agent breaks every
// Supabase request when the two undici versions don't match (e.g. on newer Node).
const isHosted = Boolean(process.env.RENDER) || process.env.NODE_ENV === 'production';
if (!isHosted) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  // NODE_TLS_REJECT_UNAUTHORIZED alone does not cover Node's native fetch (undici),
  // which Supabase's client uses, so give undici's global dispatcher the same bypass.
  setGlobalDispatcher(new Agent({ connect: { rejectUnauthorized: false } }));
}

// Load environment variables from .env
dotenv.config();

const PORT = process.env.PORT || 3000;

// Initialize and bind HTTP server listener
const server = app.listen(PORT, () => {
  logger.info(`Express application server successfully started on port ${PORT}`);
});

// Bind socket error listeners (e.g. PORT conflicts)
server.on('error', (error) => {
  logger.error('Http server encountered socket initialization error:', { error: error.message });
  if (error.code === 'EADDRINUSE') {
    logger.error(`Port ${PORT} is already bound by another process. Release the port or edit PORT in .env.`);
  }
});

// Graceful process shutdown handler (SIGINT)
process.on('SIGINT', () => {
  logger.info('SIGINT termination signal received. Initiating graceful server shutdown...');
  server.close(() => {
    logger.info('HTTP server listener closed. Clean exit complete.');
    process.exit(0);
  });
});
