/**
 * POST /api/create
 *
 * Validate and save a new gift recommendation request.
 * Creates customer, recipient, and recommendation records in a single transaction.
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { validateCreateInput } = require('../services/validation');
const { asyncHandler, AppError } = require('../middleware/errorHandler');

router.post('/', asyncHandler(async (req, res) => {
  const body = req.body;

  // 1. Server-side validation
  const { valid, errors } = validateCreateInput(body);
  if (!valid) {
    throw new AppError(errors.join(' '), 400);
  }

  const db = getDb();

  // 2. Generate next order_id
  const lastOrder = db.prepare(
    `SELECT order_id FROM recommendations ORDER BY id DESC LIMIT 1`
  ).get();

  let nextNum = 1;
  if (lastOrder && lastOrder.order_id) {
    const match = lastOrder.order_id.match(/ORD-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const orderId = `ORD-${String(nextNum).padStart(3, '0')}`;

  // 3. Insert records in a transaction
  const result = db.transaction(() => {
    // Create customer
    const custResult = db.prepare(
      `INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)`
    ).run(
      body.customerName || 'Guest',
      body.customerEmail || null,
      body.customerPhone || null
    );
    const customerId = custResult.lastInsertRowid;

    // Create recipient
    const recipResult = db.prepare(
      `INSERT INTO recipients (customer_id, name, relation, age, preferences) VALUES (?, ?, ?, ?, ?)`
    ).run(
      customerId,
      body.recipientName || 'Unnamed Recipient',
      body.relation.trim(),
      parseInt(body.age),
      body.preferences || null
    );
    const recipientId = recipResult.lastInsertRowid;

    // Create recommendation
    const recResult = db.prepare(
      `INSERT INTO recommendations (order_id, customer_id, recipient_id, occasion, min_budget, max_budget, status, priority, owner, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'Pending', ?, ?, ?)`
    ).run(
      orderId,
      customerId,
      recipientId,
      body.occasion.trim(),
      parseFloat(body.minBudget),
      parseFloat(body.maxBudget),
      body.priority ? 1 : 0,
      body.owner || 'Unassigned',
      body.notes || null
    );
    const recommendationId = recResult.lastInsertRowid;

    // Log creation in history
    db.prepare(
      `INSERT INTO recommendation_history (recommendation_id, action, actor) VALUES (?, ?, ?)`
    ).run(recommendationId, 'Order created.', body.customerName || 'Guest');

    // Optionally store an important date
    if (body.importantDate) {
      db.prepare(
        `INSERT INTO important_dates (customer_id, label, date_value, notes) VALUES (?, ?, ?, ?)`
      ).run(customerId, body.occasion, body.importantDate, `Important date for ${body.occasion}`);
    }

    return {
      id: recommendationId,
      order_id: orderId,
      customer_id: customerId,
      recipient_id: recipientId,
    };
  })();

  // 4. Fetch the complete created record for the response
  const created = db.prepare(`
    SELECT r.*, rec.name as recipient_name, rec.relation, rec.age, rec.preferences
    FROM recommendations r
    JOIN recipients rec ON rec.id = r.recipient_id
    WHERE r.id = ?
  `).get(result.id);

  res.status(201).json({
    success: true,
    message: `Order ${orderId} created successfully.`,
    order: {
      id: created.order_id,
      title: `Gift for ${created.recipient_name}`,
      recipient: created.recipient_name,
      relation: created.relation,
      age: created.age,
      occasion: created.occasion,
      minBudget: created.min_budget,
      maxBudget: created.max_budget,
      status: created.status,
      priority: !!created.priority,
      owner: created.owner,
      date: created.created_at,
      amount: 0,
    },
  });
}));

module.exports = router;
