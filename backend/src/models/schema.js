/**
 * Database Schema – Table creation and seed data.
 *
 * All SQL is written to be PostgreSQL-compatible (uses standard SQL types).
 * SQLite silently accepts the type hints and stores data flexibly.
 */

const { getDb } = require('../config/database');

/**
 * Create all tables if they don't already exist.
 */
function createTables() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL DEFAULT 'Guest',
      email         TEXT,
      phone         TEXT,
      created_at    DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recipients (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id   INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      name          TEXT    DEFAULT 'Unnamed Recipient',
      relation      TEXT    NOT NULL,
      age           INTEGER NOT NULL CHECK (age >= 1 AND age <= 120),
      preferences   TEXT,
      created_at    DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gift_products (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT    NOT NULL,
      description   TEXT,
      category      TEXT,
      price         REAL    NOT NULL CHECK (price > 0),
      min_age       INTEGER DEFAULT 1,
      max_age       INTEGER DEFAULT 120,
      tags          TEXT,
      product_url   TEXT,
      image_emoji   TEXT    DEFAULT '🎁',
      rating        REAL    DEFAULT 4.5,
      is_active     BOOLEAN DEFAULT 1,
      created_at    DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id      TEXT    UNIQUE NOT NULL,
      customer_id   INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      recipient_id  INTEGER NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
      occasion      TEXT    NOT NULL,
      min_budget    REAL    NOT NULL CHECK (min_budget > 0),
      max_budget    REAL    NOT NULL CHECK (max_budget >= min_budget),
      status        TEXT    NOT NULL DEFAULT 'Pending'
                      CHECK (status IN ('Pending', 'Processing', 'Delivered', 'Cancelled')),
      priority      BOOLEAN DEFAULT 0,
      owner         TEXT    DEFAULT 'Unassigned',
      notes         TEXT,
      created_at    DATETIME DEFAULT (datetime('now')),
      updated_at    DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recommendation_items (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      recommendation_id   INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
      gift_product_id     INTEGER REFERENCES gift_products(id),
      title               TEXT    NOT NULL,
      description         TEXT,
      estimated_cost      REAL,
      emotional_fit       TEXT,
      next_steps          TEXT,
      rank                INTEGER DEFAULT 1,
      created_at          DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS recommendation_history (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      recommendation_id   INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
      action              TEXT    NOT NULL,
      actor               TEXT    DEFAULT 'System',
      timestamp           DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      recommendation_id   INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
      message_type        TEXT    DEFAULT 'greeting',
      content             TEXT    NOT NULL,
      created_at          DATETIME DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS important_dates (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id   INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      label         TEXT    NOT NULL,
      date_value    TEXT    NOT NULL,
      notes         TEXT,
      created_at    DATETIME DEFAULT (datetime('now'))
    );
  `);

  // Create indexes for common queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_recommendations_status   ON recommendations(status);
    CREATE INDEX IF NOT EXISTS idx_recommendations_order_id ON recommendations(order_id);
    CREATE INDEX IF NOT EXISTS idx_recommendation_items_rec ON recommendation_items(recommendation_id);
    CREATE INDEX IF NOT EXISTS idx_recommendation_history_rec ON recommendation_history(recommendation_id);
  `);
}

/**
 * Seed the gift_products catalogue with a diverse set of products.
 * Only seeds if the table is empty (idempotent).
 */
function seedProducts() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM gift_products').get();
  if (count.c > 0) return; // Already seeded

  const insert = db.prepare(`
    INSERT INTO gift_products (title, description, category, price, min_age, max_age, tags, product_url, image_emoji, rating)
    VALUES (@title, @description, @category, @price, @min_age, @max_age, @tags, @product_url, @image_emoji, @rating)
  `);

  const products = [
    // Technology
    { title: 'Premium Wireless Earbuds', description: 'High-fidelity sound with active noise cancellation. Perfect for music lovers and commuters.', category: 'Technology', price: 10320, min_age: 12, max_age: 65, tags: 'tech,music,audio,wireless,popular', product_url: 'https://www.amazon.com', image_emoji: '🎧', rating: 4.6 },
    { title: 'Smart Watch Series 9', description: 'Health tracking, notifications, and seamless phone integration on your wrist.', category: 'Technology', price: 25600, min_age: 16, max_age: 60, tags: 'tech,fitness,health,wearable,premium', product_url: 'https://www.amazon.com', image_emoji: '⌚', rating: 4.7 },
    { title: 'Portable Bluetooth Speaker', description: 'Waterproof, rugged speaker with 360-degree sound. Great for outdoor adventures.', category: 'Technology', price: 6320, min_age: 14, max_age: 55, tags: 'tech,music,outdoor,portable,speaker', product_url: 'https://www.amazon.com', image_emoji: '🔊', rating: 4.5 },
    { title: 'E-Reader Tablet', description: 'Glare-free display, weeks of battery life, and access to millions of books.', category: 'Technology', price: 11200, min_age: 10, max_age: 90, tags: 'tech,reading,books,digital,kindle', product_url: 'https://www.amazon.com', image_emoji: '📱', rating: 4.8 },
    { title: 'Wireless Charging Pad', description: 'Sleek fast-charge pad compatible with all Qi-enabled devices.', category: 'Technology', price: 2800, min_age: 15, max_age: 65, tags: 'tech,accessory,charging,gadget', product_url: 'https://www.amazon.com', image_emoji: '🔋', rating: 4.3 },

    // Lifestyle
    { title: 'Personalised Leather Journal', description: 'Hand-crafted full-grain leather journal with monogram option. Timeless and elegant.', category: 'Lifestyle', price: 3600, min_age: 14, max_age: 80, tags: 'lifestyle,writing,personal,handcrafted,creative,journal', product_url: 'https://www.amazon.com', image_emoji: '📓', rating: 4.8 },
    { title: 'Scented Candle Collection', description: 'Set of 3 luxury soy candles in calming fragrances: lavender, vanilla, and cedarwood.', category: 'Lifestyle', price: 3360, min_age: 18, max_age: 80, tags: 'lifestyle,home,relaxation,candle,cozy', product_url: 'https://www.amazon.com', image_emoji: '🕯️', rating: 4.6 },
    { title: 'Premium Yoga Mat', description: 'Non-slip, eco-friendly yoga mat with alignment guides. Perfect for fitness enthusiasts.', category: 'Lifestyle', price: 5440, min_age: 16, max_age: 70, tags: 'lifestyle,fitness,yoga,wellness,exercise', product_url: 'https://www.amazon.com', image_emoji: '🧘', rating: 4.7 },
    { title: 'Luxury Bathrobe', description: 'Ultra-soft Turkish cotton bathrobe. Pure comfort for lazy weekends.', category: 'Lifestyle', price: 6800, min_age: 18, max_age: 90, tags: 'lifestyle,comfort,luxury,spa,relaxation', product_url: 'https://www.amazon.com', image_emoji: '🛁', rating: 4.9 },

    // Food & Drink
    { title: 'Artisan Coffee Experience Set', description: 'Curated single-origin coffees with a beautiful pour-over kit. For the discerning coffee lover.', category: 'Food & Drink', price: 5200, min_age: 18, max_age: 80, tags: 'food,coffee,artisan,gourmet,experience', product_url: 'https://www.amazon.com', image_emoji: '☕', rating: 4.9 },
    { title: 'Gourmet Chocolate Box', description: 'Handcrafted Belgian chocolates in an elegant gift box. 24 pieces of pure indulgence.', category: 'Food & Drink', price: 3040, min_age: 8, max_age: 90, tags: 'food,chocolate,gourmet,sweet,treat,belgian', product_url: 'https://www.amazon.com', image_emoji: '🍫', rating: 4.8 },
    { title: 'Premium Tea Sampler', description: 'Collection of 12 rare loose-leaf teas from around the world with infuser.', category: 'Food & Drink', price: 3840, min_age: 14, max_age: 90, tags: 'food,tea,sampler,relaxation,wellness', product_url: 'https://www.amazon.com', image_emoji: '🍵', rating: 4.6 },
    { title: 'BBQ Spice Collection', description: 'Set of 8 gourmet rubs and seasonings for the grillmaster. Smoky, spicy, and savoury.', category: 'Food & Drink', price: 2800, min_age: 20, max_age: 70, tags: 'food,cooking,bbq,grilling,spice,outdoor', product_url: 'https://www.amazon.com', image_emoji: '🌶️', rating: 4.5 },

    // Experience
    { title: 'Online Masterclass Subscription', description: 'Unlimited access to world-class instructors in cooking, music, writing, and more.', category: 'Experience', price: 7200, min_age: 14, max_age: 70, tags: 'experience,learning,education,subscription,digital,creative', product_url: 'https://www.masterclass.com', image_emoji: '🎓', rating: 4.7 },
    { title: 'Luxury Spa Day Voucher', description: 'Full-day spa experience including massage, facial, and gourmet lunch.', category: 'Experience', price: 12000, min_age: 18, max_age: 80, tags: 'experience,spa,relaxation,luxury,wellness,pampering', product_url: 'https://www.amazon.com', image_emoji: '💆', rating: 4.9 },
    { title: 'Cooking Class Experience', description: 'Hands-on cooking class with a professional chef. Choose from Italian, Thai, or French cuisine.', category: 'Experience', price: 6000, min_age: 14, max_age: 75, tags: 'experience,cooking,food,class,learning,culinary', product_url: 'https://www.amazon.com', image_emoji: '👨‍🍳', rating: 4.7 },
    { title: 'Wine Tasting Tour', description: 'Guided tour of three premium vineyards with food pairings. A memorable day out.', category: 'Experience', price: 8800, min_age: 21, max_age: 75, tags: 'experience,wine,tasting,tour,premium,outdoor', product_url: 'https://www.amazon.com', image_emoji: '🍷', rating: 4.8 },

    // Home & Garden
    { title: 'Indoor Herb Garden Kit', description: 'Self-watering smart planter with basil, mint, and cilantro seed pods. Grow herbs year-round.', category: 'Home & Garden', price: 4400, min_age: 14, max_age: 80, tags: 'home,garden,plants,cooking,indoor,sustainable', product_url: 'https://www.amazon.com', image_emoji: '🌿', rating: 4.6 },
    { title: 'Illustrated City Map Print', description: 'Custom illustrated map of any city. Beautiful wall art with a personal touch.', category: 'Home & Garden', price: 2800, min_age: 18, max_age: 80, tags: 'home,art,decor,personalised,map,wall', product_url: 'https://www.amazon.com', image_emoji: '🗺️', rating: 4.5 },
    { title: 'Luxury Throw Blanket', description: 'Ultra-soft merino wool throw in neutral tones. The perfect couch companion.', category: 'Home & Garden', price: 6240, min_age: 18, max_age: 90, tags: 'home,comfort,blanket,cozy,luxury,winter', product_url: 'https://www.amazon.com', image_emoji: '🧣', rating: 4.7 },

    // Jewellery & Accessories
    { title: 'Minimalist Silver Necklace', description: 'Delicate sterling silver pendant on a fine chain. Timeless and versatile.', category: 'Jewellery', price: 5200, min_age: 16, max_age: 70, tags: 'jewellery,silver,necklace,elegant,gift,accessory', product_url: 'https://www.amazon.com', image_emoji: '📿', rating: 4.8 },
    { title: 'Leather Wallet', description: 'Slim RFID-blocking leather wallet with card slots and money clip. Sleek and functional.', category: 'Accessories', price: 4400, min_age: 18, max_age: 75, tags: 'accessory,leather,wallet,practical,everyday,professional', product_url: 'https://www.amazon.com', image_emoji: '👛', rating: 4.6 },
    { title: 'Silk Scarf', description: 'Hand-printed 100% silk scarf in vibrant botanical patterns. A statement accessory.', category: 'Accessories', price: 5760, min_age: 20, max_age: 80, tags: 'accessory,silk,scarf,fashion,elegant,pattern', product_url: 'https://www.amazon.com', image_emoji: '🧣', rating: 4.7 },

    // Kids & Teens
    { title: 'LEGO Architecture Set', description: 'Build iconic world landmarks with this detailed architecture set. Ages 12+.', category: 'Kids & Teens', price: 4000, min_age: 8, max_age: 16, tags: 'kids,lego,building,creative,architecture,toy', product_url: 'https://www.amazon.com', image_emoji: '🧱', rating: 4.9 },
    { title: 'Art Supply Kit', description: 'Professional-grade art set with pencils, pastels, watercolours, and sketchbook.', category: 'Kids & Teens', price: 3200, min_age: 6, max_age: 25, tags: 'kids,art,creative,drawing,painting,supplies', product_url: 'https://www.amazon.com', image_emoji: '🎨', rating: 4.7 },
    { title: 'Science Experiment Kit', description: 'Over 30 fun experiments covering chemistry, physics, and biology. Educational and exciting.', category: 'Kids & Teens', price: 2560, min_age: 6, max_age: 14, tags: 'kids,science,education,experiment,stem,fun', product_url: 'https://www.amazon.com', image_emoji: '🔬', rating: 4.6 },

    // Sports & Outdoors
    { title: 'Insulated Hiking Backpack', description: 'Lightweight 30L backpack with hydration compartment and rain cover.', category: 'Sports & Outdoors', price: 7120, min_age: 14, max_age: 60, tags: 'outdoor,hiking,backpack,travel,adventure,nature', product_url: 'https://www.amazon.com', image_emoji: '🎒', rating: 4.7 },
    { title: 'Smart Water Bottle', description: 'Temperature-tracking insulated bottle that reminds you to stay hydrated.', category: 'Sports & Outdoors', price: 3600, min_age: 12, max_age: 65, tags: 'outdoor,fitness,hydration,smart,health,tech', product_url: 'https://www.amazon.com', image_emoji: '🧊', rating: 4.5 },
    { title: 'Camping Hammock', description: 'Ultralight portable hammock with mosquito net. Sets up in 60 seconds.', category: 'Sports & Outdoors', price: 4400, min_age: 14, max_age: 55, tags: 'outdoor,camping,hammock,adventure,nature,portable', product_url: 'https://www.amazon.com', image_emoji: '🏕️', rating: 4.6 },

    // Books & Stationery
    { title: 'Bestseller Book Box', description: 'Curated box of 3 bestselling books based on your interests. Surprise selection each time.', category: 'Books & Stationery', price: 3200, min_age: 14, max_age: 90, tags: 'books,reading,literature,subscription,curated', product_url: 'https://www.amazon.com', image_emoji: '📚', rating: 4.7 },
    { title: 'Fountain Pen Set', description: 'Elegant fountain pen with converter and ink set. For the person who appreciates the art of writing.', category: 'Books & Stationery', price: 4640, min_age: 16, max_age: 80, tags: 'stationery,writing,pen,fountain,elegant,professional', product_url: 'https://www.amazon.com', image_emoji: '🖋️', rating: 4.8 },
  ];

  const insertMany = db.transaction((items) => {
    for (const item of items) {
      insert.run(item);
    }
  });

  insertMany(products);
  console.log(`  ✓ Seeded ${products.length} gift products into catalogue.`);
}

/**
 * Seed some demo recommendation records for the dashboard.
 */
function seedDemoOrders() {
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM recommendations').get();
  if (count.c > 0) return;

  // Create a demo customer
  const custResult = db.prepare(`INSERT INTO customers (name, email) VALUES ('Demo User', 'demo@paperplane.io')`).run();
  const customerId = custResult.lastInsertRowid;

  const demoOrders = [
    { name: 'Emma Clarke', relation: 'Friend', age: 28, prefs: 'Loves vintage aesthetics, journaling, and coffee shops', occasion: 'Birthday', min_budget: 1000, max_budget: 5000, status: 'Delivered', owner: 'John Smith', priority: 0, notes: 'Emma loves vintage aesthetics. Monogram her initials on the cover.', date: '2026-06-10' },
    { name: 'Liam Johnson', relation: 'Partner/Spouse', age: 35, prefs: 'Jazz music, daily commuter, tech enthusiast', occasion: 'Anniversary', min_budget: 5000, max_budget: 15000, status: 'Processing', owner: 'Sarah Lee', priority: 1, notes: 'He commutes daily and listens to jazz. ANC is a must.', date: '2026-06-13' },
    { name: 'Priya Mehta', relation: 'Colleague', age: 32, prefs: 'Light roast coffee, mindfulness, yoga', occasion: 'Thank You', min_budget: 2000, max_budget: 8000, status: 'Pending', owner: 'Raj Patel', priority: 0, notes: 'She prefers light roasts. Add a handwritten thank-you card.', date: '2026-06-14' },
    { name: 'Tom Baker', relation: 'Child', age: 22, prefs: 'Film, guitar, creative writing', occasion: 'Graduation', min_budget: 5000, max_budget: 10000, status: 'Cancelled', owner: 'Maria Garcia', priority: 0, notes: 'Tom decided he wanted a physical gift instead.', date: '2026-06-08' },
    { name: 'Olivia White', relation: 'Parent', age: 58, prefs: 'Gardening, spa, relaxation, cooking', occasion: "Mother's Day", min_budget: 10000, max_budget: 20000, status: 'Pending', owner: 'Chris Brown', priority: 1, notes: "HIGH PRIORITY - Same-day delivery required for the physical voucher.", date: '2026-06-14' },
    { name: 'Noah Davis', relation: 'Sibling', age: 26, prefs: 'Fitness, running, smartwatch apps', occasion: 'Birthday', min_budget: 20000, max_budget: 40000, status: 'Processing', owner: 'John Smith', priority: 0, notes: 'Noah is into fitness tracking. Ensure the watch supports third-party apps.', date: '2026-06-12' },
    { name: 'Amelia Wilson', relation: 'Boss', age: 45, prefs: 'Vegetarian, fine dining, elegant gifts', occasion: 'Christmas', min_budget: 1000, max_budget: 5000, status: 'Delivered', owner: 'Sarah Lee', priority: 0, notes: 'She is vegetarian. Confirmed the chocolates contain no gelatin.', date: '2026-05-28' },
  ];

  const insertRecipient = db.prepare(`INSERT INTO recipients (customer_id, name, relation, age, preferences) VALUES (?, ?, ?, ?, ?)`);
  const insertRec = db.prepare(`INSERT INTO recommendations (order_id, customer_id, recipient_id, occasion, min_budget, max_budget, status, priority, owner, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const insertHistory = db.prepare(`INSERT INTO recommendation_history (recommendation_id, action, actor, timestamp) VALUES (?, ?, ?, ?)`);

  const seedAll = db.transaction(() => {
    demoOrders.forEach((o, i) => {
      const recipientResult = insertRecipient.run(customerId, o.name, o.relation, o.age, o.prefs);
      const recipientId = recipientResult.lastInsertRowid;

      const orderId = `ORD-${String(i + 1).padStart(3, '0')}`;
      const recResult = insertRec.run(orderId, customerId, recipientId, o.occasion, o.min_budget, o.max_budget, o.status, o.priority, o.owner, o.notes, o.date, o.date);
      const recId = recResult.lastInsertRowid;

      insertHistory.run(recId, 'Order created via AI recommendation.', 'System', o.date + ' 09:00');

      if (o.status === 'Processing' || o.status === 'Delivered') {
        insertHistory.run(recId, `Status updated: Pending to Processing.`, o.owner, o.date + ' 10:00');
      }
      if (o.status === 'Delivered') {
        insertHistory.run(recId, `Status updated: Processing to Delivered.`, o.owner, o.date + ' 14:00');
      }
      if (o.status === 'Cancelled') {
        insertHistory.run(recId, `Status updated: Pending to Cancelled. Customer preference.`, o.owner, o.date + ' 14:00');
      }
    });
  });

  seedAll();
  console.log(`  ✓ Seeded ${demoOrders.length} demo orders with history.`);
}

/**
 * Run full database initialization: create tables, seed products, seed demo data.
 */
function initializeDatabase() {
  console.log('📦 Initializing database...');
  createTables();
  seedProducts();
  // seedDemoOrders(); // Removed for deployment
  console.log('✅ Database ready.\n');
}

module.exports = { initializeDatabase, createTables, seedProducts, seedDemoOrders };
