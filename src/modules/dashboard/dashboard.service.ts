import { Injectable, Logger } from '@nestjs/common';
import { MarketDataService } from '../market-data/market-data.service';
import { SignalsService } from '../signals/signals.service';
import { WatchlistService } from '../watchlist/watchlist.service';
import { StockScannerService } from '../stock-scanner/stock-scanner.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly marketDataService: MarketDataService,
    private readonly signalsService: SignalsService,
    private readonly stockScannerService: StockScannerService,
    private readonly watchlistService: WatchlistService,
  ) {}

  // ─── Master Dashboard Overview (Aggregates Screenshot 1 & 2) ─
  async getDashboardOverview(user?: any) {
    const userName = user?.name || (user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '') || 'Trader';

    // Fetch live indices and signals in parallel
    const [indicesRes, signalsRes, statsRes, closedRes, newRes, watchRes] = await Promise.allSettled([
      this.marketDataService.getIndices(),
      this.signalsService.getSignals({ limit: '10' }),
      this.signalsService.getStats(),
      this.signalsService.getSignals({ status: 'CLOSED', limit: '4' }),
      this.signalsService.getSignals({ status: 'NEW', limit: '5' }),
      this.watchlistService.getWatchlist(user?._id, { limit: '5' } as any),
    ]);

    const indicesData = indicesRes.status === 'fulfilled' ? indicesRes.value?.data : [];
    const allSignals = signalsRes.status === 'fulfilled' ? (signalsRes.value?.data?.signals ?? []) : [];
    const statsData = statsRes.status === 'fulfilled' ? statsRes.value?.data : null;

    // Filter open signals & new signals
    const openSignalsList = allSignals.filter((s: any) => s.status === 'OPEN' || s.status === 'Active');
    const newSignalsList = allSignals.filter((s: any) => s.status === 'NEW' || s.status === 'OPEN').slice(0, 5);

    // 1. Top 5 Indices — live ETF proxies, static fallback
    const proxyMap: Record<string, string> = {
      SPY: 'S&P 500|SPX', QQQ: 'NASDAQ|IXIC', DIA: 'DOW|DJI', IWM: 'RUSSELL 2000|RUT', VXX: 'VIX|VIX',
    };
    const liveIndices = (Array.isArray(indicesData) ? indicesData : [])
      .filter((i: any) => proxyMap[i.symbol])
      .map((i: any) => {
        const [name, symbol] = proxyMap[i.symbol].split('|');
        return {
          name,
          symbol,
          price: i.price,
          change: i.change,
          percentChange: i.percentChange,
          sparkline: [],
          isPositive: (i.percentChange ?? 0) >= 0,
        };
      });
    const indices = liveIndices.length ? liveIndices : [
      { name: 'S&P 500', symbol: 'SPX', price: 6412.88, change: 28.85, percentChange: 0.45, sparkline: [], isPositive: true },
      { name: 'NASDAQ', symbol: 'IXIC', price: 21877.30, change: 144.38, percentChange: 0.66, sparkline: [], isPositive: true },
      { name: 'DOW', symbol: 'DJI', price: 46219.05, change: -87.80, percentChange: -0.19, sparkline: [], isPositive: false },
      { name: 'RUSSELL 2000', symbol: 'RUT', price: 2488.71, change: 11.20, percentChange: 0.45, sparkline: [], isPositive: true },
      { name: 'VIX', symbol: 'VIX', price: 14.62, change: -0.51, percentChange: -3.37, sparkline: [], isPositive: false },
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
    const newRaw = newRes.status === 'fulfilled' ? (newRes.value?.data?.signals ?? []) : [];
    const liveApproaching = newRaw.map((s: any) => {
      const last = s.currentPrice || s.entry;
      return {
        symbol: s.symbol,
        companyName: s.companyName,
        type: s.type,
        subtext: s.companyName,
        triggerPrice: s.entry,
        distancePct: `${(Math.abs((last - s.entry) / s.entry) * 100).toFixed(2)}%`,
      };
    });
    const approachingEntry = liveApproaching.length ? liveApproaching : [
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
      last: s.currentPrice || s.lastExit || s.entry,
      fromEntry: `${(s.returnPct ?? 0) >= 0 ? '+' : ''}${s.returnPct ?? 0}%`,
      progress: Math.max(0, Math.min(100, s.progressToTarget ?? 0)),
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
      last: s.currentPrice || s.lastExit || s.entry,
      riskReward: s.riskReward || '1:2.44',
      actionUrl: `/signals/${s.signalId}`,
    }));

    // 7. Watchlist Movement — the user's own watchlist
    const wlItems = watchRes.status === 'fulfilled' ? (watchRes.value?.data?.watchlist ?? []) : [];
    const watchlistMovement = wlItems.map((w: any) => ({
      symbol: w.ticker,
      companyName: w.companyName,
      price: w.numericPrice,
      change: w.dailyChange,
      isPositive: w.isPositive,
      volume: String(w.volume).replace(' ', ''),
      signalBadge: w.activeSignalId ? 'Open Signal' : w.signalSetup === 'Buy setup' ? 'BUY Setup' : 'Watching',
      sparkline: w.sparkline,
    }));

    // 8. Recently Closed — real closed signals
    const closedRaw = closedRes.status === 'fulfilled' ? (closedRes.value?.data?.signals ?? []) : [];
    const recentlyClosed = closedRaw.map((s: any) => {
      const ret = s.returnPct ?? 0;
      const days = s.openedAt && s.closedAt
        ? Math.max(1, Math.round((new Date(s.closedAt).getTime() - new Date(s.openedAt).getTime()) / 86400000))
        : 0;
      return {
        symbol: s.symbol,
        companyName: s.companyName,
        type: s.type,
        subtext: ret >= 0 ? 'Target reached' : 'Closed on exit rule',
        held: `${days} sessions`,
        result: `${ret >= 0 ? '+' : ''}${ret}%`,
        isPositive: ret >= 0,
      };
    });

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

