import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { QdrantService } from './qdrant.service';
import { EmbeddingService } from './embedding.service';
import * as cheerio from 'cheerio';
import axios from 'axios';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private qdrantService: QdrantService,
    private embeddingService: EmbeddingService,
  ) {}

  async chat(apiKey: string, message: string, sessionId?: string) {
    // Find project by API key
    const project = await this.prisma.project.findUnique({
      where: { apiKey },
    });

    if (!project) {
      throw new Error('Invalid API key');
    }

    // Get relevant documents using RAG
    const relevantDocuments = await this.getRelevantDocuments(project.id, message);

    // Generate response based on retrieved documents using LLM
    const answer = await this.generateResponse(message, relevantDocuments, project.language);

    // Save chat log
    await this.prisma.chatLog.create({
      data: {
        projectId: project.id,
        question: message,
        answer,
        createdAt: new Date(),
      },
    });

    return { answer, sources: relevantDocuments };
  }

  private async getRelevantDocuments(projectId: string, query: string): Promise<string[]> {
    try {
      // Generate embedding for the query
      const queryEmbedding = await this.embeddingService.generateEmbeddings(query);

      // Search in Qdrant for relevant documents with project filtering
      const searchResults = await this.qdrantService.search(queryEmbedding, projectId);

      // Extract content directly from Qdrant payload to avoid redundant HTML parsing
      const documentContents: string[] = [];
      for (const result of searchResults) {
        // Use the content field from the Qdrant payload which was already cleaned
        if (result.payload && result.payload.content) {
          documentContents.push(result.payload.content as string);
        }
      }

      return documentContents;
    } catch (error) {
      console.error('Error retrieving relevant documents:', error);
      return [];
    }
  }

  private async generateResponse(question: string, context: string[], language: string): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    // Determine response language based on the project language or question language
    const responseLanguage = this.detectLanguage(question) === 'am' || language === 'am' ? 'Amharic' : 'English';

    // Prepare context for the LLM
    const contextText = context.length > 0
      ? context.join('\n---\n')
      : "No relevant information found in the documents.";

    // Create the system prompt to enforce language adherence
    const systemPrompt = `You are a helpful assistant. Identify the language of the user's input. If it is Amharic (even if written in Latin script), respond in Amharic. If in English, answer in English. Always respond in ${responseLanguage}. If the answer is not found in the provided context, say 'I do not have that information' and do not make up an answer. Only use information from the provided context.`;

    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4o', // Using a robust multilingual model
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Context: ${contextText}\n\nQuestion: ${question}\n\nPlease answer the question based on the context provided.` }
          ],
          max_tokens: 500,
          temperature: 0.3,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          },
        }
      );

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error generating response with LLM:', error);
      // Fallback response if LLM call fails
      if (context.length > 0) {
        return `Based on the provided information: ${context[0].substring(0, 500)}...`;
      } else {
        return "I couldn't find any relevant information to answer your question.";
      }
    }
  }

  private detectLanguage(text: string): 'am' | 'en' {
    // Check for actual Amharic script characters (Ge'ez script)
    const amharicScriptRegex = /[\u1200-\u137F]/;
    if (amharicScriptRegex.test(text)) {
      return 'am';
    }

    // Enhanced detection for transliterated Amharic (Amharic written phonetically in Latin script)
    // This includes common Amharic words/phrases written in Latin characters
    const transliteratedAmharicPatterns = [
      /(?:\b|_)selam(?:\b|_)/i,      // Hello
      /(?:\b|_)tena(?:\b|_)/i,       // How
      /(?:\b|_)merhab(?:\b|_)/i,     // Hello (informal)
      /(?:\b|_)bahil(?:\b|_)/i,      // Goodbye
      /(?:\b|_)debeb(?:\b|_)/i,      // Don't know
      /(?:\b|_)nigus(?:\b|_)/i,      // King
      /(?:\b|_)ast(i|e)(?:\b|_)/i,   // Person
      /(?:\b|_)bet(?:\b|_)/i,        // House
      /(?:\b|_)(?:ye|e|a|i|u|o)(?:\b|_)/, // Common Amharic grammatical particles
    ];

    for (const pattern of transliteratedAmharicPatterns) {
      if (pattern.test(text)) {
        return 'am';
      }
    }

    // If no Amharic patterns detected, default to English
    return 'en';
  }

  async getProjectByApiKey(apiKey: string) {
    return await this.prisma.project.findUnique({
      where: { apiKey },
    });
  }
}