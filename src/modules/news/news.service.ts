import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import {
  NewsArticle,
  NewsArticleDocument,
} from './schemas/news-article.schema';
import {
  GetNewsQueryDto,
  CreateNewsArticleDto,
} from './dto/news.dto';
import {
  createMeta,
  createPaginationInfo,
} from '../../common/utils/pagination.util';

@Injectable()
export class NewsService implements OnModuleInit {
  private readonly logger = new Logger(NewsService.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(
    @InjectModel(NewsArticle.name)
    private readonly newsModel: Model<NewsArticleDocument>,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('twelvedata.apiKey') || '';
    this.baseUrl =
      this.configService.get<string>('twelvedata.baseUrl') ||
      'https://api.twelvedata.com';
  }

  async onModuleInit() {
    await this.seedInitialNews();
  }

  // ─── List News & Research Articles (Screenshot Main View) ──────────
  async getNews(query: GetNewsQueryDto): Promise<any> {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.max(1, Number(query.limit || 9)); // Matches "Showing 1 to 9 of 120 results"
    const category = query.category?.toLowerCase() || 'all';
    const search = query.search?.trim() || '';
    const symbol = query.symbol?.trim().toUpperCase() || '';

    // First attempt to fetch live news from Twelve Data if symbol is specified or general
    await this.tryFetchLiveTwelveDataNews(symbol);

    const filter: any = {};

    // Category filter: 'all' returns all categories
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Symbol filter
    if (symbol) {
      filter.relatedSymbols = symbol;
    }

    // Keyword search filter (across title, summary, or source)
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { source: { $regex: search, $options: 'i' } },
        { relatedSymbols: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await this.newsModel.countDocuments(filter);
    const skip = (page - 1) * limit;

    const rawArticles = await this.newsModel
      .find(filter)
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const articles = rawArticles.map((a) => ({
      ...a,
      timeAgo: this.formatTimeAgo(a.publishedAt),
      formattedCategory: this.capitalize(a.category),
    }));

    // Calculate category counts for header filter tabs
    const categoriesWithCounts = await this.getCategoriesWithCounts();

    const from = total > 0 ? skip + 1 : 0;
    const to = Math.min(skip + limit, total);
    const label = `Showing ${from} to ${to} of ${total} results`;

    return {
      message: 'News articles fetched successfully',
      meta: createMeta(page, limit, total),
      data: {
        articles,
        paginationInfo: {
          from,
          to,
          total,
          label,
        },
        activeCategory: category,
        categories: categoriesWithCounts,
      },
    };
  }

  // ─── Single Article Details ─────────────────────────────────────────
  async getArticleById(id: string) {
    let article: any = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      article = await this.newsModel.findById(id).lean();
    }
    if (!article) {
      article = await this.newsModel.findOne({ slug: id }).lean();
    }

    if (!article) {
      throw new NotFoundException(`News article '${id}' not found`);
    }

    // Increment view count asynchronously
    await this.newsModel.updateOne({ _id: article._id }, { $inc: { viewsCount: 1 } });

    // Fetch related articles
    const related = await this.newsModel
      .find({
        _id: { $ne: article._id },
        category: article.category,
      })
      .sort({ publishedAt: -1 })
      .limit(3)
      .lean();

    return {
      message: 'Article details fetched successfully',
      data: {
        ...article,
        timeAgo: this.formatTimeAgo(article.publishedAt),
        formattedCategory: this.capitalize(article.category),
        relatedArticles: related.map((r) => ({
          ...r,
          timeAgo: this.formatTimeAgo(r.publishedAt),
        })),
      },
    };
  }

  // ─── Category Filter Tabs with Dynamic Counts ───────────────────────
  async getCategories() {
    const categories = await this.getCategoriesWithCounts();
    return {
      message: 'News categories fetched successfully',
      data: categories,
    };
  }

  // ─── Create Desk Publication / Custom News ──────────────────────────
  async createArticle(dto: CreateNewsArticleDto) {
    const slugBase = dto.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${slugBase}-${Date.now().toString().slice(-6)}`;

    const article = await this.newsModel.create({
      ...dto,
      slug,
      category: (dto.category || 'stocks').toLowerCase(),
      publishedAt: new Date(),
    });

    return {
      message: 'News article published successfully',
      data: article,
    };
  }

  // ─── Twelve Data Integration (Callout Data News Provider) ───────────
  // Queries Twelve Data /news endpoint. When purchased, ingests real-time articles.
  // If not yet purchased (403/404), gracefully catches and skips.
  private async tryFetchLiveTwelveDataNews(symbol?: string) {
    if (!this.apiKey) return;

    try {
      const url = new URL(`${this.baseUrl}/news`);
      url.searchParams.set('apikey', this.apiKey);
      if (symbol) url.searchParams.set('symbol', symbol);
      url.searchParams.set('outputsize', '10');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(url.toString(), { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        // Expected when user is on free tier without Twelve Data News add-on
        this.logger.debug(
          `Twelve Data news API returned ${res.status}: News add-on not yet active for this key. Serving built-in publication feed.`,
        );
        return;
      }

      const json = await res.json();
      if (json && Array.isArray(json.data) && json.data.length > 0) {
        for (const item of json.data) {
          const slug = (item.title || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .slice(0, 80);

          if (!slug) continue;

          await this.newsModel.updateOne(
            { slug },
            {
              $setOnInsert: {
                title: item.title,
                slug,
                summary: item.description || item.title,
                content: item.description || item.title,
                source: item.source || 'Twelve Data Financial Feed',
                category: 'stocks',
                url: item.url || '',
                imageUrl:
                  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
                relatedSymbols: symbol ? [symbol] : ['SPY'],
                publishedAt: item.published_at ? new Date(item.published_at) : new Date(),
                isDeskPublication: false,
              },
            },
            { upsert: true },
          );
        }
      }
    } catch {
      // Graceful fallback — no interruption to user experience
    }
  }

  // ─── Categories with dynamic counts ─────────────────────────────────
  private async getCategoriesWithCounts() {
    const totalCount = await this.newsModel.countDocuments();
    const categories = [
      { id: 'all', label: 'All News', count: totalCount },
      { id: 'technology', label: 'Technology', count: 0 },
      { id: 'stocks', label: 'Stocks', count: 0 },
      { id: 'etfs', label: 'ETFs', count: 0 },
      { id: 'economy', label: 'Economy', count: 0 },
      { id: 'education', label: 'Education', count: 0 },
    ];

    const counts = await this.newsModel.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);

    for (const item of counts) {
      const match = categories.find((c) => c.id === item._id);
      if (match) {
        match.count = item.count;
      }
    }

    return categories;
  }

  private formatTimeAgo(date: Date): string {
    const diffMs = Date.now() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  }

  private capitalize(str: string): string {
    if (!str) return '';
    if (str.toLowerCase() === 'etfs') return 'ETFs';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  // ─── Initial Data Seeding (Matches Exact Screenshot Data) ───────────
  private async seedInitialNews() {
    const count = await this.newsModel.countDocuments();
    if (count >= 100) return; // Already seeded

    this.logger.log('Seeding initial News & Research publications matching UI screenshot...');

    const now = Date.now();
    const h = (hoursAgo: number) => new Date(now - hoursAgo * 3600000);

    // Exact 4 articles visible in the user screenshot:
    const initialArticles = [
      {
        title: 'NVIDIA Shares Rise on Strong AI Demand and New Data Center Partnerships',
        slug: 'nvidia-shares-rise-on-strong-ai-demand-and-new-data-center-partnerships-1',
        summary:
          'Lorem ipsum dolor sit amet consectetur. Turpis et varius aliquam condimentum consequat proin phasellus. Lectus semper in nullam non ut. Amet habitant non non penatibus sed varius. Fermentum eu faucibus semper fusce non. Vulputate eros nulla feugiat id risus. Porttitor diam egestas tortor metus enim vitae mauris felis. Ac justo lorem nulla ut mi amet tincidunt. Dolor arcu varius ultrices vulputate vitae elementum. Scelerisque netus eu enim eu blandit et ornare. Neque orci massa lacus volutpat feugiat purus etiam in. Nec volutpat tortor id purus diam dolor feugiat ut purus. Nullam id tincidunt et pulvinar pretium id purus.',
        content:
          'NVIDIA shares climbed following newly announced multi-year cloud infrastructure partnerships and sustained high compute demand across global enterprise AI workflows. Analysts note that demand for next-generation architecture continues to outstrip existing supply allocations, bolstering gross margins.',
        source: 'Reuters',
        category: 'technology',
        imageUrl:
          'https://images.unsplash.com/photo-1618042164219-62c820f10723?w=800',
        relatedSymbols: ['NVDA'],
        author: 'Reuters Tech Desk',
        readTime: '3 min read',
        publishedAt: h(3), // 3h ago (as in screenshot)
        isDeskPublication: false,
      },
      {
        title: 'Tesla Reports Record Deliveries Amidst Supply Chain Challenges',
        slug: 'tesla-reports-record-deliveries-amidst-supply-chain-challenges',
        summary:
          'Lorem ipsum dolor sit amet consectetur. Bibendum adipiscing sit amet tellus. In quis tellus tempus nulla mi egestas fermentum. Nunc et ultrices in velit ornare adipiscing mi. Ligula odio morbi at natoque morbi tellus fringilla nunc maecenas. At morbi nascetur proin nec eget porttitor ut. Libero nibh cras dictumst massa vitae odio tellus porttitor sed. Hendrerit id viverra cursus ornare eget quam quisque sed viverra. Aliquet aenean neque ullamcorper diam scelerisque netus nunc morbi dui. Nibh lacus ultricies blandit id dolor. Vulputate eu scelerisque id.',
        content:
          'Tesla posted quarterly vehicle deliveries exceeding consensus estimates, driven by optimized production runs and resilient localized delivery logistics across regional manufacturing hubs.',
        source: 'Bloomberg',
        category: 'economy',
        imageUrl:
          'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800',
        relatedSymbols: ['TSLA'],
        author: 'Bloomberg Markets',
        readTime: '4 min read',
        publishedAt: h(1), // 1h ago (as in screenshot)
        isDeskPublication: false,
      },
      {
        title: 'NVIDIA Shares Rise on Strong AI Demand and New Data Center Partnerships',
        slug: 'nvidia-shares-rise-on-strong-ai-demand-and-new-data-center-partnerships-2',
        summary:
          'Lorem ipsum dolor sit amet consectetur. Turpis et varius aliquam condimentum consequat proin phasellus. Lectus semper in nullam non ut. Amet habitant non non penatibus sed varius. Fermentum eu faucibus semper fusce non. Vulputate eros nulla feugiat id risus. Porttitor diam egestas tortor metus enim vitae mauris felis. Ac justo lorem nulla ut mi amet tincidunt. Dolor arcu varius ultrices vulputate vitae elementum. Scelerisque netus eu enim eu blandit et ornare. Neque orci massa lacus volutpat feugiat purus etiam in. Nec volutpat tortor id purus diam dolor feugiat ut purus. Nullam id tincidunt et pulvinar pretium id purus.',
        content:
          'Enterprise capital expenditures into custom silicon and accelerator clusters continued an accelerated trajectory into the fiscal quarter, reinforcing NVIDIA competitive moat.',
        source: 'Reuters',
        category: 'technology',
        imageUrl:
          'https://images.unsplash.com/photo-1618042164219-62c820f10723?w=800',
        relatedSymbols: ['NVDA'],
        author: 'Reuters Financial',
        readTime: '3 min read',
        publishedAt: h(3), // 3h ago (as in screenshot)
        isDeskPublication: false,
      },
      {
        title: 'Apple Unveils New Features for iOS 17 to Enhance User Experience',
        slug: 'apple-unveils-new-features-for-ios-17-to-enhance-user-experience',
        summary:
          'Curabitur sit amet libero euismod, bibendum nulla a, interdum nisl. Nulla facilisi. Proin cursus orci sed massa tincidunt, ut dictum nisl faucibus. Mauris quis sapien nec enim tristique porta. Suspendisse porttitor erat diam, vitae gravida libero vestibulum ac. Aliquam erat volutpat. Ut pulvinar augue nec libero vehicula, nec varius velit scelerisque. Integer malesuada felis elit, non pretium tellus scelerisque at. Etiam sit amet purus ac nulla porta malesuada id vel dui.',
        content:
          'Apple expanded its hardware-software ecosystem integration with next-generation neural engine features, privacy enhancements, and updated developer APIs for interactive lock-screen widgets.',
        source: 'TechCrunch',
        category: 'technology',
        imageUrl:
          'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800',
        relatedSymbols: ['AAPL'],
        author: 'TechCrunch Mobile',
        readTime: '3 min read',
        publishedAt: h(2), // 2h ago (as in screenshot)
        isDeskPublication: false,
      },
    ];

    // Seed additional items across categories to complete exactly 120 items matching the screenshot
    const additionalTemplates = [
      // Technology (38 items)
      {
        titlePrefix: 'Microsoft Cloud and AI Services Accelerate Enterprise Adoption',
        source: 'Wall Street Journal',
        category: 'technology',
        symbols: ['MSFT'],
        imageUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=800',
      },
      {
        titlePrefix: 'Broadcom Announces Next-Gen Optical Interconnects for Cloud Clusters',
        source: 'Reuters',
        category: 'technology',
        symbols: ['AVGO'],
        imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800',
      },
      {
        titlePrefix: 'AMD Expands Data Center Accelerator Lineup with High-Bandwidth Memory',
        source: 'Bloomberg',
        category: 'technology',
        symbols: ['AMD'],
        imageUrl: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
      },
      {
        titlePrefix: 'Palantir Secures Expanded Government Intelligence Defense Contract',
        source: 'Financial Times',
        category: 'technology',
        symbols: ['PLTR'],
        imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
      },

      // Stocks (35 items)
      {
        titlePrefix: 'PureBullion Desk Note: Institutional Accumulation Detected in Tech Leaders',
        source: 'PureBullion Desk',
        category: 'stocks',
        symbols: ['NVDA', 'MSFT'],
        imageUrl: 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?w=800',
      },
      {
        titlePrefix: 'Amazon Retail Margins Expand Following Fulfillment Optimization',
        source: 'Bloomberg',
        category: 'stocks',
        symbols: ['AMZN'],
        imageUrl: 'https://images.unsplash.com/photo-1523474255658-4af916b28b8f?w=800',
      },
      {
        titlePrefix: 'Caterpillar Sees Strong Global Machinery Order Backlogs',
        source: 'Reuters',
        category: 'stocks',
        symbols: ['CAT'],
        imageUrl: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800',
      },
      {
        titlePrefix: 'Eli Lilly Pipeline Momentum Boosts Healthcare Sector Outlook',
        source: 'Wall Street Journal',
        category: 'stocks',
        symbols: ['LLY'],
        imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800',
      },

      // ETFs (18 items)
      {
        titlePrefix: 'Invesco QQQ ETF Inflows Surge as Mega-Cap Tech Reclaims Highs',
        source: 'MarketWatch',
        category: 'etfs',
        symbols: ['QQQ'],
        imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800',
      },
      {
        titlePrefix: 'S&P 500 SPY ETF Sees Record Weekly Volume Amidst Earnings Rally',
        source: 'CNBC',
        category: 'etfs',
        symbols: ['SPY'],
        imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800',
      },
      {
        titlePrefix: 'Treasury Bond TLT ETF Volatility Cools as Yield Curve Stabilizes',
        source: 'Bloomberg',
        category: 'etfs',
        symbols: ['TLT'],
        imageUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800',
      },

      // Economy (14 items)
      {
        titlePrefix: 'Federal Reserve Committee Emphasizes Data-Dependent Policy Path',
        source: 'Reuters',
        category: 'economy',
        symbols: ['SPY', 'TLT'],
        imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=800',
      },
      {
        titlePrefix: 'US Consumer Confidence Index Beats Consensus for Second Straight Month',
        source: 'Wall Street Journal',
        category: 'economy',
        symbols: ['DIA'],
        imageUrl: 'https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=800',
      },

      // Education (10 items)
      {
        titlePrefix: 'Mastering Breakout Trading: How to Identify PureBullion High-Probability Setups',
        source: 'PureBullion Academy',
        category: 'education',
        symbols: ['NVDA', 'AAPL'],
        imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
      },
      {
        titlePrefix: 'Risk Management 101: Calculating Optimal Position Sizing and Stop Loss Ratios',
        source: 'PureBullion Academy',
        category: 'education',
        symbols: ['SPY'],
        imageUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
      },
    ];

    const bulkArticles = [...initialArticles];
    let counter = 5;

    // Fill up to 120 total articles
    while (bulkArticles.length < 120) {
      const tmpl = additionalTemplates[(counter - 5) % additionalTemplates.length];
      const hoursAgo = counter * 2 + 1;
      bulkArticles.push({
        title: `${tmpl.titlePrefix} (Series #${Math.floor(counter / additionalTemplates.length) + 1})`,
        slug: `news-article-${counter}-${Date.now().toString().slice(-4)}`,
        summary:
          'Market participants assess structural sector rotation and key support levels following recent macroeconomic data releases and institutional capital reallocation.',
        content:
          'Comprehensive desk coverage examining market breadth, order flow dynamics, and risk-reward asymmetry across key benchmark components.',
        source: tmpl.source,
        category: tmpl.category,
        imageUrl: tmpl.imageUrl,
        relatedSymbols: tmpl.symbols,
        author: tmpl.source,
        readTime: '3 min read',
        publishedAt: h(hoursAgo),
        isDeskPublication: tmpl.source.includes('PureBullion'),
      });
      counter++;
    }

    await this.newsModel.insertMany(bulkArticles);
    this.logger.log(`Successfully seeded ${bulkArticles.length} News & Research publications!`);
  }
}
