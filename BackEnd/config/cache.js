 
const { LRUCache } = require("lru-cache");
const { CACHE_MAX_ITEMS, CACHE_TTL_MINUTES } = require("./env");

const cacheOptions = {
  max: CACHE_MAX_ITEMS,
  ttl: CACHE_TTL_MINUTES * 60 * 1000,
};

const summaryCache = new LRUCache(cacheOptions);
console.log(`LRU Cache initialized: Max Items=${cacheOptions.max}, TTL=${cacheOptions.ttl / 60000} minutes`);

module.exports = summaryCache;