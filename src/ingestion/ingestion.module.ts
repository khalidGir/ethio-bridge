import { Module } from '@nestjs/common';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { UrlValidationService } from '../utils/url-validation.service';
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    UrlValidationService,
  ],
  exports: [IngestionService],
})
export class IngestionModule {}