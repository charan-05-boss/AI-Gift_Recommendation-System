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
    rec = db.prepare(`
      SELECT r.*, rec.name AS recipient_name, rec.relation, rec.age, rec.preferences,
             c.name AS customer_name, c.email AS customer_email
      FROM recommendations r
      JOIN recipients rec ON rec.id = r.recipient_id
      JOIN customers c ON c.id = r.customer_id
      WHERE r.order_id = ?
    `).get(id);
  } else {
    rec = db.prepare(`
      SELECT r.*, rec.name AS recipient_name, rec.relation, rec.age, rec.preferences,
             c.name AS customer_name, c.email AS customer_email
      FROM recommendations r
      JOIN recipients rec ON rec.id = r.recipient_id
      JOIN customers c ON c.id = r.customer_id
      WHERE r.id = ?
    `).get(parseInt(id));
  }

  if (!rec) {
    throw new AppError(`Order '${id}' not found.`, 404);
  }

  // Fetch recommendation items (AI output)
  const items = db.prepare(`
    SELECT ri.*, gp.product_url, gp.image_emoji, gp.rating, gp.tags, gp.category
    FROM recommendation_items ri
    LEFT JOIN gift_products gp ON gp.id = ri.gift_product_id
    WHERE ri.recommendation_id = ?
    ORDER BY ri.rank ASC
  `).all(rec.id);

  // Fetch history
  const history = db.prepare(`
    SELECT * FROM recommendation_history
    WHERE recommendation_id = ?
    ORDER BY timestamp DESC
  `).all(rec.id);

  // Fetch messages
  const messages = db.prepare(`
    SELECT * FROM messages
    WHERE recommendation_id = ?
    ORDER BY created_at DESC
  `).all(rec.id);

  // Compute total amount from top-ranked item
  const topItem = items.find(i => i.rank === 1);
  const amount = topItem ? topItem.estimated_cost : rec.budget;

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
      budget: rec.budget,
      status: rec.status,
      priority: !!rec.priority,
      owner: rec.owner,
      notes: rec.notes,
      date: rec.created_at ? rec.created_at.split('T')[0].split(' ')[0] : null,
      amount: Math.round(amount),
      customer: {
        name: rec.customer_name,
        email: rec.customer_email,
      },
      aiOutput: items.map(i => ({
        title: i.title,
        desc: i.description,
        cost: i.estimated_cost,
        emotional_fit: i.emotional_fit,
        next_steps: i.next_steps,
        rank: i.rank,
        category: i.category || 'General',
        image_emoji: i.image_emoji || '🎁',
        rating: i.rating || 4.5,
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
