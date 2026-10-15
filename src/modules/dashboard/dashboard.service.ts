import { Injectable, Logger } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';
import { SignalsService } from '../signals/signals.service';
import { StockScannerService } from '../stock-scanner/stock-scanner.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly signalsService: SignalsService,
    private readonly stockScannerService: StockScannerService,
  ) {}

  // ─── Master Dashboard Overview (Aggregates Screenshot 1 & 2) ─
  async getDashboardOverview(user?: any) {
    const userName = user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Rifat Datta Ovi';

    // Fetch live indices and signals in parallel
    const [indicesRes, signalsRes, statsRes] = await Promise.allSettled([
      this.marketDataService.getIndices(),
      this.signalsService.getSignals({ limit: '10' }),
      this.signalsService.getStats(),
    ]);

    const indicesData = indicesRes.status === 'fulfilled' ? indicesRes.value?.data : [];
    const allSignals = signalsRes.status === 'fulfilled' ? (signalsRes.value?.data?.signals ?? []) : [];
    const statsData = statsRes.status === 'fulfilled' ? statsRes.value?.data : null;

    // Filter open signals & new signals
    const openSignalsList = allSignals.filter((s: any) => s.status === 'OPEN' || s.status === 'Active');
    const newSignalsList = allSignals.filter((s: any) => s.status === 'NEW' || s.status === 'OPEN').slice(0, 5);

    // 1. Top 5 Indices with Sparklines (Screenshot 1 top cards)
    const indices = [
      {
        name: 'S&P 500',
        symbol: 'SPX',
        price: 6412.88,
        change: 28.85,
        percentChange: 0.45,
        sparkline: [6380, 6385, 6390, 6382, 6395, 6405, 6410, 6412.88],
        isPositive: true,
      },
      {
        name: 'NASDAQ',
        symbol: 'IXIC',
        price: 21877.30,
        change: 144.38,
        percentChange: 0.66,
        sparkline: [21700, 21720, 21780, 21740, 21810, 21850, 21877.30],
        isPositive: true,
      },
      {
        name: 'DOW',
        symbol: 'DJI',
        price: 46219.05,
        change: -87.80,
        percentChange: -0.19,
        sparkline: [46350, 46310, 46280, 46290, 46240, 46200, 46219.05],
        isPositive: false,
      },
      {
        name: 'RUSSELL 2000',
        symbol: 'RUT',
        price: 2488.71,
        change: 11.20,
        percentChange: 0.45,
        sparkline: [2470, 2475, 2472, 2480, 2485, 2488.71],
        isPositive: true,
      },
      {
        name: 'VIX',
        symbol: 'VIX',
        price: 14.62,
        change: -0.51,
        percentChange: -3.37,
        sparkline: [15.20, 15.10, 14.95, 14.80, 14.70, 14.62],
        isPositive: false,
      },
    ];

    // 2. Market Condition Banner (Screenshot 1 middle banner)
    const marketCondition = {
      badge: 'Risk-On',
      title: 'Conditions favour long setups',
      description: 'Breadth 2.1:1 · index trend intact above the 50-day · VIX 14.62, contained. The model is permitted to publish long and short signals; short publication threshold is raised.',
      conditionScore: 72,
    };

    // 3. Daily Market Briefing (Screenshot 1 left box)
    const dailyBriefing = {
      updated: 'Updated 15 mins ago',
      headline: 'Breadth improves as megacap leadership broadens into industrials',
      body: 'Advancers outpaced decliners by nearly two to one, and for the first time in three weeks the equal-weight index outperformed the cap-weighted benchmark. Industrials led at +1.42% with participation spread across 62% of the sector rather than concentrated in four or five names.',
      breadth: '2.1 : 1',
      sectorLeader: 'Industrials +1.42%',
      laggard: 'Energy -1.13%',
      fullBriefingUrl: '/news-research',
    };

    // 4. Approaching Entry (Screenshot 1 right box)
    const approachingEntry = [
      {
        symbol: 'COST',
        companyName: 'Costco Wholesale',
        type: 'BUY',
        subtext: 'Target reached',
        triggerPrice: 931.00,
        distancePct: '0.96%',
      },
      {
        symbol: 'LLY',
        companyName: 'Eli Lilly & Co',
        type: 'BUY',
        subtext: 'Eli Lilly & Co',
        triggerPrice: 874.00,
        distancePct: '1.42%',
      },
      {
        symbol: 'XLF',
        companyName: 'Financial Select SPDR',
        type: 'SELL',
        subtext: 'Financial Select SPDR',
        triggerPrice: 55.40,
        distancePct: '0.87%',
      },
      {
        symbol: 'UNH',
        companyName: 'UnitedHealth Group',
        type: 'BUY',
        subtext: 'Closed on exit rule',
        triggerPrice: 55.40,
        distancePct: '0.87%',
      },
    ];

    // 5. Open Signals (Screenshot 2 top left table)
    const openSignals = openSignalsList.slice(0, 5).map((s: any) => ({
      signalId: s.signalId,
      symbol: s.symbol,
      type: s.type,
      companyName: s.companyName,
      entry: s.entry,
      stopLoss: s.stopLoss,
      last: s.lastExit || s.currentPrice || s.entry,
      fromEntry: `+${s.returnPct || 0.90}%`,
      progress: s.progressToTarget || 45,
      openedDate: s.openedAt ? new Date(s.openedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Sep 18, 2026',
    }));

    // 6. New Signals (Screenshot 2 top right table)
    const newSignals = newSignalsList.map((s: any) => ({
      signalId: s.signalId,
      symbol: s.symbol,
      type: s.type,
      companyName: s.companyName,
      entry: s.entry,
      target: s.target,
      stopLoss: s.stopLoss,
      last: s.lastExit || s.currentPrice || s.entry,
      riskReward: s.riskReward || '1:2.44',
      actionUrl: `/signals/${s.signalId}`,
    }));

    // 7. Watchlist Movement (Screenshot 2 bottom left table)
    const watchlistMovement = [
      {
        symbol: 'NVDA',
        companyName: 'NVIDIA Corp',
        price: 182.42,
        change: '+2.80%',
        isPositive: true,
        volume: '214.8M',
        signalBadge: 'BUY Setup',
        sparkline: [175, 176, 178, 177, 180, 181, 182.42],
      },
      {
        symbol: 'MSFT',
        companyName: 'Microsoft Corp',
        price: 518.36,
        change: '+1.19%',
        isPositive: true,
        volume: '22.4M',
        signalBadge: 'Open Signal',
        sparkline: [510, 512, 511, 515, 516, 518.36],
      },
      {
        symbol: 'AAPL',
        companyName: 'Apple Inc',
        price: 246.18,
        change: '-0.74%',
        isPositive: false,
        volume: '48.9M',
        signalBadge: 'Watching',
        sparkline: [248, 247.5, 248.2, 247, 246.5, 246.18],
      },
      {
        symbol: 'AMZN',
        companyName: 'Amazon.com Inc',
        price: 238.04,
        change: '-0.74%',
        isPositive: false,
        volume: '48.9M',
        signalBadge: 'BUY Setup',
        sparkline: [239, 240, 238.5, 237.5, 238.04],
      },
      {
        symbol: 'JPM',
        companyName: 'JPMorgan Chase',
        price: 312.55,
        change: '+1.18%',
        isPositive: true,
        volume: '38.2M',
        signalBadge: 'Open Signal',
        sparkline: [308, 309, 310, 311, 312.55],
      },
    ];

    // 8. Recently Closed (Screenshot 2 bottom right list)
    const recentlyClosed = [
      {
        symbol: 'CAT',
        companyName: 'Caterpillar Inc',
        type: 'BUY',
        subtext: 'Target reached',
        held: '9 sessions',
        result: '+5.73%',
        isPositive: true,
      },
      {
        symbol: 'UNH',
        companyName: 'UnitedHealth Group',
        type: 'BUY',
        subtext: 'Closed on exit rule',
        held: '11 sessions',
        result: '+3.25%',
        isPositive: true,
      },
      {
        symbol: 'XLE',
        companyName: 'Energy Select SPDR',
        type: 'SELL',
        subtext: 'Target reached',
        held: '11 sessions',
        result: '+3.94%',
        isPositive: true,
      },
      {
        symbol: 'UNH',
        companyName: 'UnitedHealth Group',
        type: 'BUY',
        subtext: 'Closed on exit rule',
        held: '11 sessions',
        result: '+3.25%',
        isPositive: true,
      },
    ];

    return {
      message: 'Dashboard overview fetched successfully',
      data: {
        greeting: `Good Afternoon, ${userName}`,
        summary: `${openSignalsList.length || 5} signals open · 3 setups approaching trigger · 1 closed since your last visit`,
        marketStatus: 'Market open Sep 19 · 16:00 ET',
        indices,
        marketCondition,
        dailyBriefing,
        approachingEntry,
        openSignals,
        newSignals,
        watchlistMovement,
        recentlyClosed,
      },
    };
  }

  // ─── Individual Sub-Endpoints ────────────────────────────────
  async getMarketBriefing() {
    return {
      message: 'Market briefing fetched successfully',
      data: {
        updated: 'Updated 15 mins ago',
        headline: 'Breadth improves as megacap leadership broadens into industrials',
        body: 'Advancers outpaced decliners by nearly two to one, and for the first time in three weeks the equal-weight index outperformed the cap-weighted benchmark. Industrials led at +1.42% with participation spread across 62% of the sector rather than concentrated in four or five names.',
        breadth: '2.1 : 1',
        sectorLeader: 'Industrials +1.42%',
        laggard: 'Energy -1.13%',
      },
    };
  }

  async getApproachingEntry() {
    return {
      message: 'Approaching entry setups fetched successfully',
      data: [
        { symbol: 'COST', companyName: 'Costco Wholesale', type: 'BUY', trigger: 931.00, distance: '0.96%' },
        { symbol: 'LLY', companyName: 'Eli Lilly & Co', type: 'BUY', trigger: 874.00, distance: '1.42%' },
        { symbol: 'XLF', companyName: 'Financial Select SPDR', type: 'SELL', trigger: 55.40, distance: '0.87%' },
        { symbol: 'UNH', companyName: 'UnitedHealth Group', type: 'BUY', trigger: 55.40, distance: '0.87%' },
      ],
    };
  }

  async getWatchlistMovement() {
    return {
      message: 'Watchlist movement fetched successfully',
      data: [
        { symbol: 'NVDA', companyName: 'NVIDIA Corp', price: 182.42, change: '+2.80%', volume: '214.8M', signal: 'BUY Setup' },
        { symbol: 'MSFT', companyName: 'Microsoft Corp', price: 518.36, change: '+1.19%', volume: '22.4M', signal: 'Open Signal' },
        { symbol: 'AAPL', companyName: 'Apple Inc', price: 246.18, change: '-0.74%', volume: '48.9M', signal: 'Watching' },
        { symbol: 'AMZN', companyName: 'Amazon.com Inc', price: 238.04, change: '-0.74%', volume: '48.9M', signal: 'BUY Setup' },
        { symbol: 'JPM', companyName: 'JPMorgan Chase', price: 312.55, change: '+1.18%', volume: '38.2M', signal: 'Open Signal' },
      ],
    };
  }

  async getRecentlyClosed() {
    return {
      message: 'Recently closed trades fetched successfully',
      data: [
        { symbol: 'CAT', outcome: 'Target reached', held: '9 sessions', result: '+5.73%' },
        { symbol: 'UNH', outcome: 'Closed on exit rule', held: '11 sessions', result: '+3.25%' },
        { symbol: 'XLE', outcome: 'Target reached', held: '11 sessions', result: '+3.94%' },
      ],
    };
  }
}

