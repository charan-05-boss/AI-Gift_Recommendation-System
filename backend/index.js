/**
 * Paper Plane – AI Gift Recommendation Assistant
 * ══════════════════════════════════════════════════
 * Backend Entry Point
 *
 * Express server with:
 *   - Database initialization (PostgreSQL)
 *   - REST API routing
 *   - Global error handling
 *   - CORS for frontend integration
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { initializeDatabase } = require('./src/models/schema');
const { errorHandler, asyncHandler, AppError } = require('./src/middleware/errorHandler');
const { getDb, closeDb } = require('./src/config/database');
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
app.use(helmet({
  contentSecurityPolicy: false, // Disabled for local dev/Vite compat depending on setup. You can fine tune this later.
}));
app.use(compression());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

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
    database: 'PostgreSQL',
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
  const lastOrderRes = await db.query(`SELECT order_id FROM recommendations ORDER BY id DESC LIMIT 1`);
  const lastOrder = lastOrderRes.rows[0];
  let nextNum = 1;
  if (lastOrder && lastOrder.order_id) {
    const match = lastOrder.order_id.match(/ORD-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const orderId = `ORD-${String(nextNum).padStart(3, '0')}`;

  const client = await db.connect();
  let recId;
  try {
    await client.query('BEGIN');
    const custRes = await client.query(`INSERT INTO customers (name) VALUES ($1) RETURNING id`, [body.customerName || 'Guest']);
    const custId = custRes.rows[0].id;
    
    const recipRes = await client.query(
      `INSERT INTO recipients (customer_id, name, relation, age, preferences) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [custId, body.recipientName || 'Recipient', body.relation, parseInt(body.age), body.preferences || null]
    );
    const recipId = recipRes.rows[0].id;

    const recRes = await client.query(
      `INSERT INTO recommendations (order_id, customer_id, recipient_id, occasion, min_budget, max_budget) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [orderId, custId, recipId, body.occasion, parseFloat(body.minBudget), parseFloat(body.maxBudget)]
    );
    recId = recRes.rows[0].id;

    await client.query(`INSERT INTO recommendation_history (recommendation_id, action, actor) VALUES ($1, $2, $3)`, [recId, 'Order created via quick recommendation form.', 'System']);
    
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

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
  const client2 = await db.connect();
  try {
    await client2.query('BEGIN');
    const insertItem = `
      INSERT INTO recommendation_items (recommendation_id, gift_product_id, title, description, estimated_cost, emotional_fit, next_steps, rank)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;
    for (const item of recommendations) {
      await client2.query(insertItem, [recId, item.gift_product_id || null, item.title, item.description, item.estimated_cost, item.emotional_fit || null, item.next_steps || null, item.rank]);
    }
    await client2.query(`UPDATE recommendations SET status = 'Processing', updated_at = CURRENT_TIMESTAMP WHERE id = $1`, [recId]);
    await client2.query(`INSERT INTO recommendation_history (recommendation_id, action, actor) VALUES ($1, $2, $3)`, [recId, `AI engine (${engine}) generated ${recommendations.length} recommendations.`, 'System']);
    await client2.query('COMMIT');
  } catch (err) {
    await client2.query('ROLLBACK');
    throw err;
  } finally {
    client2.release();
  }

  res.json({
    success: true,
    order_id: orderId,
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
app.post('/api/orders', asyncHandler(async (req, res) => {
  const db = getDb();
  const { recommendation, customer, orderId } = req.body;

  if (orderId) {
    const recRecordRes = await db.query('SELECT id FROM recommendations WHERE order_id = $1', [orderId]);
    const recRecord = recRecordRes.rows[0];
    if (recRecord) {
      await db.query("UPDATE recommendations SET max_budget = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [recommendation?.estimatedCost || 50, recRecord.id]);
      await db.query(`INSERT INTO recommendation_history (recommendation_id, action, actor) VALUES ($1, $2, $3)`, [recRecord.id, `Customer ordered: "${recommendation?.title || 'Gift'}".`, 'System']);
      return res.status(200).json({ success: true, message: `Order ${orderId} updated.`, order_id: orderId });
    }
  }

  // Generate next order_id
  const lastOrderRes = await db.query(`SELECT order_id FROM recommendations ORDER BY id DESC LIMIT 1`);
  const lastOrder = lastOrderRes.rows[0];
  let nextNum = 1;
  if (lastOrder && lastOrder.order_id) {
    const match = lastOrder.order_id.match(/ORD-(\d+)/);
    if (match) nextNum = parseInt(match[1]) + 1;
  }
  const newOrderId = `ORD-${String(nextNum).padStart(3, '0')}`;

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const custRes = await client.query(`INSERT INTO customers (name) VALUES ($1) RETURNING id`, ['Guest']);
    const custId = custRes.rows[0].id;

    const recipRes = await client.query(
      `INSERT INTO recipients (customer_id, name, relation, age, preferences) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [custId, 'Recipient', customer?.relation || 'Friend', parseInt(customer?.age) || 25, customer?.preferences || null]
    );
    const recipId = recipRes.rows[0].id;

    const recRes = await client.query(
      `INSERT INTO recommendations (order_id, customer_id, recipient_id, occasion, min_budget, max_budget, status, owner) VALUES ($1, $2, $3, $4, $5, $6, 'Processing', 'Unassigned') RETURNING id`,
      [newOrderId, custId, recipId, customer?.occasion || 'Other', recommendation?.estimatedCost || 50, recommendation?.estimatedCost || 50]
    );
    const recId = recRes.rows[0].id;

    await client.query(`INSERT INTO recommendation_history (recommendation_id, action, actor) VALUES ($1, $2, $3)`, [recId, `Order placed for "${recommendation?.title || 'Gift'}".`, 'System']);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  res.status(201).json({ success: true, message: `Order ${newOrderId} created.`, order_id: newOrderId });
}));

// ── Legacy endpoint: GET /api/orders + GET /api/orders/:id ──
// For backward-compatibility with the frontend dashboard.
app.get('/api/orders', asyncHandler(async (req, res) => {
  const db = getDb();
  const ordersRes = await db.query(`
    SELECT r.*, rec.name AS recipient, rec.relation
    FROM recommendations r
    JOIN recipients rec ON rec.id = r.recipient_id
    ORDER BY r.created_at DESC
  `);
  const orders = ordersRes.rows;

  res.json({
    success: true,
    orders: orders.map(o => ({
      id: o.order_id,
      title: `Gift for ${o.recipient}`,
      recipient: o.recipient,
      relation: o.relation,
      occasion: o.occasion,
      status: o.status,
      date: o.created_at ? new Date(o.created_at).toISOString().split('T')[0] : null,
      owner: o.owner,
      amount: Math.round(parseFloat(o.max_budget)),
      priority: !!o.priority,
    })),
  });
}));

app.get('/api/orders/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const recRes = await db.query(`
    SELECT r.*, rec.name AS recipient_name, rec.relation, rec.age, rec.preferences
    FROM recommendations r
    JOIN recipients rec ON rec.id = r.recipient_id
    WHERE r.order_id = $1
  `, [id]);
  const rec = recRes.rows[0];

  if (!rec) {
    throw new AppError(`Order '${id}' not found.`, 404);
  }

  const itemsRes = await db.query(`
    SELECT ri.*, gp.product_url, gp.image_emoji, gp.rating, gp.tags, gp.category
    FROM recommendation_items ri
    LEFT JOIN gift_products gp ON gp.id = ri.gift_product_id
    WHERE ri.recommendation_id = $1
    ORDER BY ri.rank ASC
  `, [rec.id]);
  const items = itemsRes.rows;

  const historyRes = await db.query(`
    SELECT * FROM recommendation_history WHERE recommendation_id = $1 ORDER BY timestamp DESC
  `, [rec.id]);
  const history = historyRes.rows;

  const topItem = items.find(i => parseInt(i.rank) === 1);

  res.json({
    success: true,
    order: {
      id: rec.order_id,
      title: `Gift for ${rec.recipient_name}`,
      recipient: rec.recipient_name,
      relation: rec.relation,
      age: rec.age,
      occasion: rec.occasion,
      minBudget: parseFloat(rec.min_budget),
      maxBudget: parseFloat(rec.max_budget),
      status: rec.status,
      priority: !!rec.priority,
      owner: rec.owner,
      notes: rec.notes,
      date: rec.created_at ? new Date(rec.created_at).toISOString().split('T')[0] : null,
      amount: topItem ? Math.round(parseFloat(topItem.estimated_cost)) : Math.round(parseFloat(rec.max_budget)),
      aiOutput: items.map(i => ({
        title: i.title,
        desc: i.description,
        cost: parseFloat(i.estimated_cost),
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

  const recRes = await db.query('SELECT id, status FROM recommendations WHERE order_id = $1', [id]);
  const rec = recRes.rows[0];
  if (!rec) {
    throw new AppError(`Order '${id}' not found.`, 404);
  }

  const oldStatus = rec.status;
  
  await db.query(`UPDATE recommendations SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [status, rec.id]);

  let actionText = `Status updated: ${oldStatus} to ${status}.`;
  if (status === 'Cancelled' && reason) {
    actionText += ` Reason: ${reason}`;
  }

  await db.query(`INSERT INTO recommendation_history (recommendation_id, action, actor) VALUES ($1, $2, $3)`, [rec.id, actionText, 'User']);

  res.json({ success: true, status, message: 'Status updated successfully.' });
}));

// ── PUT /api/orders/:id/notes ──
app.put('/api/orders/:id/notes', asyncHandler(async (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { notes } = req.body;

  const recRes = await db.query('SELECT id FROM recommendations WHERE order_id = $1', [id]);
  const rec = recRes.rows[0];
  if (!rec) {
    throw new AppError(`Order '${id}' not found.`, 404);
  }

  await db.query(`UPDATE recommendations SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [notes || '', rec.id]);
  await db.query(`INSERT INTO recommendation_history (recommendation_id, action, actor) VALUES ($1, $2, $3)`, [rec.id, 'Notes updated.', 'User']);

  res.json({ success: true, message: 'Notes updated successfully.' });
}));

// ── DELETE /api/orders/:id ──
app.delete('/api/orders/:id', asyncHandler(async (req, res) => {
  const db = getDb();
  const { id } = req.params;

  const recRes = await db.query('SELECT id FROM recommendations WHERE order_id = $1', [id]);
  const rec = recRes.rows[0];
  if (!rec) {
    throw new AppError(`Order '${id}' not found.`, 404);
  }

  await db.query('DELETE FROM recommendations WHERE id = $1', [rec.id]);

  res.json({ success: true, message: 'Order deleted successfully.' });
}));

// ── Static Files (Frontend) ──
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// ── 404 handler for API routes ──
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found.`,
  });
});

// ── SPA Fallback (React Router) ──
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.originalUrl.startsWith('/api')) {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  } else {
    next();
  }
});

// ── Global error handler (must be last) ──
app.use(errorHandler);

// ── Start Server ──
let server;
(async () => {
  try {
    await initializeDatabase();
    server = app.listen(port, () => {
      console.log(`\n✈️  Paper Plane backend listening at http://localhost:${port}`);
      console.log(`   Engine: ${process.env.GEMINI_API_KEY ? 'Gemini API' : 'Rule-Based Scoring'}`);
      console.log(`   Database: PostgreSQL\n`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
  }
})();

module.exports = app;

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await closeDb();
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeDb();
  if (server) server.close(() => process.exit(0));
  else process.exit(0);
});
