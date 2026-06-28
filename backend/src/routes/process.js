/**
 * POST /api/process/:id
 *
 * Trigger the AI gift recommendation engine for a specific order.
 * Steps:
 *   1. Load the order's input data (occasion, age, relation, budget, preferences)
 *   2. Call the AI engine to generate recommendations
 *   3. Save the recommended items to recommendation_items
 *   4. Update the order status to 'Processing'
 *   5. Log the action in recommendation_history
 *   6. Return the generated recommendations
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { recommend } = require('../services/aiEngine');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

router.post('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const { id } = req.params;

  // 1. Find the order
  let rec;
  if (id.startsWith('ORD-')) {
    const recRes = await db.query(`
      SELECT r.*, rec.relation, rec.age, rec.preferences
      FROM recommendations r
      JOIN recipients rec ON rec.id = r.recipient_id
      WHERE r.order_id = $1
    `, [id]);
    rec = recRes.rows[0];
  } else {
    const recRes = await db.query(`
      SELECT r.*, rec.relation, rec.age, rec.preferences
      FROM recommendations r
      JOIN recipients rec ON rec.id = r.recipient_id
      WHERE r.id = $1
    `, [parseInt(id)]);
    rec = recRes.rows[0];
  }

  if (!rec) {
    throw new AppError(`Order '${id}' not found.`, 404);
  }

  // 2. Check current status — only process Pending or re-process existing
  if (rec.status === 'Cancelled') {
    throw new AppError('Cannot process a cancelled order. Reopen it first.', 400);
  }

  // 3. Run the AI engine
  console.log(`\n🎁 Processing order ${rec.order_id}...`);
  const input = {
    occasion: rec.occasion,
    relation: rec.relation,
    age: rec.age,
    budget: parseFloat(rec.max_budget),
    preferences: rec.preferences || '',
  };

  const { engine, recommendations } = await recommend(input);

  // 4. Save recommendations in a transaction
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    
    // Clear any previous recommendation items for this order
    await client.query(`DELETE FROM recommendation_items WHERE recommendation_id = $1`, [rec.id]);

    // Insert new items
    for (const item of recommendations) {
      await client.query(`
        INSERT INTO recommendation_items
          (recommendation_id, gift_product_id, title, description, estimated_cost, emotional_fit, next_steps, rank)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        rec.id,
        item.gift_product_id || null,
        item.title,
        item.description,
        item.estimated_cost,
        item.emotional_fit || null,
        item.next_steps || null,
        item.rank
      ]);
    }

    // Update status to Processing
    if (rec.status === 'Pending') {
      await client.query(
        `UPDATE recommendations SET status = 'Processing', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [rec.id]
      );
    }

    // Log in history
    await client.query(
      `INSERT INTO recommendation_history (recommendation_id, action, actor) VALUES ($1, $2, $3)`,
      [
        rec.id,
        `AI engine (${engine}) generated ${recommendations.length} recommendations. Status: ${rec.status} to Processing.`,
        'System'
      ]
    );
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(`  ✅ Generated ${recommendations.length} recommendations via ${engine} engine.\n`);

  // 5. Return the result
  res.json({
    success: true,
    engine,
    order_id: rec.order_id,
    count: recommendations.length,
    recommendations: recommendations.map(r => ({
      id: r.rank,
      title: r.title,
      description: r.description,
      estimatedCost: parseFloat(r.estimated_cost),
      emotional_fit: r.emotional_fit,
      next_steps: r.next_steps,
      category: r.category || 'General',
      imageEmoji: r.image_emoji || '🎁',
      rating: parseFloat(r.rating) || 4.5,
      productUrl: r.product_url || '',
      tags: r.tags || [],
    })),
  });
}));

module.exports = router;
