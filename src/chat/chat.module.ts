import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { QdrantService } from './qdrant.service';
import { EmbeddingService } from './embedding.service';
import { DocumentProcessingService } from './document-processing.service';

@Module({
  controllers: [ChatController],
  providers: [
    ChatService,
    PrismaService,
    QdrantService,
    EmbeddingService,
    DocumentProcessingService,
  ],
  exports: [ChatService],
})
export class ChatModule {}