/**
 * Gemini API Integration (opt-in).
 *
 * If GEMINI_API_KEY is set in the environment, this module calls the
 * Gemini API for LLM-powered gift recommendations. Otherwise, the
 * system falls back to the rule-based engine automatically.
 *
 * This module is a scaffold ready for production use once a key is provided.
 */

/**
 * Check if the Gemini API is configured.
 */
function isGeminiAvailable() {
  return !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
}

/**
 * Generate recommendations via the Gemini API.
 *
 * @param {Object} input - { occasion, relation, age, budget, preferences }
 * @param {number} maxResults - Max number of recommendations.
 * @returns {Promise<Array<Object>>} Array of recommendation objects.
 */
async function generateWithGemini(input, maxResults = 4) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured.');
  }

  const prompt = buildPrompt(input, maxResults);

  const response = await fetch(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' }
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('Empty response from Gemini API.');
  }

  const parsed = JSON.parse(text);
  const recommendations = Array.isArray(parsed) ? parsed : parsed.recommendations || [];

  // Normalize to our expected schema
  return recommendations.slice(0, maxResults).map((rec, i) => ({
    gift_product_id: null,
    title: rec.title || 'AI Suggestion',
    description: rec.description || rec.reason || '',
    estimated_cost: rec.estimated_cost || rec.price || 0,
    emotional_fit: rec.emotional_fit || rec.emotionalFit || 'Thoughtfully chosen by AI to match the recipient.',
    next_steps: rec.next_steps || rec.nextSteps || 'Order online and add a personal note.',
    rank: i + 1,
    category: rec.category || 'AI Pick',
    image_emoji: rec.image_emoji || rec.emoji || '🤖',
    rating: rec.rating || 4.5,
    product_url: rec.product_url || rec.url || '',
    tags: rec.tags || ['AI Generated'],
  }));
}

/**
 * Build the prompt for the Gemini API.
 */
function buildPrompt(input, maxResults) {
  return `You are an expert gift recommendation assistant for a company called Paper Plane.

A customer is looking for a gift with these details:
- Occasion: ${input.occasion}
- Recipient relation: ${input.relation}
- Recipient age: ${input.age} years old
- Budget: ₹${input.minBudget} to ₹${input.maxBudget} INR
- Preferences/interests: ${input.preferences || 'None specified'}

Generate exactly ${maxResults} gift recommendations. For each gift, return a JSON array of objects with these fields:
- "title": Product name (string)
- "description": 2-3 sentence description explaining why this is a great match (string)
- "estimated_cost": Realistic price in INR (Rupees) within the budget (number)
- "emotional_fit": 1-2 sentences about why this gift resonates emotionally for this relationship (string)
- "next_steps": 1 sentence about what the customer should do next to order (string)
- "category": Gift category like Technology, Lifestyle, Food & Drink, Experience, etc. (string)
- "image_emoji": A single emoji representing the gift (string)
- "rating": Estimated product rating 1-5 (number)
- "tags": Array of 2-3 keyword tags (array of strings)

Return ONLY a valid JSON array, no other text.`;
}

module.exports = { isGeminiAvailable, generateWithGemini };
