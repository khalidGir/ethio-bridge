import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Throttle({ default: { limit: 10, ttl: 60 } }) // Allow 10 project creation requests per minute
  @Post()
  async createProject(
    @Body()
    createProjectDto: {
      userId: string;
      name: string;
      language: string;
      websiteUrl: string
    }
  ) {
    return this.projectsService.createProject(
      createProjectDto.userId,
      createProjectDto.name,
      createProjectDto.language,
      createProjectDto.websiteUrl
    );
  }
}