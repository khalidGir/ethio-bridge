import { Controller, Post, Body, Get, Query, Headers, Res, HttpCode } from '@nestjs/common';
import { Response } from 'express';
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

  @Throttle({ default: { limit: 100, ttl: 60 } }) // Allow 100 requests per minute for embed endpoint
  @Get('widget/embed.js')
  @HttpCode(200)
  async getEmbedScript(
    @Query('key') apiKey: string,
    @Res() res: Response,
  ) {
    const script = await this.chatService.getEmbedScript(apiKey);
    res.setHeader('Content-Type', 'application/javascript');
    res.send(script);
  }

  @Throttle({ default: { limit: 100, ttl: 60 } }) // Allow 100 requests per minute for chat interface endpoint
  @Get('chat-interface')
  @HttpCode(200)
  async getChatInterface(
    @Query('apiKey') apiKey: string,
    @Res() res: Response,
  ) {
    const html = await this.chatService.getChatInterface(apiKey);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}