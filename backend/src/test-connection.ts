import postgres from 'postgres';

async function testConnection() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL environment variable not set');
    console.log('Set it with: export DATABASE_URL=your_postgres_url');
    process.exit(1);
  }

  console.log('🔗 Testing database connection...');
  console.log('Connection string (hidden):', connectionString.substring(0, 30) + '...');

  try {
    const client = postgres(connectionString);
    
    // Test simple query
    const result = await client`SELECT 1 as test`;
    
    console.log('✅ Database connection successful!');
    console.log('Test query result:', result[0]);
    
    await client.end();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();