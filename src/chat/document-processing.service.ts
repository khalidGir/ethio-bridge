import { Injectable } from '@nestjs/common';
import { QdrantService } from './qdrant.service';
import { EmbeddingService } from './embedding.service';
import { PrismaService } from '../prisma/prisma.service';
import * as cheerio from 'cheerio';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

@Injectable()
export class DocumentProcessingService {
  constructor(
    private qdrantService: QdrantService,
    private embeddingService: EmbeddingService,
    private prisma: PrismaService,
  ) {}

  async processDocument(projectId: string, documentId: string, content: string) {
    // Initialize the main collection if it doesn't exist
    await this.qdrantService.initializeCollection();

    // Extract text content from HTML using Readability
    let textContent = content;
    if (content.startsWith('<')) { // If content looks like HTML
      try {
        // Use Readability to extract main content
        const dom = new JSDOM(content);
        const article = new Readability(dom.window.document).parse();
        if (article) {
          textContent = article.textContent || article.content || '';
        } else {
          // Fallback to cheerio if Readability fails
          const $ = cheerio.load(content);
          // Remove common noise elements
          $('script, style, nav, footer, header, aside, .nav, .menu, .advertisement, .ads').remove();
          textContent = $('body').text().trim();
        }
      } catch (error) {
        console.warn(`Failed to parse content with Readability for document ${documentId}:`, error);
        // Fallback to cheerio
        const $ = cheerio.load(content);
        // Remove common noise elements
        $('script, style, nav, footer, header, aside, .nav, .menu, .advertisement, .ads').remove();
        textContent = $('body').text().trim();
      }
    }

    // Generate embeddings for the document content
    const embeddings = await this.embeddingService.generateEmbeddings(textContent);

    // Prepare the vector for Qdrant
    const vectorData = {
      id: documentId,
      vector: embeddings,
      payload: {
        projectId,
        documentId,
        content: textContent.substring(0, 1000), // Store first 1000 chars as payload
        createdAt: new Date().toISOString(),
      },
    };

    // Upsert the vector to Qdrant
    await this.qdrantService.upsertVectors([vectorData]);
  }
}