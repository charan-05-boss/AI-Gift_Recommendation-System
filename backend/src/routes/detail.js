/**
 * GET /api/detail/:id
 *
 * Return a single recommendation record with all related data:
 *   - Recommendation metadata
 *   - Recipient details
 *   - AI-generated recommendation items
 *   - Action history log
 *
 * The :id parameter can be either the order_id (e.g. "ORD-001")
 * or the numeric database id.
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

router.get('/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const { id } = req.params;

  // Look up by order_id first, then by numeric id
  let rec;
  if (id.startsWith('ORD-')) {
    const recRes = await db.query(`
      SELECT r.*, rec.name AS recipient_name, rec.relation, rec.age, rec.preferences,
             c.name AS customer_name, c.email AS customer_email
      FROM recommendations r
      JOIN recipients rec ON rec.id = r.recipient_id
      JOIN customers c ON c.id = r.customer_id
      WHERE r.order_id = $1
    `, [id]);
    rec = recRes.rows[0];
  } else {
    const recRes = await db.query(`
      SELECT r.*, rec.name AS recipient_name, rec.relation, rec.age, rec.preferences,
             c.name AS customer_name, c.email AS customer_email
      FROM recommendations r
      JOIN recipients rec ON rec.id = r.recipient_id
      JOIN customers c ON c.id = r.customer_id
      WHERE r.id = $1
    `, [parseInt(id)]);
    rec = recRes.rows[0];
  }

  if (!rec) {
    throw new AppError(`Order '${id}' not found.`, 404);
  }

  // Fetch recommendation items (AI output)
  const itemsRes = await db.query(`
    SELECT ri.*, gp.product_url, gp.image_emoji, gp.rating, gp.tags, gp.category
    FROM recommendation_items ri
    LEFT JOIN gift_products gp ON gp.id = ri.gift_product_id
    WHERE ri.recommendation_id = $1
    ORDER BY ri.rank ASC
  `, [rec.id]);
  const items = itemsRes.rows;

  // Fetch history
  const historyRes = await db.query(`
    SELECT * FROM recommendation_history
    WHERE recommendation_id = $1
    ORDER BY timestamp DESC
  `, [rec.id]);
  const history = historyRes.rows;

  // Fetch messages
  const messagesRes = await db.query(`
    SELECT * FROM messages
    WHERE recommendation_id = $1
    ORDER BY created_at DESC
  `, [rec.id]);
  const messages = messagesRes.rows;

  // Compute total amount from top-ranked item
  const topItem = items.find(i => parseInt(i.rank) === 1);
  const amount = topItem ? parseFloat(topItem.estimated_cost) : parseFloat(rec.max_budget);

  res.json({
    success: true,
    order: {
      id: rec.order_id,
      title: `Gift for ${rec.recipient_name}`,
      recipient: rec.recipient_name,
      relation: rec.relation,
      age: rec.age,
      preferences: rec.preferences,
      occasion: rec.occasion,
      minBudget: parseFloat(rec.min_budget),
      maxBudget: parseFloat(rec.max_budget),
      budget: parseFloat(rec.max_budget), // compatibility
      status: rec.status,
      priority: !!rec.priority,
      owner: rec.owner,
      notes: rec.notes,
      date: rec.created_at ? new Date(rec.created_at).toISOString().split('T')[0] : null,
      amount: Math.round(amount),
      customer: {
        name: rec.customer_name,
        email: rec.customer_email,
      },
      aiOutput: items.map(i => ({
        title: i.title,
        desc: i.description,
        cost: parseFloat(i.estimated_cost),
        emotional_fit: i.emotional_fit,
        next_steps: i.next_steps,
        rank: i.rank,
        category: i.category || 'General',
        image_emoji: i.image_emoji || '🎁',
        rating: parseFloat(i.rating) || 4.5,
        product_url: i.product_url || '',
        tags: i.tags ? i.tags.split(',').slice(0, 3) : [],
      })),
      history: history.map(h => ({
        action: h.action,
        actor: h.actor,
        timestamp: h.timestamp,
      })),
      messages: messages.map(m => ({
        type: m.message_type,
        content: m.content,
        date: m.created_at,
      })),
    },
  });
}));

module.exports = router;
