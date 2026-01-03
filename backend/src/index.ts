// Load environment variables FIRST
import 'dotenv/config';
import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const fastify = Fastify({ logger: true });

// Database connection - use Render's DATABASE_URL
const connectionString = process.env.DATABASE_URL;
console.log('Database connection string length:', connectionString ? connectionString.length : 'not set');

if (!connectionString) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('Please set DATABASE_URL in Render environment variables');
  process.exit(1);
}

const client = postgres(connectionString);
const db = drizzle(client, { schema });

// CORS - Allow frontend
fastify.register(cors, { 
  origin: ['http://localhost:5173', 'https://*.vercel.app', 'https://ethio-bridge.vercel.app'],
  credentials: true 
});

// Health check
fastify.get('/health', async () => {
  try {
    // Test database connection
    await client`SELECT 1`;
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected'
    };
  } catch (error: any) {
    return { 
      status: 'error', 
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message 
    };
  }
});

// Get business configuration
fastify.get('/api/config/:businessId', async (request: any, reply) => {
  const { businessId } = request.params;
  
  try {
    const tenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.id, businessId),
    });

    if (!tenant) {
      return reply.code(404).send({ error: 'Business not found' });
    }

    return {
      id: tenant.id,
      businessName: tenant.businessName,
      brandColor: tenant.brandColor || '#2563eb',
      telegramChatId: tenant.telegramChatId,
    };
  } catch (error: any) {
    console.error('Error fetching config:', error);
    return reply.code(500).send({ error: 'Database error' });
  }
});

// Submit a lead
fastify.post('/api/leads', async (request: any, reply) => {
  try {
    const { businessId, name, email, phone, message } = request.body;
    
    if (!businessId) {
      return reply.code(400).send({ error: 'Business ID is required' });
    }

    const [lead] = await db.insert(schema.leads).values({
      tenantId: businessId,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      message,
    }).returning();

    console.log('📱 New lead received:', {
      businessId,
      name,
      email,
      message: message?.substring(0, 100) + '...',
    });

    return { 
      success: true, 
      leadId: lead.id,
      message: 'Lead submitted successfully' 
    };
  } catch (error: any) {
    console.error('Error saving lead:', error);
    return reply.code(500).send({ error: 'Failed to save lead' });
  }
});

// Get FAQs for a business
fastify.get('/api/faqs/:businessId', async (request: any) => {
  const { businessId } = request.params;
  
  try {
    const faqs = await db.query.faqs.findMany({
      where: (faqs, { eq }) => eq(faqs.tenantId, businessId),
      orderBy: (faqs, { asc }) => [asc(faqs.id)],
    });

    return { faqs };
  } catch (error: any) {
    console.error('Error fetching FAQs:', error);
    return { faqs: [], error: 'Database error' };
  }
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    console.log(`Starting server on port ${port}...`);
    console.log(`Database URL configured: ${!!connectionString}`);
    
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Backend server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();