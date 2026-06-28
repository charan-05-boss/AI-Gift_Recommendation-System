/**
 * Rule-Based AI Gift Recommendation Engine.
 *
 * Uses a multi-factor weighted scoring algorithm to match
 * user inputs to suitable gift products from the catalogue.
 *
 * Scoring Factors:
 *   1. Budget fit        (25%) – price within budget
 *   2. Age suitability   (20%) – product age range match
 *   3. Occasion match    (20%) – occasion → category mapping
 *   4. Relation weight   (15%) – relation → category affinity
 *   5. Keyword match     (20%) – preferences vs product tags
 */

const { getDb } = require('../config/database');

/* ── Occasion → Category Affinity Map ── */
const OCCASION_CATEGORIES = {
  'Birthday':       { 'Technology': 1.2, 'Lifestyle': 1.1, 'Food & Drink': 1.0, 'Experience': 1.2, 'Kids & Teens': 1.3, 'Sports & Outdoors': 1.1, 'Jewellery': 1.0, 'Books & Stationery': 1.0, 'Accessories': 1.0, 'Home & Garden': 0.8 },
  'Anniversary':    { 'Jewellery': 1.5, 'Experience': 1.4, 'Lifestyle': 1.2, 'Food & Drink': 1.1, 'Home & Garden': 1.0, 'Technology': 0.7, 'Kids & Teens': 0.2, 'Accessories': 1.2 },
  'Wedding':        { 'Home & Garden': 1.5, 'Experience': 1.3, 'Lifestyle': 1.3, 'Jewellery': 1.2, 'Food & Drink': 1.0, 'Technology': 0.6, 'Kids & Teens': 0.1 },
  'Graduation':     { 'Technology': 1.4, 'Experience': 1.3, 'Books & Stationery': 1.3, 'Accessories': 1.2, 'Lifestyle': 1.0, 'Food & Drink': 0.8 },
  'Baby Shower':    { 'Kids & Teens': 1.5, 'Lifestyle': 1.1, 'Home & Garden': 1.0, 'Books & Stationery': 0.9, 'Food & Drink': 0.6, 'Technology': 0.3 },
  'Christmas':      { 'Technology': 1.2, 'Lifestyle': 1.2, 'Food & Drink': 1.3, 'Home & Garden': 1.2, 'Kids & Teens': 1.3, 'Jewellery': 1.1, 'Experience': 1.0, 'Accessories': 1.1, 'Sports & Outdoors': 1.0 },
  "Valentine's Day":{ 'Jewellery': 1.6, 'Experience': 1.5, 'Food & Drink': 1.3, 'Lifestyle': 1.2, 'Accessories': 1.1, 'Technology': 0.6, 'Kids & Teens': 0.1 },
  "Mother's Day":   { 'Experience': 1.5, 'Lifestyle': 1.4, 'Jewellery': 1.3, 'Food & Drink': 1.2, 'Home & Garden': 1.3, 'Accessories': 1.1, 'Books & Stationery': 1.0 },
  "Father's Day":   { 'Technology': 1.3, 'Sports & Outdoors': 1.4, 'Food & Drink': 1.3, 'Accessories': 1.2, 'Experience': 1.1, 'Lifestyle': 1.0, 'Books & Stationery': 0.9 },
  "New Year's":     { 'Experience': 1.3, 'Food & Drink': 1.2, 'Lifestyle': 1.1, 'Technology': 1.0, 'Home & Garden': 0.9 },
  'Retirement':     { 'Experience': 1.5, 'Lifestyle': 1.4, 'Food & Drink': 1.2, 'Home & Garden': 1.3, 'Books & Stationery': 1.2, 'Jewellery': 1.0 },
  'Housewarming':   { 'Home & Garden': 1.6, 'Lifestyle': 1.3, 'Food & Drink': 1.2, 'Technology': 0.9 },
  'Get Well Soon':  { 'Lifestyle': 1.4, 'Food & Drink': 1.3, 'Books & Stationery': 1.2, 'Home & Garden': 1.0, 'Technology': 0.5, 'Experience': 0.7 },
  'Thank You':      { 'Food & Drink': 1.4, 'Lifestyle': 1.2, 'Home & Garden': 1.1, 'Books & Stationery': 1.1, 'Experience': 1.0, 'Accessories': 1.0 },
  'Other':          { }, // neutral
};

