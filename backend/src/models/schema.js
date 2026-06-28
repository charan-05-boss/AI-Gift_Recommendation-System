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
async function createTables() {
  const db = getDb();

  await db.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id            SERIAL PRIMARY KEY,
      name          TEXT    NOT NULL DEFAULT 'Guest',
      email         TEXT,
      phone         TEXT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recipients (
      id            SERIAL PRIMARY KEY,
      customer_id   INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      name          TEXT    DEFAULT 'Unnamed Recipient',
      relation      TEXT    NOT NULL,
      age           INTEGER NOT NULL CHECK (age >= 1 AND age <= 120),
      preferences   TEXT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gift_products (
      id            SERIAL PRIMARY KEY,
      title         TEXT    NOT NULL,
      description   TEXT,
      category      TEXT,
      price         NUMERIC NOT NULL CHECK (price > 0),
      min_age       INTEGER DEFAULT 1,
      max_age       INTEGER DEFAULT 120,
      tags          TEXT,
      product_url   TEXT,
      image_emoji   TEXT    DEFAULT '🎁',
      rating        NUMERIC DEFAULT 4.5,
      is_active     BOOLEAN DEFAULT TRUE,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recommendations (
      id            SERIAL PRIMARY KEY,
      order_id      TEXT    UNIQUE NOT NULL,
      customer_id   INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      recipient_id  INTEGER NOT NULL REFERENCES recipients(id) ON DELETE CASCADE,
      occasion      TEXT    NOT NULL,
      min_budget    NUMERIC NOT NULL CHECK (min_budget > 0),
      max_budget    NUMERIC NOT NULL CHECK (max_budget >= min_budget),
      status        TEXT    NOT NULL DEFAULT 'Pending'
                      CHECK (status IN ('Pending', 'Processing', 'Delivered', 'Cancelled')),
      priority      BOOLEAN DEFAULT FALSE,
      owner         TEXT    DEFAULT 'Unassigned',
      notes         TEXT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recommendation_items (
      id                  SERIAL PRIMARY KEY,
      recommendation_id   INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
      gift_product_id     INTEGER REFERENCES gift_products(id),
      title               TEXT    NOT NULL,
      description         TEXT,
      estimated_cost      NUMERIC,
      emotional_fit       TEXT,
      next_steps          TEXT,
      rank                INTEGER DEFAULT 1,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS recommendation_history (
      id                  SERIAL PRIMARY KEY,
      recommendation_id   INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
      action              TEXT    NOT NULL,
      actor               TEXT    DEFAULT 'System',
      timestamp           TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id                  SERIAL PRIMARY KEY,
      recommendation_id   INTEGER NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
      message_type        TEXT    DEFAULT 'greeting',
      content             TEXT    NOT NULL,
      created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS important_dates (
      id            SERIAL PRIMARY KEY,
      customer_id   INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      label         TEXT    NOT NULL,
      date_value    TEXT    NOT NULL,
      notes         TEXT,
      created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create indexes for common queries
  await db.query(`
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
async function seedProducts() {
  const db = getDb();
  const countRes = await db.query('SELECT COUNT(*) as c FROM gift_products');
  if (parseInt(countRes.rows[0].c) > 0) return; // Already seeded

  const insertQuery = `
    INSERT INTO gift_products (title, description, category, price, min_age, max_age, tags, product_url, image_emoji, rating)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
  `;

  const products = [
    // Technology
    ['Premium Wireless Earbuds', 'High-fidelity sound with active noise cancellation. Perfect for music lovers and commuters.', 'Technology', 10320, 12, 65, 'tech,music,audio,wireless,popular', 'https://www.amazon.com', '🎧', 4.6],
    ['Smart Watch Series 9', 'Health tracking, notifications, and seamless phone integration on your wrist.', 'Technology', 25600, 16, 60, 'tech,fitness,health,wearable,premium', 'https://www.amazon.com', '⌚', 4.7],
    ['Portable Bluetooth Speaker', 'Waterproof, rugged speaker with 360-degree sound. Great for outdoor adventures.', 'Technology', 6320, 14, 55, 'tech,music,outdoor,portable,speaker', 'https://www.amazon.com', '🔊', 4.5],
    ['E-Reader Tablet', 'Glare-free display, weeks of battery life, and access to millions of books.', 'Technology', 11200, 10, 90, 'tech,reading,books,digital,kindle', 'https://www.amazon.com', '📱', 4.8],
    ['Wireless Charging Pad', 'Sleek fast-charge pad compatible with all Qi-enabled devices.', 'Technology', 2800, 15, 65, 'tech,accessory,charging,gadget', 'https://www.amazon.com', '🔋', 4.3],

    // Lifestyle
    ['Personalised Leather Journal', 'Hand-crafted full-grain leather journal with monogram option. Timeless and elegant.', 'Lifestyle', 3600, 14, 80, 'lifestyle,writing,personal,handcrafted,creative,journal', 'https://www.amazon.com', '📓', 4.8],
    ['Scented Candle Collection', 'Set of 3 luxury soy candles in calming fragrances: lavender, vanilla, and cedarwood.', 'Lifestyle', 3360, 18, 80, 'lifestyle,home,relaxation,candle,cozy', 'https://www.amazon.com', '🕯️', 4.6],
    ['Premium Yoga Mat', 'Non-slip, eco-friendly yoga mat with alignment guides. Perfect for fitness enthusiasts.', 'Lifestyle', 5440, 16, 70, 'lifestyle,fitness,yoga,wellness,exercise', 'https://www.amazon.com', '🧘', 4.7],
    ['Luxury Bathrobe', 'Ultra-soft Turkish cotton bathrobe. Pure comfort for lazy weekends.', 'Lifestyle', 6800, 18, 90, 'lifestyle,comfort,luxury,spa,relaxation', 'https://www.amazon.com', '🛁', 4.9],

    // Food & Drink
    ['Artisan Coffee Experience Set', 'Curated single-origin coffees with a beautiful pour-over kit. For the discerning coffee lover.', 'Food & Drink', 5200, 18, 80, 'food,coffee,artisan,gourmet,experience', 'https://www.amazon.com', '☕', 4.9],
    ['Gourmet Chocolate Box', 'Handcrafted Belgian chocolates in an elegant gift box. 24 pieces of pure indulgence.', 'Food & Drink', 3040, 8, 90, 'food,chocolate,gourmet,sweet,treat,belgian', 'https://www.amazon.com', '🍫', 4.8],
    ['Premium Tea Sampler', 'Collection of 12 rare loose-leaf teas from around the world with infuser.', 'Food & Drink', 3840, 14, 90, 'food,tea,sampler,relaxation,wellness', 'https://www.amazon.com', '🍵', 4.6],
    ['BBQ Spice Collection', 'Set of 8 gourmet rubs and seasonings for the grillmaster. Smoky, spicy, and savoury.', 'Food & Drink', 2800, 20, 70, 'food,cooking,bbq,grilling,spice,outdoor', 'https://www.amazon.com', '🌶️', 4.5],

    // Experience
    ['Online Masterclass Subscription', 'Unlimited access to world-class instructors in cooking, music, writing, and more.', 'Experience', 7200, 14, 70, 'experience,learning,education,subscription,digital,creative', 'https://www.masterclass.com', '🎓', 4.7],
    ['Luxury Spa Day Voucher', 'Full-day spa experience including massage, facial, and gourmet lunch.', 'Experience', 12000, 18, 80, 'experience,spa,relaxation,luxury,wellness,pampering', 'https://www.amazon.com', '💆', 4.9],
    ['Cooking Class Experience', 'Hands-on cooking class with a professional chef. Choose from Italian, Thai, or French cuisine.', 'Experience', 6000, 14, 75, 'experience,cooking,food,class,learning,culinary', 'https://www.amazon.com', '👨‍🍳', 4.7],
    ['Wine Tasting Tour', 'Guided tour of three premium vineyards with food pairings. A memorable day out.', 'Experience', 8800, 21, 75, 'experience,wine,tasting,tour,premium,outdoor', 'https://www.amazon.com', '🍷', 4.8],

    // Home & Garden
    ['Indoor Herb Garden Kit', 'Self-watering smart planter with basil, mint, and cilantro seed pods. Grow herbs year-round.', 'Home & Garden', 4400, 14, 80, 'home,garden,plants,cooking,indoor,sustainable', 'https://www.amazon.com', '🌿', 4.6],
    ['Illustrated City Map Print', 'Custom illustrated map of any city. Beautiful wall art with a personal touch.', 'Home & Garden', 2800, 18, 80, 'home,art,decor,personalised,map,wall', 'https://www.amazon.com', '🗺️', 4.5],
    ['Luxury Throw Blanket', 'Ultra-soft merino wool throw in neutral tones. The perfect couch companion.', 'Home & Garden', 6240, 18, 90, 'home,comfort,blanket,cozy,luxury,winter', 'https://www.amazon.com', '🧣', 4.7],

    // Jewellery & Accessories
    ['Minimalist Silver Necklace', 'Delicate sterling silver pendant on a fine chain. Timeless and versatile.', 'Jewellery', 5200, 16, 70, 'jewellery,silver,necklace,elegant,gift,accessory', 'https://www.amazon.com', '📿', 4.8],
    ['Leather Wallet', 'Slim RFID-blocking leather wallet with card slots and money clip. Sleek and functional.', 'Accessories', 4400, 18, 75, 'accessory,leather,wallet,practical,everyday,professional', 'https://www.amazon.com', '👛', 4.6],
    ['Silk Scarf', 'Hand-printed 100% silk scarf in vibrant botanical patterns. A statement accessory.', 'Accessories', 5760, 20, 80, 'accessory,silk,scarf,fashion,elegant,pattern', 'https://www.amazon.com', '🧣', 4.7],

    // Kids & Teens
    ['LEGO Architecture Set', 'Build iconic world landmarks with this detailed architecture set. Ages 12+.', 'Kids & Teens', 4000, 8, 16, 'kids,lego,building,creative,architecture,toy', 'https://www.amazon.com', '🧱', 4.9],
    ['Art Supply Kit', 'Professional-grade art set with pencils, pastels, watercolours, and sketchbook.', 'Kids & Teens', 3200, 6, 25, 'kids,art,creative,drawing,painting,supplies', 'https://www.amazon.com', '🎨', 4.7],
    ['Science Experiment Kit', 'Over 30 fun experiments covering chemistry, physics, and biology. Educational and exciting.', 'Kids & Teens', 2560, 6, 14, 'kids,science,education,experiment,stem,fun', 'https://www.amazon.com', '🔬', 4.6],

    // Sports & Outdoors
    ['Insulated Hiking Backpack', 'Lightweight 30L backpack with hydration compartment and rain cover.', 'Sports & Outdoors', 7120, 14, 60, 'outdoor,hiking,backpack,travel,adventure,nature', 'https://www.amazon.com', '🎒', 4.7],
    ['Smart Water Bottle', 'Temperature-tracking insulated bottle that reminds you to stay hydrated.', 'Sports & Outdoors', 3600, 12, 65, 'outdoor,fitness,hydration,smart,health,tech', 'https://www.amazon.com', '🧊', 4.5],
    ['Camping Hammock', 'Ultralight portable hammock with mosquito net. Sets up in 60 seconds.', 'Sports & Outdoors', 4400, 14, 55, 'outdoor,camping,hammock,adventure,nature,portable', 'https://www.amazon.com', '🏕️', 4.6],

    // Books & Stationery
    ['Bestseller Book Box', 'Curated box of 3 bestselling books based on your interests. Surprise selection each time.', 'Books & Stationery', 3200, 14, 90, 'books,reading,literature,subscription,curated', 'https://www.amazon.com', '📚', 4.7],
    ['Fountain Pen Set', 'Elegant fountain pen with converter and ink set. For the person who appreciates the art of writing.', 'Books & Stationery', 4640, 16, 80, 'stationery,writing,pen,fountain,elegant,professional', 'https://www.amazon.com', '🖋️', 4.8],
  ];

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    for (const item of products) {
      await client.query(insertQuery, item);
    }
    await client.query('COMMIT');
    console.log(`  ✓ Seeded ${products.length} gift products into catalogue.`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Seed some demo recommendation records for the dashboard.
 */
async function seedDemoOrders() {
  const db = getDb();
  const countRes = await db.query('SELECT COUNT(*) as c FROM recommendations');
  if (parseInt(countRes.rows[0].c) > 0) return;

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    const custResult = await client.query(`INSERT INTO customers (name, email) VALUES ($1, $2) RETURNING id`, ['Demo User', 'demo@paperplane.io']);
    const customerId = custResult.rows[0].id;

    const demoOrders = [
      { name: 'Emma Clarke', relation: 'Friend', age: 28, prefs: 'Loves vintage aesthetics, journaling, and coffee shops', occasion: 'Birthday', min_budget: 1000, max_budget: 5000, status: 'Delivered', owner: 'John Smith', priority: false, notes: 'Emma loves vintage aesthetics. Monogram her initials on the cover.', date: '2026-06-10' },
      { name: 'Liam Johnson', relation: 'Partner/Spouse', age: 35, prefs: 'Jazz music, daily commuter, tech enthusiast', occasion: 'Anniversary', min_budget: 5000, max_budget: 15000, status: 'Processing', owner: 'Sarah Lee', priority: true, notes: 'He commutes daily and listens to jazz. ANC is a must.', date: '2026-06-13' },
      { name: 'Priya Mehta', relation: 'Colleague', age: 32, prefs: 'Light roast coffee, mindfulness, yoga', occasion: 'Thank You', min_budget: 2000, max_budget: 8000, status: 'Pending', owner: 'Raj Patel', priority: false, notes: 'She prefers light roasts. Add a handwritten thank-you card.', date: '2026-06-14' },
      { name: 'Tom Baker', relation: 'Child', age: 22, prefs: 'Film, guitar, creative writing', occasion: 'Graduation', min_budget: 5000, max_budget: 10000, status: 'Cancelled', owner: 'Maria Garcia', priority: false, notes: 'Tom decided he wanted a physical gift instead.', date: '2026-06-08' },
      { name: 'Olivia White', relation: 'Parent', age: 58, prefs: 'Gardening, spa, relaxation, cooking', occasion: "Mother's Day", min_budget: 10000, max_budget: 20000, status: 'Pending', owner: 'Chris Brown', priority: true, notes: "HIGH PRIORITY - Same-day delivery required for the physical voucher.", date: '2026-06-14' },
      { name: 'Noah Davis', relation: 'Sibling', age: 26, prefs: 'Fitness, running, smartwatch apps', occasion: 'Birthday', min_budget: 20000, max_budget: 40000, status: 'Processing', owner: 'John Smith', priority: false, notes: 'Noah is into fitness tracking. Ensure the watch supports third-party apps.', date: '2026-06-12' },
      { name: 'Amelia Wilson', relation: 'Boss', age: 45, prefs: 'Vegetarian, fine dining, elegant gifts', occasion: 'Christmas', min_budget: 1000, max_budget: 5000, status: 'Delivered', owner: 'Sarah Lee', priority: false, notes: 'She is vegetarian. Confirmed the chocolates contain no gelatin.', date: '2026-05-28' },
    ];

    let i = 0;
    for (const o of demoOrders) {
      const recipientResult = await client.query(
        `INSERT INTO recipients (customer_id, name, relation, age, preferences) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [customerId, o.name, o.relation, o.age, o.prefs]
      );
      const recipientId = recipientResult.rows[0].id;

      const orderId = `ORD-${String(i + 1).padStart(3, '0')}`;
      const recResult = await client.query(
        `INSERT INTO recommendations (order_id, customer_id, recipient_id, occasion, min_budget, max_budget, status, priority, owner, notes, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11) RETURNING id`,
        [orderId, customerId, recipientId, o.occasion, o.min_budget, o.max_budget, o.status, o.priority, o.owner, o.notes, o.date]
      );
      const recId = recResult.rows[0].id;

      await client.query(`INSERT INTO recommendation_history (recommendation_id, action, actor, timestamp) VALUES ($1, $2, $3, $4)`, [recId, 'Order created via AI recommendation.', 'System', o.date + ' 09:00:00']);

      if (o.status === 'Processing' || o.status === 'Delivered') {
        await client.query(`INSERT INTO recommendation_history (recommendation_id, action, actor, timestamp) VALUES ($1, $2, $3, $4)`, [recId, `Status updated: Pending to Processing.`, o.owner, o.date + ' 10:00:00']);
      }
      if (o.status === 'Delivered') {
        await client.query(`INSERT INTO recommendation_history (recommendation_id, action, actor, timestamp) VALUES ($1, $2, $3, $4)`, [recId, `Status updated: Processing to Delivered.`, o.owner, o.date + ' 14:00:00']);
      }
      if (o.status === 'Cancelled') {
        await client.query(`INSERT INTO recommendation_history (recommendation_id, action, actor, timestamp) VALUES ($1, $2, $3, $4)`, [recId, `Status updated: Pending to Cancelled. Customer preference.`, o.owner, o.date + ' 14:00:00']);
      }
      i++;
    }

    await client.query('COMMIT');
    console.log(`  ✓ Seeded ${demoOrders.length} demo orders with history.`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Run full database initialization: create tables, seed products, seed demo data.
 */
async function initializeDatabase() {
  console.log('📦 Initializing database...');
  await createTables();
  await seedProducts();
  // await seedDemoOrders(); // Removed for deployment
  console.log('✅ Database ready.\n');
}

module.exports = { initializeDatabase, createTables, seedProducts, seedDemoOrders };
