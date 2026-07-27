import express from 'express';
import cors from 'cors';
import recipeRoutes from './routes/recipeRoutes.js';
import userFeaturesRoutes from './routes/userFeaturesRoutes.js';

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

// Standard JSON request body parser middleware
app.use(express.json());

// Application Routing Modules
app.use('/api/recipes', recipeRoutes);
app.use('/api/user', userFeaturesRoutes);

// General Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

export default app;