/* ── Relation → Category Affinity Map ── */
const RELATION_CATEGORIES = {
  'Partner/Spouse':  { 'Jewellery': 1.5, 'Experience': 1.4, 'Lifestyle': 1.2, 'Accessories': 1.1, 'Food & Drink': 1.0 },
  'Parent':          { 'Experience': 1.3, 'Lifestyle': 1.3, 'Home & Garden': 1.3, 'Food & Drink': 1.2 },
  'Sibling':         { 'Technology': 1.3, 'Experience': 1.1, 'Sports & Outdoors': 1.2, 'Food & Drink': 1.0, 'Kids & Teens': 1.0 },
  'Child':           { 'Kids & Teens': 1.5, 'Technology': 1.3, 'Books & Stationery': 1.2, 'Experience': 1.1, 'Sports & Outdoors': 1.1 },
  'Friend':          { 'Experience': 1.2, 'Food & Drink': 1.2, 'Lifestyle': 1.1, 'Technology': 1.0, 'Books & Stationery': 1.0 },
  'Colleague':       { 'Food & Drink': 1.3, 'Lifestyle': 1.2, 'Books & Stationery': 1.1, 'Home & Garden': 1.0, 'Accessories': 1.0 },
  'Boss':            { 'Food & Drink': 1.4, 'Lifestyle': 1.2, 'Accessories': 1.1, 'Books & Stationery': 1.0 },
  'Teacher/Mentor':  { 'Books & Stationery': 1.4, 'Food & Drink': 1.2, 'Lifestyle': 1.1, 'Experience': 1.0 },
  'Grandparent':     { 'Lifestyle': 1.4, 'Food & Drink': 1.3, 'Home & Garden': 1.2, 'Books & Stationery': 1.1, 'Experience': 1.0 },
  'Cousin':          { 'Food & Drink': 1.1, 'Lifestyle': 1.0, 'Technology': 1.0, 'Experience': 1.0 },
  'Neighbour':       { 'Food & Drink': 1.3, 'Home & Garden': 1.2, 'Lifestyle': 1.0 },
  'Other':           { },
};

/* ── Emotional Fit Templates ── */
const EMOTIONAL_TEMPLATES = {
  'Partner/Spouse': [
    'This gift communicates deep thoughtfulness and intimate understanding of what they love.',
    'It shows you pay attention to the details that matter to them, strengthening your bond.',
    'A meaningful gesture that says "I truly know you" in the most personal way.',
  ],
  'Parent': [
    'A heartfelt way to show gratitude for everything they have done. It says "I appreciate you."',
    'This gift offers them the comfort or experience they rarely indulge in for themselves.',
    'A loving tribute to someone who has given so much — this is their turn to be spoiled.',
  ],
  'Friend': [
    'This gift celebrates your unique connection and shared memories together.',
    'It shows you genuinely listen and care about what makes them happy.',
    'A thoughtful surprise that deepens your friendship and creates new memories.',
  ],
  'Colleague': [
    'A professional yet personal gift that shows genuine appreciation without overstepping.',
    'It strikes the right balance between thoughtful and appropriate for the workplace.',
    'A tasteful gesture that strengthens your working relationship.',
  ],
  'Child': [
    'A gift that sparks joy and fuels their imagination, curiosity, and growth.',
    'It shows you support their passions and celebrate who they are becoming.',
    'An exciting gift that they will remember and associate with your encouragement.',
  ],
  'default': [
    'A carefully chosen gift that reflects genuine thought about their personality and interests.',
    'This recommendation balances personal taste with practical appeal for maximum delight.',
    'A meaningful gesture that shows you put real consideration into what would make them smile.',
  ],
};

/* ── Next-Step Suggestion Templates ── */
const NEXT_STEPS_TEMPLATES = [
  'Add a handwritten note for a personal touch. Order soon to ensure timely delivery.',
  'Consider gift-wrapping for a premium unboxing experience. Check availability for your delivery date.',
  'Pair this with a greeting card. If ordering online, allow 3-5 business days for shipping.',
  'You could complement this with a small secondary gift to create a curated gift set.',
];

/**
 * Generate gift recommendations using the rule-based scoring engine.
 *
 * @param {Object} input
 * @param {string} input.occasion
 * @param {string} input.relation
 * @param {number} input.age
 * @param {number} input.minBudget
 * @param {number} input.maxBudget
 * @param {string} [input.preferences]
 * @param {number} [maxResults=4]
 * @returns {Array<Object>} Ranked recommendations with descriptions and emotional fit.
 */
