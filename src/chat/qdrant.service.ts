import { Injectable } from '@nestjs/common';
import { QdrantClient } from '@qdrant/js-client-rest';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class QdrantService {
  private client: QdrantClient;
  private readonly COLLECTION_NAME = 'documents';

  constructor(private configService: ConfigService) {
    this.client = new QdrantClient({
      url: this.configService.get<string>('QDRANT_URL'),
    });
  }

  async initializeCollection(vectorSize: number = 1536) {
    try {
      await this.client.createCollection(this.COLLECTION_NAME, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      });
    } catch (error) {
      // Collection might already exist, which is fine
      console.log(`Collection ${this.COLLECTION_NAME} already exists or error creating:`, error);
    }
  }

  async upsertVectors(vectors: Array<{ id: string; vector: number[]; payload: any }>) {
    await this.client.upsert(this.COLLECTION_NAME, {
      points: vectors,
    });
  }

  async search(vector: number[], projectId: string, limit: number = 5) {
    return await this.client.search(this.COLLECTION_NAME, {
      vector,
      limit,
      filter: {
        must: [
          {
            key: 'projectId',
            match: {
              value: projectId,
            },
          },
        ],
      },
    });
  }
}