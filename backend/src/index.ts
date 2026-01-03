import Fastify from 'fastify';
import cors from '@fastify/cors';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const fastify = Fastify({ logger: true });

// Database connection
const connectionString = process.env.DATABASE_URL || 'postgresql://localhost/ethio_bridge';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

// CORS - Allow frontend
fastify.register(cors, { 
  origin: ['http://localhost:5173', 'https://*.vercel.app'],
  credentials: true 
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Get business configuration
fastify.get('/api/config/:businessId', async (request: any, reply) => {
  const { businessId } = request.params;
  
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
  } catch (error) {
    console.error('Error saving lead:', error);
    return reply.code(500).send({ error: 'Failed to save lead' });
  }
});

// Get FAQs for a business
fastify.get('/api/faqs/:businessId', async (request: any) => {
  const { businessId } = request.params;
  
  const faqs = await db.query.faqs.findMany({
    where: (faqs, { eq }) => eq(faqs.tenantId, businessId),
    orderBy: (faqs, { asc }) => [asc(faqs.id)],
  });

  return { faqs };
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Backend server running on port ${port}`);
    console.log(`📊 Health check: http://localhost:${port}/health`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();