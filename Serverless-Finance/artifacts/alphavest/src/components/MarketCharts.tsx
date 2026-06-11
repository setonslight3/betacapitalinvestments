import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

interface PricePoint {
  time: string;
  price: number;
}

interface MarketData {
  points: PricePoint[];
  currentPrice: number;
  changePercent: number;
  loading: boolean;
  error: string | null;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

const RANGE_OPTIONS = [
  { label: '7D', days: 7 },
  { label: '30D', days: 30 },
  { label: '90D', days: 90 },
];

// All fetches go through our API server — no browser CORS issues
async function fetchCryptoChart(coinId: string, days: number): Promise<PricePoint[]> {
  const res = await fetch(`/api/market/chart/${coinId}?days=${days}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Chart data unavailable');
  const data = await res.json();
  if (data.message) throw new Error(data.message);
  const prices: [number, number][] = data.prices ?? [];
  if (prices.length < 2) throw new Error('Insufficient data');
  return prices.map(([ts, price]) => {
    const d = new Date(ts);
    const time = days <= 7
      ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { time, price: parseFloat(price.toFixed(2)) };
  });
}

async function fetchGoldChart(days: number): Promise<PricePoint[]> {
  const res = await fetch(`/api/market/gold?days=${days}`, { credentials: 'include' });
  if (!res.ok) throw new Error('Gold data unavailable');
  const json = await res.json();
  if (json.message) throw new Error(json.message);
  const result = json.chart?.result?.[0];
  if (!result) throw new Error('No gold data');
  const timestamps: number[] = result.timestamp ?? [];
  const closes: number[] = result.indicators?.quote?.[0]?.close ?? [];
  const points = timestamps
    .map((ts, i) => {
      const d = new Date(ts * 1000);
      const time = days <= 7
        ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { time, price: closes[i] != null ? parseFloat(Number(closes[i]).toFixed(2)) : 0 };
    })
    .filter(p => p.price > 0);
  if (points.length < 2) throw new Error('Insufficient gold data');
  return points;
}

function SVGLineChart({ data, color }: { data: PricePoint[]; color: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; point: PricePoint } | null>(null);

  const { pathD, minPrice, maxPrice, width, height, xScale, yScale } = useMemo(() => {
    const w = 600; const h = 180;
    const padT = 8; const padB = 8;
    if (data.length < 2) return { pathD: '', minPrice: 0, maxPrice: 0, width: w, height: h, xScale: () => 0, yScale: () => 0 };
    const prices = data.map(d => d.price);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const rangeP = maxP - minP || 1;
    const xS = (i: number) => (i / (data.length - 1)) * w;
    const yS = (p: number) => padT + (1 - (p - minP) / rangeP) * (h - padT - padB);
    const d = data.map((pt, i) => `${i === 0 ? 'M' : 'L'}${xS(i).toFixed(1)},${yS(pt.price).toFixed(1)}`).join(' ');
    return { pathD: d, minPrice: minP, maxPrice: maxP, width: w, height: h, xScale: xS, yScale: yS };
  }, [data]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || data.length < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const idx = Math.round(((e.clientX - rect.left) / rect.width) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    const pt = data[clamped];
    const x = (clamped / (data.length - 1)) * rect.width;
    const y = yScale(pt.price) * (rect.height / height);
    setTooltip({ x, y, point: pt });
  }, [data, height, yScale]);

  if (data.length < 2) return null;
  const gradId = `grad-${color.replace(/[^a-z0-9]/gi, '')}`;

  return (
    <div className="relative w-full" onMouseLeave={() => setTooltip(null)}>
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"
        className="w-full" style={{ height: 180 }} onMouseMove={handleMouseMove}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${pathD} L${width},${height} L0,${height} Z`} fill={`url(#${gradId})`} />
        <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        {tooltip && (
          <circle cx={xScale(data.indexOf(tooltip.point))} cy={yScale(tooltip.point.price)}
            r="4" fill={color} stroke="white" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <div className="absolute right-0 top-0 h-full flex flex-col justify-between pointer-events-none pr-1 py-2">
        <span className="text-[9px] font-sans text-brand-muted">${maxPrice >= 1000 ? (maxPrice / 1000).toFixed(1) + 'k' : maxPrice.toFixed(0)}</span>
        <span className="text-[9px] font-sans text-brand-muted">${minPrice >= 1000 ? (minPrice / 1000).toFixed(1) + 'k' : minPrice.toFixed(0)}</span>
      </div>
      {tooltip && (
        <div className="absolute pointer-events-none bg-brand-surface border border-brand-border rounded px-2.5 py-1.5 text-xs font-sans shadow-lg z-10 whitespace-nowrap"
          style={{ left: Math.min(tooltip.x, 200), top: Math.max(tooltip.y - 50, 0), transform: 'translateX(-50%)' }}>
          <p className="text-brand-muted text-[10px] mb-0.5">{tooltip.point.time}</p>
          <p className="font-bold" style={{ color }}>{fmt(tooltip.point.price)}</p>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, ticker, color, data, loading, error, currentPrice, changePercent, onRetry, range, onRangeChange }: {
  title: string; ticker: string; color: string; data: PricePoint[];
  loading: boolean; error: string | null; currentPrice: number; changePercent: number;
  onRetry: () => void; range: number; onRangeChange: (d: number) => void;
}) {
  const isUp = changePercent >= 0;
  return (
    <div className="bg-brand-surface border border-brand-border rounded overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-border flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-sans font-bold uppercase tracking-widest text-brand-muted">{ticker}</span>
            {!loading && !error && currentPrice > 0 && (
              <span className={`text-[10px] font-sans font-bold px-1.5 py-0.5 rounded ${isUp ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                {isUp ? '+' : ''}{changePercent.toFixed(2)}%
              </span>
            )}
          </div>
          <div className="flex items-end gap-2">
            <span className="text-xl font-bold text-brand-text">{loading ? '—' : error ? '—' : currentPrice > 0 ? fmt(currentPrice) : '—'}</span>
            {!loading && !error && currentPrice > 0 && (isUp ? <TrendingUp className="w-4 h-4 text-green-400 mb-0.5" /> : <TrendingDown className="w-4 h-4 text-red-400 mb-0.5" />)}
          </div>
          <div className="text-xs text-brand-muted font-sans mt-0.5">{title}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {RANGE_OPTIONS.map(opt => (
              <button key={opt.label} onClick={() => onRangeChange(opt.days)}
                className={`px-2 py-1 rounded text-[10px] font-sans font-semibold transition-all ${range === opt.days ? 'bg-brand-gold text-brand-bg' : 'text-brand-muted hover:text-brand-text border border-brand-border hover:border-brand-gold/40'}`}>
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={onRetry} className="text-brand-muted hover:text-brand-gold transition-colors p-1" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      <div className="p-4">
        {loading ? (
          <div className="h-[180px] flex items-center justify-center flex-col gap-2">
            <RefreshCw className="w-5 h-5 text-brand-muted animate-spin" />
            <span className="text-xs text-brand-muted font-sans">Loading market data…</span>
          </div>
        ) : error ? (
          <div className="h-[180px] flex items-center justify-center flex-col gap-3">
            <span className="text-xs text-brand-muted font-sans text-center max-w-48">{error}</span>
            <button onClick={onRetry} className="text-xs font-sans border border-brand-border text-brand-muted hover:text-brand-gold hover:border-brand-gold/40 px-3 py-1.5 rounded transition-colors">
              Retry
            </button>
          </div>
        ) : (
          <SVGLineChart data={data} color={color} />
        )}
      </div>
    </div>
  );
}

function useMarket(fetcher: () => Promise<PricePoint[]>) {
  const [state, setState] = useState<MarketData>({ points: [], currentPrice: 0, changePercent: 0, loading: true, error: null });
  const load = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const points = await fetcher();
      const first = points[0].price;
      const last = points[points.length - 1].price;
      setState({ points, currentPrice: last, changePercent: ((last - first) / first) * 100, loading: false, error: null });
    } catch (e: any) {
      setState(prev => ({ ...prev, loading: false, error: e?.message ?? 'Unable to load data' }));
    }
  }, [fetcher]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load };
}

interface MarketChartsProps {
  compact?: boolean;
}

export default function MarketCharts({ compact = false }: MarketChartsProps) {
  const [btcDays, setBtcDays] = useState(7);
  const [ethDays, setEthDays] = useState(7);
  const [goldDays, setGoldDays] = useState(7);

  const btcFetcher = useCallback(() => fetchCryptoChart('bitcoin', btcDays), [btcDays]);
  const ethFetcher = useCallback(() => fetchCryptoChart('ethereum', ethDays), [ethDays]);
  const goldFetcher = useCallback(() => fetchGoldChart(goldDays), [goldDays]);

  const btc = useMarket(btcFetcher);
  const eth = useMarket(ethFetcher);
  const gold = useMarket(goldFetcher);

  return (
    <div className="space-y-4">
      {!compact && (
        <div>
          <h3 className="text-sm font-semibold text-brand-text mb-0.5">Live Market Data</h3>
          <p className="text-xs text-brand-muted font-sans">Real-time prices via CoinGecko & Yahoo Finance — proxied through our servers</p>
        </div>
      )}
      <div className={`grid gap-4 ${compact ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'}`}>
        <ChartCard title="Bitcoin / US Dollar" ticker="BTC/USD" color="#f59e0b"
          data={btc.points} loading={btc.loading} error={btc.error}
          currentPrice={btc.currentPrice} changePercent={btc.changePercent}
          onRetry={btc.reload} range={btcDays} onRangeChange={setBtcDays} />
        <ChartCard title="Ethereum / US Dollar" ticker="ETH/USD" color="#818cf8"
          data={eth.points} loading={eth.loading} error={eth.error}
          currentPrice={eth.currentPrice} changePercent={eth.changePercent}
          onRetry={eth.reload} range={ethDays} onRangeChange={setEthDays} />
        {!compact && (
          <ChartCard title="Gold Futures (COMEX)" ticker="XAU/USD" color="#d4af37"
            data={gold.points} loading={gold.loading} error={gold.error}
            currentPrice={gold.currentPrice} changePercent={gold.changePercent}
            onRetry={gold.reload} range={goldDays} onRangeChange={setGoldDays} />
        )}
      </div>
      {compact && (
        <ChartCard title="Gold Futures (COMEX)" ticker="XAU/USD" color="#d4af37"
          data={gold.points} loading={gold.loading} error={gold.error}
          currentPrice={gold.currentPrice} changePercent={gold.changePercent}
          onRetry={gold.reload} range={goldDays} onRangeChange={setGoldDays} />
      )}
    </div>
  );
}
