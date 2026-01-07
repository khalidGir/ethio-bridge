import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IngestionService } from './ingestion.service';

@Controller('ingestion')
export class IngestionController {
  constructor(private ingestionService: IngestionService) {}

  @Throttle({ default: { limit: 5, ttl: 3600 } }) // Allow 5 crawl requests per hour (to prevent abuse)
  @Post('crawl')
  async startCrawl(@Body() crawlDto: { projectId: string; websiteUrl: string }) {
    return this.ingestionService.crawlWebsite(crawlDto.projectId, crawlDto.websiteUrl);
  }
}