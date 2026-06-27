/**
 * AI Engine Orchestrator.
 *
 * Decides which engine to use based on configuration:
 *   - If GEMINI_API_KEY is set → uses the Gemini LLM API.
 *   - Otherwise → uses the local rule-based scoring engine.
 *
 * Both engines return the same normalised output format.
 */

const { isGeminiAvailable, generateWithGemini } = require('./geminiEngine');
const { generateRecommendations: ruleBasedGenerate } = require('./ruleEngine');

/**
 * Generate gift recommendations using the best available engine.
 *
 * @param {Object} input - { occasion, relation, age, budget, preferences }
 * @param {number} [maxResults=4] - Maximum number of recommendations.
 * @returns {Promise<{ engine: string, recommendations: Array<Object> }>}
 */
async function recommend(input, maxResults = 4) {
  // Try Gemini first if configured
  if (isGeminiAvailable()) {
    try {
      console.log('  🤖 Using Gemini API engine...');
      const recommendations = await generateWithGemini(input, maxResults);
      return { engine: 'gemini', recommendations };
    } catch (err) {
      console.warn('  ⚠️  Gemini API failed, falling back to rule engine:', err.message);
      // Fall through to rule-based engine
    }
  }

  // Default: rule-based engine (always available)
  console.log('  🧠 Using rule-based scoring engine...');
  const recommendations = ruleBasedGenerate(input, maxResults);
  return { engine: 'rule-based', recommendations };
}

module.exports = { recommend };
