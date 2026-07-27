import crypto from 'crypto';
import logger from '../config/logger.js';

/**
 * Middleware to verify Shopify App Proxy requests.
 * Shopify sends a 'signature' in the query string. We must calculate the HMAC
 * of all other query parameters and compare it with the signature.
 */
export const verifyShopifyProxy = (req, res, next) => {
  const { signature, ...queryKeys } = req.query;

  // 1. Agar signature nahi hai, matlab request Shopify se nahi aayi hai
  if (!signature) {
    logger.warn('Shopify signature missing');
    return res.status(401).send('Unauthorized: Signature missing');
  }

  // 2. Query parameters ko alphabetical order me sort karna hai
  const sortedQueryString = Object.keys(queryKeys)
    .sort()
    .map((key) => {
      const value = queryKeys[key];
      return `${key}=${Array.isArray(value) ? value.join(',') : value}`;
    })
    .join('');

  // 3. Apna Shopify App Secret Key use karke HMAC calculate karein
  const SHOPIFY_APP_SECRET = process.env.SHOPIFY_APP_SECRET; 
  if (!SHOPIFY_APP_SECRET) {
    logger.error('SHOPIFY_APP_SECRET is not set in .env');
    return res.status(500).send('Server Error');
  }

  const calculatedSignature = crypto
    .createHmac('sha256', SHOPIFY_APP_SECRET)
    .update(sortedQueryString)
    .digest('hex');

  // 4. Calculate kiye gaye signature aur Shopify ke signature ko match karein
  if (calculatedSignature === signature) {
    // Verification Pass! 
    // Agar user logged in hai, toh Shopify 'logged_in_customer_id' bhejta hai
    const customerId = req.query.logged_in_customer_id;
    
    // Request me customer details attach kar do taaki aage ke routes use kar sakein
    req.shopifyCustomer = {
      isLoggedIn: !!customerId,
      customerId: customerId,
      shop: req.query.shop
    };
    
    next(); // Aage route handler (React serve karne ya API response) par bhejo
  } else {
    logger.warn('Shopify signature mismatch');
    res.status(401).send('Unauthorized: Invalid Signature');
  }
};
