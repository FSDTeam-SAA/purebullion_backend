import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NewsService } from './news.service';
import { GetNewsQueryDto, CreateNewsArticleDto } from './dto/news.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

@Controller(['news', 'news-research'])
@UseGuards(JwtAuthGuard)
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  // ─── 1. List News & Research Articles (Main view matching Screenshot) ────
  // Supports ?category=all|technology|stocks|etfs|economy|education
  // Supports ?search=... & ?symbol=... & ?page=1 & ?limit=9
  @Public()
  @Get()
  getNews(@Query() query: GetNewsQueryDto): Promise<any> {
    return this.newsService.getNews(query);
  }

  // ─── 2. Category Filter Tabs with dynamic article counts ─────────────────
  // Returns: All News, Technology, Stocks, ETFs, Economy, Education
  @Public()
  @Get('categories')
  getCategories(): Promise<any> {
    return this.newsService.getCategories();
  }

  // ─── 3. Single Article Details & Related Publications ────────────────────
  @Public()
  @Get(':id')
  getArticleById(@Param('id') id: string): Promise<any> {
    return this.newsService.getArticleById(id);
  }

  // ─── 4. Publish Desk Publication / Custom News Article ───────────────────
  @Public()
  @Post()
  createArticle(@Body() dto: CreateNewsArticleDto): Promise<any> {
    return this.newsService.createArticle(dto);
  }
}
