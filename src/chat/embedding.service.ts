import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class EmbeddingService {
  async generateEmbeddings(text: string): Promise<number[]> {
    const hfApiToken = process.env.HF_API_TOKEN;
    if (!hfApiToken) {
      throw new Error('HF_API_TOKEN is not set');
    }

    try {
      const response = await axios.post(
        'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2',
        { inputs: text },
        {
          headers: {
            'Authorization': `Bearer ${hfApiToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const result = response.data;

      if (!Array.isArray(result) || result.length === 0) {
        throw new Error('Invalid response from Hugging Face API');
      }

      // Hugging Face returns embeddings as [value1, value2, ...] for this model or [[...]]
      // If it's a single input, it usually returns the array directly or a 2D array depending on parameters.
      return Array.isArray(result[0]) ? result[0] : result;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw error;
    }
  }
}