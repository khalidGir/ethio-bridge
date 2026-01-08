import { Module } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { QdrantService } from './qdrant.service';
import { EmbeddingService } from './embedding.service';
import { DocumentProcessingService } from './document-processing.service';

@Module({
  controllers: [ChatController],
  providers: [
    ChatService,
    QdrantService,
    EmbeddingService,
    DocumentProcessingService,
  ],
  exports: [ChatService, DocumentProcessingService, QdrantService, EmbeddingService],
})
export class ChatModule {}