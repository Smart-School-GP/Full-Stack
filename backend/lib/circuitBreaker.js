/**
 * Circuit Breaker Pattern for External Services
 * 
 * Provides resilience for external API calls (AI service, push notifications, etc.)
 * to prevent cascading failures when services are down.
 * 
 * Usage:
 *   const { circuitBreaker } = require('./lib/circuitBreaker');
 *   
 *   // Wrap an async function
 *   const safeCall = circuitBreaker(aiServiceCall, {
 *     failureThreshold: 5,
 *     resetTimeoutMs: 30000,  // 30 seconds
 *     name: 'ai-service'
 *   });
 */

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000;
    this.name = options.name || 'circuit-breaker';
    
    this.failures = 0;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.lastFailureTime = null;
    this.nextAttempt = null;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute(fn, fallback = null) {
    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttempt) {
        this.state = 'HALF_OPEN';
        console.log(`[CircuitBreaker:${this.name}] State: HALF_OPEN - Testing connection`);
      } else {
        // Return fallback value or throw
        if (fallback) return fallback;
        throw new Error(`Circuit breaker OPEN for ${this.name}. Try again later.`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      // Return fallback if available
      if (fallback) {
        console.warn(`[CircuitBreaker:${this.name}] Using fallback due to:`, error.message);
        return fallback;
      }
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.log(`[CircuitBreaker:${this.name}] State: CLOSED - Recovered`);
    }
  }

  onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeoutMs;
      console.warn(`[CircuitBreaker:${this.name}] State: OPEN - Too many failures`);
    }
  }

  /**
   * Get current circuit state
   */
  getState() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      nextAttempt: this.nextAttempt,
    };
  }

  /**
   * Reset circuit breaker manually
   */
  reset() {
    this.failures = 0;
    this.state = 'CLOSED';
    this.nextAttempt = null;
    console.log(`[CircuitBreaker:${this.name}] Circuit reset manually`);
  }
}

/**
 * Create circuit breaker instance for AI service
 */
const aiCircuitBreaker = new CircuitBreaker({
  name: 'ai-service',
  failureThreshold: parseInt(process.env.AI_CIRCUIT_BREAKER_THRESHOLD) || 5,
  resetTimeoutMs: parseInt(process.env.AI_CIRCUIT_BREAKER_RESET_MS) || 30000,
});

/**
 * Execute function with circuit breaker
 * @param {Function} fn - Async function to execute
 * @param {any} fallback - Value to return on circuit open
 * @param {string} fallbackType - Type of fallback for logging ('rule-based', null, etc.)
 */
async function withCircuitBreaker(fn, fallback = null, fallbackType = 'fallback') {
  return aiCircuitBreaker.execute(fn, fallback);
}

module.exports = {
  CircuitBreaker,
  aiCircuitBreaker,
  withCircuitBreaker,
};