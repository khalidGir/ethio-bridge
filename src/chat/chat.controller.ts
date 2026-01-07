import { Controller, Post, Body, Get, Query, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';

@Controller()
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Throttle({ default: { limit: 30, ttl: 60 } }) // Allow 30 requests per minute for chat endpoint
  @Post('chat')
  async chat(
    @Headers('x-api-key') apiKey: string,
    @Body() chatDto: { message: string; sessionId?: string }
  ) {
    return this.chatService.chat(apiKey, chatDto.message, chatDto.sessionId);
  }

  @Throttle({ default: { limit: 100, ttl: 60 } }) // Allow 100 requests per minute for config endpoint
  @Get('widget/config')
  async getWidgetConfig(@Query('key') apiKey: string) {
    const project = await this.chatService.getProjectByApiKey(apiKey);
    if (!project) {
      throw new Error('Invalid API key');
    }

    return {
      projectId: project.id,
      name: project.name,
      language: project.language,
    };
  }
}