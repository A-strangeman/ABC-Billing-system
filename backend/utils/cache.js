// ============================================
// CACHE MANAGER - Ultra-Fast Caching
// backend/utils/cache.js
// ============================================

const NodeCache = require('node-cache');

// In-memory cache (super fast!)
const memoryCache = new NodeCache({
  stdTTL: 600, // 10 minutes default
  checkperiod: 120, // Check for expired keys every 2 minutes
  useClones: false // Performance boost - don't clone objects
});

class CacheManager {
  constructor() {
    this.cache = memoryCache;
    console.log('✅ Memory cache initialized');
  }

  // Get from cache
  async get(key) {
    try {
      const value = this.cache.get(key);
      if (value !== undefined) {
        console.log(`📦 Cache HIT: ${key}`);
        return value;
      }
      console.log(`📭 Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set in cache
  async set(key, value, ttl = 600) {
    try {
      this.cache.set(key, value, ttl);
      console.log(`💾 Cache SET: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete from cache
  async del(key) {
    try {
      this.cache.del(key);
      console.log(`🗑️ Cache DELETE: ${key}`);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Delete multiple keys by pattern
  async delPattern(pattern) {
    try {
      const keys = this.cache.keys();
      const matchingKeys = keys.filter(key => key.includes(pattern));
      this.cache.del(matchingKeys);
      console.log(`🗑️ Cache DELETE pattern: ${pattern} (${matchingKeys.length} keys)`);
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  }

  // Clear all cache
  async flush() {
    try {
      this.cache.flushAll();
      console.log('🗑️ Cache FLUSHED');
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  // Get cache stats
  getStats() {
    return this.cache.getStats();
  }
}

module.exports = new CacheManager();