require('dotenv').config();
const { pool } = require('./database');

const migrate = async () => {
  const client = await pool.connect();
  try {
    console.log('Running migrations...');

    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email       VARCHAR(255) UNIQUE NOT NULL,
        password    VARCHAR(255) NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // URLs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS urls (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        original_url TEXT NOT NULL,
        short_code  VARCHAR(20) UNIQUE NOT NULL,
        expires_at  TIMESTAMPTZ,
        is_active   BOOLEAN DEFAULT TRUE,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Clicks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS clicks (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        url_id      UUID NOT NULL REFERENCES urls(id) ON DELETE CASCADE,
        ip_address  INET,
        user_agent  TEXT,
        referer     TEXT,
        clicked_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls(short_code);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_urls_user_id ON urls(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_clicks_url_id ON clicks(url_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_clicks_clicked_at ON clicks(clicked_at);`);

    await client.query('COMMIT');
    console.log('Migrations completed successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
};

migrate();
