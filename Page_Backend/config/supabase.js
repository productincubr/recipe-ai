import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
// Use the secret key (service_role) to bypass RLS in the backend environment
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  logger.error('Missing critical environment variables: VITE_SUPABASE_URL or SUPABASE_SECRET_KEY.');
  process.exit(1);
}

/**
 * Supabase Client Instance.
 * Shares stateless query bindings across backend services.
 */
export const supabase = createClient(supabaseUrl, supabaseKey);

logger.info('Supabase client initialized successfully.');
