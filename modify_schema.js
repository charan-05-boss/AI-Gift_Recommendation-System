const fs = require('fs');
let content = fs.readFileSync('backend/src/models/schema.js', 'utf8');

// Update recommendations table schema
content = content.replace(
  'budget        REAL    NOT NULL CHECK (budget > 0),',
  'min_budget    REAL    NOT NULL CHECK (min_budget > 0),\n      max_budget    REAL    NOT NULL CHECK (max_budget >= min_budget),'
);

// Update gift products prices (multiply by 80)
content = content.replace(/price:\s*([\d.]+)/g, (match, p1) => `price: ${Math.round(parseFloat(p1) * 80)}`);

// Update demo orders
content = content.replace(/budget:\s*50/g, 'min_budget: 2000, max_budget: 5000');
content = content.replace(/budget:\s*150/g, 'min_budget: 5000, max_budget: 15000');
content = content.replace(/budget:\s*80/g, 'min_budget: 4000, max_budget: 8000');
content = content.replace(/budget:\s*100/g, 'min_budget: 5000, max_budget: 10000');
content = content.replace(/budget:\s*200/g, 'min_budget: 10000, max_budget: 20000');
content = content.replace(/budget:\s*400/g, 'min_budget: 20000, max_budget: 40000');

// Update insertRec statement
content = content.replace(
  'INSERT INTO recommendations (order_id, customer_id, recipient_id, occasion, budget, status, priority, owner, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
  'INSERT INTO recommendations (order_id, customer_id, recipient_id, occasion, min_budget, max_budget, status, priority, owner, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
content = content.replace(
  'insertRec.run(orderId, customerId, recipientId, o.occasion, o.budget, o.status, o.priority, o.owner, o.notes, o.date, o.date);',
  'insertRec.run(orderId, customerId, recipientId, o.occasion, o.min_budget, o.max_budget, o.status, o.priority, o.owner, o.notes, o.date, o.date);'
);

fs.writeFileSync('backend/src/models/schema.js', content, 'utf8');
console.log('schema.js updated successfully!');