async function generateRecommendations(input, maxResults = 4) {
  const { occasion, relation, age, minBudget, maxBudget, preferences } = input;
  const db = getDb();

  // 1. Fetch all active products within budget
  const productsRes = await db.query(`
    SELECT * FROM gift_products
    WHERE is_active = true
      AND price <= $1
    ORDER BY rating DESC
  `, [maxBudget * 1.1]); // Allow 10% over-budget for flexibility
  const products = productsRes.rows;

  if (products.length === 0) {
    return [{
      title: 'Custom Gift Card',
      description: `We could not find catalogue items within your ₹${minBudget} - ₹${maxBudget} budget range. A personalised gift card lets them choose exactly what they want.`,
      estimated_cost: budget,
      emotional_fit: 'A gift card shows respect for their personal preferences and ensures they get exactly what they want.',
      next_steps: 'Purchase a gift card from their favourite store and include a heartfelt handwritten note.',
      rank: 1,
      gift_product_id: null,
    }];
  }

  // 2. Score each product
  const scored = products.map(product => {
    let score = 0;

    // Factor 1: Budget fit (25%) — closer to range = better value perception
    if (product.price >= minBudget && product.price <= maxBudget) {
      score += 25; // Perfect fit inside range
    } else if (product.price < minBudget) {
      // Below min budget
      const ratio = product.price / minBudget;
      if (ratio >= 0.8) score += 20;
      else if (ratio >= 0.5) score += 12;
      else score += 5;
    } else {
      // Over max budget (within the 10% tolerance)
      const ratio = product.price / maxBudget;
      if (ratio <= 1.05) score += 15;
      else score += 5;
    }

    // Factor 2: Age suitability (20%)
    if (age >= product.min_age && age <= product.max_age) {
      // Perfect range
      const midAge = (product.min_age + product.max_age) / 2;
      const distance = Math.abs(age - midAge) / ((product.max_age - product.min_age) / 2 || 1);
      score += Math.max(10, 20 - (distance * 8));
    } else {
      // Outside range
      score += 0;
    }

    // Factor 3: Occasion match (20%)
    const occasionMap = OCCASION_CATEGORIES[occasion] || {};
    const occasionMultiplier = occasionMap[product.category] || 0.8;
    score += 20 * Math.min(occasionMultiplier, 1.6) / 1.6;

    // Factor 4: Relation weight (15%)
    const relationMap = RELATION_CATEGORIES[relation] || {};
    const relationMultiplier = relationMap[product.category] || 0.8;
    score += 15 * Math.min(relationMultiplier, 1.6) / 1.6;

    // Factor 5: Keyword match (20%)
    if (preferences && preferences.trim()) {
      const prefWords = preferences.toLowerCase().split(/[\s,;.!?]+/).filter(w => w.length > 2);
      const productTags = (product.tags || '').toLowerCase();
      const productDesc = (product.description || '').toLowerCase();
      const productTitle = (product.title || '').toLowerCase();
      const searchText = `${productTags} ${productDesc} ${productTitle}`;

      let matches = 0;
      for (const word of prefWords) {
        if (searchText.includes(word)) {
          matches++;
        }
      }
      const matchRatio = prefWords.length > 0 ? matches / prefWords.length : 0;
      score += 20 * Math.min(matchRatio * 2, 1); // double the ratio, cap at 20
    } else {
      score += 8; // neutral score if no preferences given
    }

    // Rating bonus (up to 5 extra points)
    score += (product.rating || 4) * 1;

    return { product, score };
  });

  // 3. Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);
  const topPicks = scored.slice(0, maxResults);

  // 4. Generate rich output for each pick
  const emotionalPool = EMOTIONAL_TEMPLATES[relation] || EMOTIONAL_TEMPLATES['default'];

  return topPicks.map((pick, index) => {
    const p = pick.product;

    // Build a contextual description
    const description = buildDescription(p, { occasion, relation, age, preferences });
    const emotionalFit = emotionalPool[index % emotionalPool.length];
    const nextSteps = NEXT_STEPS_TEMPLATES[index % NEXT_STEPS_TEMPLATES.length];

    return {
      gift_product_id: p.id,
      title: p.title,
      description,
      estimated_cost: p.price,
      emotional_fit: emotionalFit,
      next_steps: nextSteps,
      rank: index + 1,
      // Extra fields for the frontend
      category: p.category,
      image_emoji: p.image_emoji,
      rating: p.rating,
      product_url: p.product_url,
      tags: p.tags ? p.tags.split(',').slice(0, 3) : [],
      score: Math.round(pick.score * 10) / 10,
    };
  });
}

/**
 * Build a contextual, human-readable description for a recommendation.
 */
function buildDescription(product, context) {
  const { occasion, relation, age, preferences } = context;
  const parts = [];

  parts.push(product.description);

  // Add contextual sentence
  if (age <= 12) {
    parts.push(`Age-appropriate and highly rated for younger recipients around ${age} years old.`);
  } else if (age >= 60) {
    parts.push(`A refined choice that resonates with a mature recipient who values quality and elegance.`);
  }

  if (occasion !== 'Other') {
    parts.push(`An excellent ${occasion.toLowerCase()} gift for your ${relation.toLowerCase()}.`);
  }

  if (preferences && preferences.trim()) {
    const prefSnippet = preferences.trim().substring(0, 60);
    parts.push(`Selected because it aligns with their interests in ${prefSnippet}${preferences.length > 60 ? '...' : ''}.`);
  }

  return parts.join(' ');
}

module.exports = { generateRecommendations };
