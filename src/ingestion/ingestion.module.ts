import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { DocumentProcessingService } from '../chat/document-processing.service';
import { QdrantService } from '../chat/qdrant.service';
import { EmbeddingService } from '../chat/embedding.service';
import { UrlValidationService } from '../utils/url-validation.service';

@Module({
  controllers: [IngestionController],
  providers: [
    IngestionService,
    PrismaService,
    DocumentProcessingService,
    QdrantService,
    EmbeddingService,
    UrlValidationService,
  ],
  exports: [IngestionService],
})
export class IngestionModule {}