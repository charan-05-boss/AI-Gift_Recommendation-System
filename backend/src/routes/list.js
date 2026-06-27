/**
 * GET /api/list
 *
 * Return all recommendation records as JSON.
 * Supports filtering by status, search query, and sorting.
 *
 * Query parameters:
 *   ?status=Pending          – filter by status
 *   ?search=Emma             – full-text search across title, recipient, owner, order_id
 *   ?sort_by=date            – sort column (date, amount, status, title)
 *   ?sort_dir=desc           – sort direction (asc, desc)
 */

const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', asyncHandler(async (req, res) => {
  const db = getDb();
  const { status, search, sort_by, sort_dir } = req.query;

  // Base query: join recommendations with recipients
  let sql = `
    SELECT
      r.id,
      r.order_id,
      r.occasion,
      r.budget,
      r.status,
      r.priority,
      r.owner,
      r.notes,
      r.created_at,
      r.updated_at,
      rec.name       AS recipient,
      rec.relation,
      rec.age,
      rec.preferences,
      COALESCE(
        (SELECT SUM(ri.estimated_cost) FROM recommendation_items ri WHERE ri.recommendation_id = r.id AND ri.rank = 1),
        r.budget
      ) AS amount
    FROM recommendations r
    JOIN recipients rec ON rec.id = r.recipient_id
    WHERE 1=1
  `;

  const params = [];

  // Filter by status
  if (status && status !== 'All') {
    sql += ` AND r.status = ?`;
    params.push(status);
  }

  // Search filter
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    sql += ` AND (
      r.order_id LIKE ? OR
      rec.name   LIKE ? OR
      r.owner    LIKE ? OR
      r.occasion LIKE ?
    )`;
    params.push(q, q, q, q);
  }

  // Sorting
  const allowedSorts = {
    date: 'r.created_at',
    amount: 'amount',
    status: 'r.status',
    title: 'rec.name',
    owner: 'r.owner',
    id: 'r.order_id',
  };
  const sortColumn = allowedSorts[sort_by] || 'r.created_at';
  const sortDirection = sort_dir === 'asc' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${sortColumn} ${sortDirection}`;

  const orders = db.prepare(sql).all(...params);

  // Format for the frontend
  const formatted = orders.map(o => ({
    id: o.order_id,
    title: `Gift for ${o.recipient}`,
    recipient: o.recipient,
    relation: o.relation,
    occasion: o.occasion,
    status: o.status,
    date: o.created_at ? o.created_at.split('T')[0].split(' ')[0] : null,
    owner: o.owner,
    amount: Math.round(o.amount),
    priority: !!o.priority,
  }));

  res.json({
    success: true,
    count: formatted.length,
    orders: formatted,
  });
}));

module.exports = router;
