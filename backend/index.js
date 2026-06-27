/**
 * Paper Plane – AI Gift Recommendation Assistant
 * ══════════════════════════════════════════════════
 * Backend Entry Point
 *
 * Express server with:
 *   - Database initialization (SQLite)
 *   - REST API routing
 *   - Global error handling
 *   - CORS for frontend integration
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initializeDatabase } = require('./src/models/schema');
const { errorHandler, asyncHandler, AppError } = require('./src/middleware/errorHandler');
const { getDb } = require('./src/config/database');
const { closeDb } = require('./src/config/database');
const { recommend } = require('./src/services/aiEngine');
const { validateCreateInput } = require('./src/services/validation');

// Import route modules
const createRoute = require('./src/routes/create');
const listRoute = require('./src/routes/list');
const detailRoute = require('./src/routes/detail');
const processRoute = require('./src/routes/process');

// ── Initialize Express ──
const app = express();
const port = process.env.PORT || 3001;

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request logging (development)
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const icon = res.statusCode < 400 ? '✓' : '✗';
    console.log(`  ${icon} ${req.method} ${req.originalUrl} → ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// ── Health Check ──
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'Backend is running correctly.',
    database: 'SQLite (WAL mode)',
    engine: process.env.GEMINI_API_KEY ? 'Gemini API' : 'Rule-Based Scoring',
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ──
app.use('/api/create', createRoute);
app.use('/api/list', listRoute);
app.use('/api/detail', detailRoute);
app.use('/api/process', processRoute);

// ── Legacy endpoint: POST /api/recommendations ──
// Kept for backward-compatibility with the frontend form.
// This combines create + process in one step for the simple form flow.
app.post('/api/recommendations', asyncHandler(async (req, res) => {
  const body = req.body;

  // Validate
  const { valid, errors } = validateCreateInput(body);
  if (!valid) {
    throw new AppError(errors.join(' '), 400);
  }

  const db = getDb();

  // Generate next order_id
  const lastOrder = db.prepare(`SELECT order_id FROM recommendations ORDER BY id DESC LIMIT 1`).get();
  let nextNum = 1;
  if (lastOrder && lastOrder.order_id) {
    const match = lastOrder.order_id.match(/ORD-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const orderId = `ORD-${String(nextNum).padStart(3, '0')}`;

  // Create records
  const result = db.transaction(() => {
    const cust = db.prepare(`INSERT INTO customers (name) VALUES (?)`).run(body.customerName || 'Guest');
    const recip = db.prepare(`INSERT INTO recipients (customer_id, name, relation, age, preferences) VALUES (?, ?, ?, ?, ?)`).run(
      cust.lastInsertRowid, body.recipientName || 'Recipient', body.relation, parseInt(body.age), body.preferences || null
    );
    const rec = db.prepare(`INSERT INTO recommendations (order_id, customer_id, recipient_id, occasion, min_budget, max_budget) VALUES (?, ?, ?, ?, ?, ?)`).run(
      orderId, cust.lastInsertRowid, recip.lastInsertRowid, body.occasion, parseFloat(body.minBudget), parseFloat(body.maxBudget)
    );
    db.prepare(`INSERT INTO recommendation_history (recommendation_id, action, actor) VALUES (?, ?, ?)`).run(
      rec.lastInsertRowid, 'Order created via quick recommendation form.', 'System'
    );
    return { recId: rec.lastInsertRowid, orderId };
  })();

  // Run AI engine
  const input = {
    occasion: body.occasion,
    relation: body.relation,
    age: parseInt(body.age),
    minBudget: parseFloat(body.minBudget),
    maxBudget: parseFloat(body.maxBudget),
    preferences: body.preferences || '',
  };

  const { engine, recommendations } = await recommend(input);

  // Save items
  db.transaction(() => {
    const insertItem = db.prepare(`
      INSERT INTO recommendation_items (recommendation_id, gift_product_id, title, description, estimated_cost, emotional_fit, next_steps, rank)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of recommendations) {
      insertItem.run(result.recId, item.gift_product_id || null, item.title, item.description, item.estimated_cost, item.emotional_fit || null, item.next_steps || null, item.rank);
    }
    db.prepare(`UPDATE recommendations SET status = 'Processing', updated_at = datetime('now') WHERE id = ?`).run(result.recId);
    db.prepare(`INSERT INTO recommendation_history (recommendation_id, action, actor) VALUES (?, ?, ?)`).run(
      result.recId, `AI engine (${engine}) generated ${recommendations.length} recommendations.`, 'System'
    );
  })();

  res.json({
    success: true,
    order_id: result.orderId,
    engine,
    recommendations: recommendations.map(r => ({
      id: r.rank,
      title: r.title,
      description: r.description,
      estimatedCost: r.estimated_cost,
      category: r.category || 'General',
      rating: r.rating || 4.5,
      productUrl: r.product_url || '',
      imageEmoji: r.image_emoji || '🎁',
      tags: r.tags || [],
      emotional_fit: r.emotional_fit,
      next_steps: r.next_steps,
    })),
  });
}));

// ── POST /api/orders – "Order This" from the Results page ──
// Creates a quick order from a selected recommendation card.
app.post('/api/orders', asyncHandler(async (req, res) => {
  const db = getDb();
  const { recommendation, customer } = req.body;

  // Generate next order_id
  const lastOrder = db.prepare(`SELECT order_id FROM recommendations ORDER BY id DESC LIMIT 1`).get();
  let nextNum = 1;
  if (lastOrder && lastOrder.order_id) {
    const match = lastOrder.order_id.match(/ORD-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const orderId = `ORD-${String(nextNum).padStart(3, '0')}`;

  db.transaction(() => {
    const cust = db.prepare(`INSERT INTO customers (name) VALUES (?)`).run('Guest');
    const recip = db.prepare(`INSERT INTO recipients (customer_id, name, relation, age, preferences) VALUES (?, ?, ?, ?, ?)`).run(
      cust.lastInsertRowid, 'Recipient', customer?.relation || 'Friend', parseInt(customer?.age) || 25, customer?.preferences || null
    );
    const rec = db.prepare(`INSERT INTO recommendations (order_id, customer_id, recipient_id, occasion, min_budget, max_budget, status, owner) VALUES (?, ?, ?, ?, ?, ?, 'Processing', 'Unassigned')`).run(
      orderId, cust.lastInsertRowid, recip.lastInsertRowid, customer?.occasion || 'Other', recommendation?.estimatedCost || 50, recommendation?.estimatedCost || 50
    );
    db.prepare(`INSERT INTO recommendation_history (recommendation_id, action, actor) VALUES (?, ?, ?)`).run(
      rec.lastInsertRowid, `Order placed for "${recommendation?.title || 'Gift'}".`, 'System'
    );
  })();

  res.status(201).json({ success: true, message: `Order ${orderId} created.`, order_id: orderId });
}));

// ── Legacy endpoint: GET /api/orders + GET /api/orders/:id ──
// For backward-compatibility with the frontend dashboard.
app.get('/api/orders', asyncHandler(async (req, res) => {
  const db = getDb();
  const orders = db.prepare(`
    SELECT r.*, rec.name AS recipient, rec.relation
    FROM recommendations r
    JOIN recipients rec ON rec.id = r.recipient_id
    ORDER BY r.created_at DESC
  `).all();

  res.json({
    success: true,
    orders: orders.map(o => ({
      id: o.order_id,
      title: `Gift for ${o.recipient}`,
      recipient: o.recipient,
      relation: o.relation,
      occasion: o.occasion,
      status: o.status,
      date: o.created_at ? o.created_at.split('T')[0].split(' ')[0] : null,
      owner: o.owner,
      amount: Math.round(o.max_budget),
      priority: !!o.priority,
    })),
  });
}));

app.get('/api/orders/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const rec = db.prepare(`
    SELECT r.*, rec.name AS recipient_name, rec.relation, rec.age, rec.preferences
    FROM recommendations r
    JOIN recipients rec ON rec.id = r.recipient_id
    WHERE r.order_id = ?
  `).get(id);

  if (!rec) {
    throw new AppError(`Order '${id}' not found.`, 404);
  }

  const items = db.prepare(`
    SELECT ri.*, gp.product_url, gp.image_emoji, gp.rating, gp.tags, gp.category
    FROM recommendation_items ri
    LEFT JOIN gift_products gp ON gp.id = ri.gift_product_id
    WHERE ri.recommendation_id = ?
    ORDER BY ri.rank ASC
  `).all(rec.id);

  const history = db.prepare(`
    SELECT * FROM recommendation_history WHERE recommendation_id = ? ORDER BY timestamp DESC
  `).all(rec.id);

  const topItem = items.find(i => i.rank === 1);

  res.json({
    success: true,
    order: {
      id: rec.order_id,
      title: `Gift for ${rec.recipient_name}`,
      recipient: rec.recipient_name,
      relation: rec.relation,
      age: rec.age,
      occasion: rec.occasion,
      minBudget: rec.min_budget,
      maxBudget: rec.max_budget,
      status: rec.status,
      priority: !!rec.priority,
      owner: rec.owner,
      notes: rec.notes,
      date: rec.created_at ? rec.created_at.split('T')[0].split(' ')[0] : null,
      amount: topItem ? Math.round(topItem.estimated_cost) : Math.round(rec.max_budget),
      aiOutput: items.map(i => ({
        title: i.title,
        desc: i.description,
        cost: i.estimated_cost,
        emotional_fit: i.emotional_fit,
        next_steps: i.next_steps,
      })),
      history: history.map(h => ({
        action: h.action,
        actor: h.actor,
        timestamp: h.timestamp,
      })),
    },
  });
}));

// ── PUT /api/orders/:id/status ──
app.put('/api/orders/:id/status', asyncHandler(async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { status, reason } = req.body;

  if (!status) {
    throw new AppError('Status is required.', 400);
  }

  const rec = db.prepare('SELECT id, status FROM recommendations WHERE order_id = ?').get(id);
  if (!rec) {
    throw new AppError(`Order '${id}' not found.`, 404);
  }

  const oldStatus = rec.status;
  
  db.prepare(`UPDATE recommendations SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, rec.id);

  let actionText = `Status updated: ${oldStatus} to ${status}.`;
  if (status === 'Cancelled' && reason) {
    actionText += ` Reason: ${reason}`;
  }

  db.prepare(`INSERT INTO recommendation_history (recommendation_id, action, actor) VALUES (?, ?, ?)`).run(
    rec.id, actionText, 'User'
  );

  res.json({ success: true, status, message: 'Status updated successfully.' });
}));

// ── PUT /api/orders/:id/notes ──
app.put('/api/orders/:id/notes', asyncHandler(async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { notes } = req.body;

  const rec = db.prepare('SELECT id FROM recommendations WHERE order_id = ?').get(id);
  if (!rec) {
    throw new AppError(`Order '${id}' not found.`, 404);
  }

  db.prepare(`UPDATE recommendations SET notes = ?, updated_at = datetime('now') WHERE id = ?`).run(notes || '', rec.id);

  db.prepare(`INSERT INTO recommendation_history (recommendation_id, action, actor) VALUES (?, ?, ?)`).run(
    rec.id, 'Notes updated.', 'User'
  );

  res.json({ success: true, message: 'Notes updated successfully.' });
}));

// ── 404 handler ──
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ── Global error handler (must be last) ──
app.use(errorHandler);

// ── Start Server ──
initializeDatabase();

const server = app.listen(port, () => {
  console.log(`\n✈️  Paper Plane backend listening at http://localhost:${port}`);
  console.log(`   Engine: ${process.env.GEMINI_API_KEY ? 'Gemini API' : 'Rule-Based Scoring'}`);
  console.log(`   Database: SQLite (WAL mode)\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  closeDb();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  closeDb();
  server.close(() => process.exit(0));
});
