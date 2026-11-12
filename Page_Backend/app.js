import express from 'express';
import cors from 'cors';
import recipeRoutes from './routes/recipeRoutes.js';
import userFeaturesRoutes from './routes/userFeaturesRoutes.js';
import { supabase } from './config/supabase.js';

const app = express();

// Enable Cross-Origin Resource Sharing (CORS) with explicit options for React frontend
const allowedOrigins = [
  'http://localhost:5173',
  'https://rec-ai-frontend.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(o => origin.endsWith('.vercel.app'))) {
      callback(null, true);
    } else {
      callback(null, true); // Allow for API testing/flexibility
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Standard JSON request body parser middleware (raised limit to allow base64-encoded meal photos)
app.use(express.json({ limit: '12mb' }));

// Application Routing Modules
app.use('/api/recipes', recipeRoutes);
app.use('/api/user', userFeaturesRoutes);

// General Health Check Endpoint
// Reports which build is live and whether the database is reachable, so a broken
// deploy can be diagnosed without access to the hosting dashboard's logs.
// Error text can echo request headers (e.g. a malformed API key), so strip anything
// key-like before it reaches this public endpoint.
const redact = (text) =>
  String(text)
    .replace(/sb_(secret|publishable)_[^\s"'|]*(\s+[^\s"'|]+)?/gi, 'sb_$1_[redacted]')
    .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[redacted-jwt]');

app.get('/health', async (req, res) => {
  let database = 'ok';
  try {
    const { error } = await supabase.from('recipes').select('id').limit(1);
    if (error) database = `error: ${error.message}${error.details ? ` | ${String(error.details).slice(0, 300)}` : ''}`;
  } catch (err) {
    database = `error: ${err.message}${err.cause ? ` (${err.cause.message || err.cause.code})` : ''}`;
  }
  database = redact(database);
  res.status(database === 'ok' ? 200 : 503).json({
    status: database === 'ok' ? 'healthy' : 'degraded',
    database,
    node: process.version,
    // Masked project host, enough to spot a wrong/old VITE_SUPABASE_URL on the server.
    databaseHost: (process.env.VITE_SUPABASE_URL || 'missing').replace(/^https?:\/\/([a-z0-9]{4})[a-z0-9]*/i, '$1***'),
    commit: (process.env.RENDER_GIT_COMMIT || 'local').slice(0, 7),
    timestamp: new Date(),
  });
});

export default app;
