import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as cheerio from 'cheerio';
import axios, { AxiosRequestConfig } from 'axios';
import { chromium } from 'playwright';
import { DocumentProcessingService } from '../chat/document-processing.service';
import { UrlValidationService } from '../utils/url-validation.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class IngestionService {
  private readonly MAX_DEPTH = 2;
  private readonly MAX_PAGES = 50;
  private readonly MAX_CONCURRENT_REQUESTS = 3;

  constructor(
    private prisma: PrismaService,
    private documentProcessingService: DocumentProcessingService,
    private urlValidationService: UrlValidationService,
  ) {}

  async crawlWebsite(projectId: string, websiteUrl: string) {
    try {
      // Validate the URL to prevent SSRF attacks
      const isValidUrl = await this.urlValidationService.validateUrl(websiteUrl);
      if (!isValidUrl) {
        throw new Error('Invalid URL provided - SSRF protection triggered');
      }

      // First try static HTML parsing with limits
      const staticContent = await this.crawlStaticHTML(websiteUrl, this.MAX_DEPTH, this.MAX_PAGES);

      if (staticContent && staticContent.length > 0) {
        // Save static content to database and process embeddings
        for (const page of staticContent) {
          const document = await this.prisma.document.create({
            data: {
              projectId,
              type: 'website',
              source: page.content, // Store the actual content, not just the URL
            },
          });

          // Process the document for embeddings
          await this.documentProcessingService.processDocument(
            projectId,
            document.id,
            page.content
          );
        }
      } else {
        // Fallback to Playwright for JS sites
        const dynamicContent = await this.crawlWithPlaywright(websiteUrl, this.MAX_DEPTH, this.MAX_PAGES);

        // Save dynamic content to database and process embeddings
        for (const page of dynamicContent) {
          const document = await this.prisma.document.create({
            data: {
              projectId,
              type: 'website',
              source: page.content, // Store the actual content, not just the URL
            },
          });

          // Process the document for embeddings
          await this.documentProcessingService.processDocument(
            projectId,
            document.id,
            page.content
          );
        }
      }

      return { message: 'Website crawl completed successfully' };
    } catch (error) {
      console.error('Error during website crawling:', error);
      throw error;
    }
  }

  private async crawlStaticHTML(baseUrl: string, maxDepth: number = 2, maxPages: number = 50): Promise<Array<{url: string, content: string}>> {
    const visited = new Set<string>();
    const results: Array<{url: string, content: string}> = [];
    const queue: Array<{url: string, depth: number}> = [{url: baseUrl, depth: 0}];

    while (queue.length > 0 && results.length < maxPages) {
      const {url, depth} = queue.shift()!;

      if (visited.has(url) || depth > maxDepth) {
        continue;
      }

      visited.add(url);

      try {
        // Use secure HTTP agent to prevent DNS rebinding
        const parsedUrl = new URL(url);
        const agent = parsedUrl.protocol === 'https:'
          ? this.urlValidationService.createSecureHttpsAgent()
          : this.urlValidationService.createSecureHttpAgent();

        const config: AxiosRequestConfig = {
          httpsAgent: agent,
          httpAgent: agent,
          timeout: 10000, // 10 second timeout
        };

        const pageResponse = await axios.get(url, config);
        const pageContent = pageResponse.data;
        results.push({ url, content: pageContent });

        if (depth < maxDepth && results.length < maxPages) {
          const $ = cheerio.load(pageContent);
          const links: string[] = [];

          $('a[href]').each((i, elem) => {
            const href = $(elem).attr('href');
            if (href) {
              const fullUrl = new URL(href, baseUrl).href;
              if (fullUrl.startsWith(baseUrl) && !visited.has(fullUrl)) { // Only crawl links within the same domain
                links.push(fullUrl);
              }
            }
          });

          // Add new links to queue
          for (const link of links) {
            if (!visited.has(link) && results.length < maxPages) {
              queue.push({url: link, depth: depth + 1});
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to crawl static HTML for ${url}:`, error);
        continue;
      }
    }

    return results;
  }

  private async crawlWithPlaywright(baseUrl: string, maxDepth: number = 2, maxPages: number = 50): Promise<Array<{url: string, content: string}>> {
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();

    const visited = new Set<string>();
    const results: Array<{url: string, content: string}> = [];
    const queue: Array<{url: string, depth: number}> = [{url: baseUrl, depth: 0}];

    try {
      while (queue.length > 0 && results.length < maxPages) {
        const {url, depth} = queue.shift()!;

        if (visited.has(url) || depth > maxDepth) {
          continue;
        }

        visited.add(url);

        try {
          // Use domcontentloaded instead of networkidle to avoid issues with persistent trackers
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          // Wait a short time for dynamic content to load, but not for network to be idle
          await page.waitForTimeout(2000);
          const content = await page.content();
          results.push({ url, content });

          if (depth < maxDepth && results.length < maxPages) {
            // Extract all links from the page
            const links = await page.evaluate(() => {
              const anchors = Array.from(document.querySelectorAll('a[href]'));
              return anchors
                .map(anchor => anchor.href)
                .filter(href => href && href.startsWith(window.location.origin) && !href.includes('#'));
            });

            // Add new links to queue
            for (const link of links) {
              if (!visited.has(link) && results.length < maxPages) {
                queue.push({url: link, depth: depth + 1});
              }
            }
          }
        } catch (error) {
          console.warn(`Failed to crawl with Playwright for ${url}:`, error);
          continue;
        }
      }

      await browser.close();
      return results;
    } catch (error) {
      console.error('Playwright crawling failed:', error);
      await browser.close();
      throw error;
    }
  }
}