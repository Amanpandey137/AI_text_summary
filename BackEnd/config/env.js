 
require("dotenv").config();

const PORT = process.env.PORT || 5001;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MONGODB_URI = process.env.MONGODB_URI;
const CACHE_MAX_ITEMS = process.env.CACHE_MAX_ITEMS || 100;
const CACHE_TTL_MINUTES = process.env.CACHE_TTL_MINUTES || 60;

if (!GEMINI_API_KEY) {
  console.error("FATAL ERROR: GEMINI_API_KEY is not defined in .env");
  process.exit(1);
}
if (!MONGODB_URI) {
  console.error("FATAL ERROR: MONGODB_URI is not defined in .env");
  process.exit(1);
}

module.exports = {
  PORT,
  GEMINI_API_KEY,
  MONGODB_URI,
  CACHE_MAX_ITEMS: parseInt(CACHE_MAX_ITEMS, 10),
  CACHE_TTL_MINUTES: parseInt(CACHE_TTL_MINUTES, 10),
};