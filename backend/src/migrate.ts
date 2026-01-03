import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('Connecting to database...');
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  try {
    // Create tables using raw SQL (Drizzle doesn't have built-in migrations for pg)
    await client`
      CREATE TABLE IF NOT EXISTS tenants (
        id VARCHAR(255) PRIMARY KEY,
        business_name VARCHAR(255) NOT NULL,
        brand_color VARCHAR(50),
        telegram_chat_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(255) REFERENCES tenants(id),
        customer_name VARCHAR(255),
        customer_email VARCHAR(255),
        customer_phone VARCHAR(50),
        message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS faqs (
        id SERIAL PRIMARY KEY,
        tenant_id VARCHAR(255) REFERENCES tenants(id),
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        parent_id INTEGER, -- Removed self-reference
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('✅ Database tables created successfully!');
    
    // Insert sample data
    await client`
      INSERT INTO tenants (id, business_name, brand_color) 
      VALUES 
        ('ethio-coffee', 'Ethiopian Coffee Co.', '#8B4513'),
        ('habesha-fashion', 'Habesha Fashion', '#D4AF37'),
        ('travel-ethiopia', 'Travel Ethiopia', '#228B22')
      ON CONFLICT (id) DO NOTHING
    `;

    console.log('✅ Sample businesses inserted!');
    
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();