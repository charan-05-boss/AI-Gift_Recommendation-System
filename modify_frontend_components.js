const fs = require('fs');

// 1. Dashboard.jsx
let dbContent = fs.readFileSync('frontend/src/pages/Dashboard.jsx', 'utf8');
dbContent = dbContent.replace('<td className="db-amount">${order.amount}</td>', '<td className="db-amount">₹{order.amount}</td>');
fs.writeFileSync('frontend/src/pages/Dashboard.jsx', dbContent, 'utf8');

// 2. Results.jsx
let resContent = fs.readFileSync('frontend/src/pages/Results.jsx', 'utf8');
resContent = resContent.replace(
  'Budget <strong>${Number(formData.budget).toFixed(0)}</strong>',
  'Budget <strong>₹{Number(formData.minBudget).toFixed(0)} - ₹{Number(formData.maxBudget).toFixed(0)}</strong>'
);
resContent = resContent.replace(
  '${Number(rec.estimatedCost).toFixed(0)}',
  '₹{Number(rec.estimatedCost).toFixed(0)}'
);
fs.writeFileSync('frontend/src/pages/Results.jsx', resContent, 'utf8');

// 3. DetailPage.jsx
let detContent = fs.readFileSync('frontend/src/pages/DetailPage.jsx', 'utf8');
detContent = detContent.replace(
  "value: order.budget ? `$${order.budget}` : 'N/A' },",
  "value: order.minBudget ? `₹${order.minBudget} - ₹${order.maxBudget}` : 'N/A' },"
);
detContent = detContent.replace(
  "value: `$${order.amount}` },",
  "value: `₹${order.amount}` },"
);
detContent = detContent.replace(
  '<div className="detail-ai-cost">${item.cost}</div>',
  '<div className="detail-ai-cost">₹{item.cost}</div>'
);
fs.writeFileSync('frontend/src/pages/DetailPage.jsx', detContent, 'utf8');

console.log('Frontend components updated!');
