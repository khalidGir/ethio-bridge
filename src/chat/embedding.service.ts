import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EmbeddingService {
  private readonly openAIApiKey = process.env.OPENAI_API_KEY;
  private readonly apiUrl = 'https://api.openai.com/v1/embeddings';

  async generateEmbeddings(text: string): Promise<number[]> {
    if (!this.openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not set');
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          input: text,
          model: 'text-embedding-ada-002',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.openAIApiKey}`,
          },
        }
      );

      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  }
}