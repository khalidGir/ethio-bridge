import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async createProject(userId: string, name: string, language: string, websiteUrl: string) {
    const apiKey = uuidv4(); // Generate a unique API key
    
    return this.prisma.project.create({
      data: {
        name,
        language,
        websiteUrl,
        apiKey,
        userId,
      },
    });
  }

  async findProjectById(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
    });
  }

  async findProjectByApiKey(apiKey: string) {
    return this.prisma.project.findUnique({
      where: { apiKey },
    });
  }

  async findProjectsByUserId(userId: string) {
    return this.prisma.project.findMany({
      where: { userId },
    });
  }

  async deleteProject(id: string) {
    return this.prisma.project.delete({
      where: { id },
    });
  }
}