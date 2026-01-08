# Ethio-Bridge Chat Widget

## What the service does

Ethio-Bridge is a chat widget service that allows users to create projects with API keys, crawl websites to index content, and then chat with that indexed content using AI. The service uses Retrieval Augmented Generation (RAG) to provide contextually relevant responses based on the crawled website content. It supports multi-language functionality (English and Amharic) and includes security measures against common web vulnerabilities.

## How to run locally

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables (see below)
4. Run the application:
   ```bash
   npm run start:dev
   ```

## Environment variables (names only)

- `DATABASE_URL`
- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_NAME`
- `QDRANT_URL`
- `HF_API_TOKEN`
- `PLAYWRIGHT_TIMEOUT`