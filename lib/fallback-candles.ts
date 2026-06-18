// Hard-coded OHLC data used when CoinGecko is unavailable (rate-limited, no key, offline).
// Prices are approximate historical values — close enough for accurate gameplay shape.
// TerrainGenerator normalises from raw prices so exact values don't need to be perfect.

export type RawCandle = {
  date: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

// Mar 1–28 2021 · STX 5× bull run
const STX_BULL_2021: RawCandle[] = [
  { date: 1614556800, open: 0.40, high: 0.44, low: 0.38, close: 0.42 },
  { date: 1614643200, open: 0.42, high: 0.50, low: 0.41, close: 0.48 },
  { date: 1614729600, open: 0.48, high: 0.55, low: 0.46, close: 0.52 },
  { date: 1614816000, open: 0.52, high: 0.60, low: 0.51, close: 0.55 },
  { date: 1614902400, open: 0.55, high: 0.68, low: 0.53, close: 0.65 },
  { date: 1614988800, open: 0.65, high: 0.75, low: 0.62, close: 0.72 },
  { date: 1615075200, open: 0.72, high: 0.78, low: 0.68, close: 0.70 },
  { date: 1615161600, open: 0.70, high: 0.85, low: 0.68, close: 0.82 },
  { date: 1615248000, open: 0.82, high: 0.98, low: 0.80, close: 0.95 },
  { date: 1615334400, open: 0.95, high: 1.10, low: 0.92, close: 1.05 },
  { date: 1615420800, open: 1.05, high: 1.18, low: 1.00, close: 1.12 },
  { date: 1615507200, open: 1.12, high: 1.20, low: 1.04, close: 1.08 },
  { date: 1615593600, open: 1.08, high: 1.25, low: 1.06, close: 1.20 },
  { date: 1615680000, open: 1.20, high: 1.40, low: 1.18, close: 1.35 },
  { date: 1615766400, open: 1.35, high: 1.60, low: 1.30, close: 1.55 },
  { date: 1615852800, open: 1.55, high: 1.65, low: 1.42, close: 1.48 },
  { date: 1615939200, open: 1.48, high: 1.70, low: 1.44, close: 1.62 },
  { date: 1616025600, open: 1.62, high: 1.68, low: 1.35, close: 1.42 },
  { date: 1616112000, open: 1.42, high: 1.65, low: 1.38, close: 1.58 },
  { date: 1616198400, open: 1.58, high: 1.82, low: 1.52, close: 1.75 },
  { date: 1616284800, open: 1.75, high: 1.95, low: 1.70, close: 1.88 },
  { date: 1616371200, open: 1.88, high: 2.10, low: 1.82, close: 2.02 },
  { date: 1616457600, open: 2.02, high: 2.12, low: 1.88, close: 1.95 },
  { date: 1616544000, open: 1.95, high: 2.15, low: 1.88, close: 2.05 },
  { date: 1616630400, open: 2.05, high: 2.08, low: 1.78, close: 1.85 },
  { date: 1616716800, open: 1.85, high: 1.90, low: 1.65, close: 1.72 },
  { date: 1616803200, open: 1.72, high: 1.78, low: 1.58, close: 1.65 },
  { date: 1616889600, open: 1.65, high: 1.70, low: 1.52, close: 1.60 },
];

// May 10–24 2021 · STX 70% crash (Black May)
const STX_CRASH_2021: RawCandle[] = [
  { date: 1620604800, open: 0.84, high: 0.89, low: 0.80, close: 0.82 },
  { date: 1620691200, open: 0.82, high: 0.84, low: 0.68, close: 0.71 },
  { date: 1620777600, open: 0.71, high: 0.73, low: 0.54, close: 0.58 },
  { date: 1620864000, open: 0.58, high: 0.61, low: 0.44, close: 0.47 },
  { date: 1620950400, open: 0.47, high: 0.51, low: 0.37, close: 0.40 },
  { date: 1621036800, open: 0.40, high: 0.43, low: 0.31, close: 0.34 },
  { date: 1621123200, open: 0.34, high: 0.37, low: 0.26, close: 0.28 },
  { date: 1621209600, open: 0.28, high: 0.31, low: 0.23, close: 0.25 },
  { date: 1621296000, open: 0.25, high: 0.31, low: 0.23, close: 0.28 },
  { date: 1621382400, open: 0.28, high: 0.37, low: 0.26, close: 0.35 },
  { date: 1621468800, open: 0.35, high: 0.41, low: 0.31, close: 0.38 },
  { date: 1621555200, open: 0.38, high: 0.43, low: 0.33, close: 0.36 },
  { date: 1621641600, open: 0.36, high: 0.41, low: 0.33, close: 0.39 },
  { date: 1621728000, open: 0.39, high: 0.44, low: 0.35, close: 0.41 },
];

// Oct 22 – Nov 5 2024 · sBTC/BTC genesis candle (BTC ~$64k–$72k)
const SBTC_LAUNCH_2024: RawCandle[] = [
  { date: 1729555200, open: 64200, high: 65800, low: 63500, close: 65200 },
  { date: 1729641600, open: 65200, high: 67400, low: 64800, close: 67000 },
  { date: 1729728000, open: 67000, high: 68200, low: 66000, close: 67500 },
  { date: 1729814400, open: 67500, high: 68000, low: 64500, close: 65000 },
  { date: 1729900800, open: 65000, high: 66200, low: 63800, close: 64500 },
  { date: 1729987200, open: 64500, high: 67500, low: 64200, close: 67000 },
  { date: 1730073600, open: 67000, high: 71000, low: 66800, close: 70200 },
  { date: 1730160000, open: 70200, high: 72000, low: 69500, close: 71500 },
  { date: 1730246400, open: 71500, high: 73000, low: 70500, close: 72400 },
  { date: 1730332800, open: 72400, high: 73500, low: 70800, close: 71200 },
  { date: 1730419200, open: 71200, high: 72800, low: 70000, close: 72000 },
  { date: 1730505600, open: 72000, high: 73200, low: 70500, close: 71800 },
  { date: 1730592000, open: 71800, high: 72500, low: 70200, close: 71000 },
  { date: 1730678400, open: 71000, high: 72000, low: 69800, close: 70500 },
];

// Nov 1–30 2021 · ALEX Protocol ATH run (~$0.15 → ~$0.90)
const ALEX_ATH_2021: RawCandle[] = [
  { date: 1635724800, open: 0.15, high: 0.17, low: 0.14, close: 0.16 },
  { date: 1635811200, open: 0.16, high: 0.19, low: 0.15, close: 0.18 },
  { date: 1635897600, open: 0.18, high: 0.21, low: 0.17, close: 0.20 },
  { date: 1635984000, open: 0.20, high: 0.24, low: 0.19, close: 0.23 },
  { date: 1636070400, open: 0.23, high: 0.28, low: 0.22, close: 0.27 },
  { date: 1636156800, open: 0.27, high: 0.33, low: 0.26, close: 0.32 },
  { date: 1636243200, open: 0.32, high: 0.38, low: 0.30, close: 0.36 },
  { date: 1636329600, open: 0.36, high: 0.42, low: 0.34, close: 0.40 },
  { date: 1636416000, open: 0.40, high: 0.48, low: 0.38, close: 0.46 },
  { date: 1636502400, open: 0.46, high: 0.54, low: 0.44, close: 0.52 },
  { date: 1636588800, open: 0.52, high: 0.60, low: 0.49, close: 0.58 },
  { date: 1636675200, open: 0.58, high: 0.68, low: 0.55, close: 0.65 },
  { date: 1636761600, open: 0.65, high: 0.75, low: 0.62, close: 0.72 },
  { date: 1636848000, open: 0.72, high: 0.82, low: 0.70, close: 0.80 },
  { date: 1636934400, open: 0.80, high: 0.92, low: 0.78, close: 0.90 },
  { date: 1637020800, open: 0.90, high: 0.95, low: 0.78, close: 0.82 },
  { date: 1637107200, open: 0.82, high: 0.88, low: 0.72, close: 0.76 },
  { date: 1637193600, open: 0.76, high: 0.84, low: 0.74, close: 0.82 },
  { date: 1637280000, open: 0.82, high: 0.86, low: 0.74, close: 0.78 },
  { date: 1637366400, open: 0.78, high: 0.82, low: 0.70, close: 0.74 },
  { date: 1637452800, open: 0.74, high: 0.79, low: 0.68, close: 0.72 },
  { date: 1637539200, open: 0.72, high: 0.77, low: 0.66, close: 0.70 },
  { date: 1637625600, open: 0.70, high: 0.76, low: 0.65, close: 0.68 },
  { date: 1637712000, open: 0.68, high: 0.72, low: 0.62, close: 0.65 },
  { date: 1637798400, open: 0.65, high: 0.70, low: 0.60, close: 0.68 },
  { date: 1637884800, open: 0.68, high: 0.72, low: 0.62, close: 0.66 },
  { date: 1637971200, open: 0.66, high: 0.71, low: 0.61, close: 0.64 },
  { date: 1638057600, open: 0.64, high: 0.68, low: 0.58, close: 0.62 },
  { date: 1638144000, open: 0.62, high: 0.66, low: 0.56, close: 0.60 },
  { date: 1638230400, open: 0.60, high: 0.64, low: 0.55, close: 0.58 },
];

// Jan 1 – Feb 15 2024 · STX Nakamoto upgrade hype (~$0.55 → ~$3.50)
const STX_NAKAMOTO_2024: RawCandle[] = [
  { date: 1704067200, open: 0.55, high: 0.58, low: 0.53, close: 0.56 },
  { date: 1704153600, open: 0.56, high: 0.61, low: 0.54, close: 0.59 },
  { date: 1704240000, open: 0.59, high: 0.65, low: 0.57, close: 0.63 },
  { date: 1704326400, open: 0.63, high: 0.70, low: 0.61, close: 0.68 },
  { date: 1704412800, open: 0.68, high: 0.75, low: 0.65, close: 0.73 },
  { date: 1704499200, open: 0.73, high: 0.80, low: 0.70, close: 0.78 },
  { date: 1704585600, open: 0.78, high: 0.86, low: 0.75, close: 0.84 },
  { date: 1704672000, open: 0.84, high: 0.92, low: 0.81, close: 0.90 },
  { date: 1704758400, open: 0.90, high: 1.00, low: 0.87, close: 0.98 },
  { date: 1704844800, open: 0.98, high: 1.10, low: 0.95, close: 1.08 },
  { date: 1704931200, open: 1.08, high: 1.20, low: 1.04, close: 1.15 },
  { date: 1705017600, open: 1.15, high: 1.28, low: 1.10, close: 1.25 },
  { date: 1705104000, open: 1.25, high: 1.40, low: 1.20, close: 1.35 },
  { date: 1705190400, open: 1.35, high: 1.52, low: 1.30, close: 1.48 },
  { date: 1705276800, open: 1.48, high: 1.65, low: 1.42, close: 1.60 },
  { date: 1705363200, open: 1.60, high: 1.80, low: 1.55, close: 1.75 },
  { date: 1705449600, open: 1.75, high: 1.95, low: 1.70, close: 1.90 },
  { date: 1705536000, open: 1.90, high: 2.10, low: 1.85, close: 2.05 },
  { date: 1705622400, open: 2.05, high: 2.28, low: 1.98, close: 2.22 },
  { date: 1705708800, open: 2.22, high: 2.50, low: 2.15, close: 2.45 },
  { date: 1705795200, open: 2.45, high: 2.70, low: 2.35, close: 2.62 },
  { date: 1705881600, open: 2.62, high: 2.90, low: 2.50, close: 2.82 },
  { date: 1705968000, open: 2.82, high: 3.10, low: 2.70, close: 3.00 },
  { date: 1706054400, open: 3.00, high: 3.30, low: 2.88, close: 3.20 },
  { date: 1706140800, open: 3.20, high: 3.55, low: 3.05, close: 3.45 },
  { date: 1706227200, open: 3.45, high: 3.60, low: 3.10, close: 3.28 },
  { date: 1706313600, open: 3.28, high: 3.42, low: 2.95, close: 3.10 },
  { date: 1706400000, open: 3.10, high: 3.35, low: 2.98, close: 3.22 },
  { date: 1706486400, open: 3.22, high: 3.48, low: 3.08, close: 3.38 },
  { date: 1706572800, open: 3.38, high: 3.52, low: 3.18, close: 3.32 },
  { date: 1706659200, open: 3.32, high: 3.45, low: 3.05, close: 3.15 },
  { date: 1706745600, open: 3.15, high: 3.30, low: 2.90, close: 3.05 },
  { date: 1706832000, open: 3.05, high: 3.22, low: 2.85, close: 2.98 },
  { date: 1706918400, open: 2.98, high: 3.15, low: 2.80, close: 2.92 },
  { date: 1707004800, open: 2.92, high: 3.10, low: 2.78, close: 3.00 },
  { date: 1707091200, open: 3.00, high: 3.20, low: 2.88, close: 3.12 },
  { date: 1707177600, open: 3.12, high: 3.28, low: 2.95, close: 3.08 },
  { date: 1707264000, open: 3.08, high: 3.22, low: 2.92, close: 3.00 },
  { date: 1707350400, open: 3.00, high: 3.15, low: 2.85, close: 2.95 },
  { date: 1707436800, open: 2.95, high: 3.12, low: 2.80, close: 3.02 },
  { date: 1707523200, open: 3.02, high: 3.18, low: 2.88, close: 2.98 },
  { date: 1707609600, open: 2.98, high: 3.10, low: 2.82, close: 2.90 },
  { date: 1707696000, open: 2.90, high: 3.05, low: 2.75, close: 2.85 },
  { date: 1707782400, open: 2.85, high: 3.00, low: 2.70, close: 2.80 },
  { date: 1707868800, open: 2.80, high: 2.95, low: 2.65, close: 2.75 },
  { date: 1707955200, open: 2.75, high: 2.90, low: 2.60, close: 2.70 },
];

// Feb 10–28 2025 · sBTC/BTC deposit-cap removal (BTC ~$95k–$106k, volatile)
const SBTC_CAP_REMOVED_2025: RawCandle[] = [
  { date: 1739145600, open: 95800, high: 97500, low: 94500, close: 96500 },
  { date: 1739232000, open: 96500, high: 99000, low: 95800, close: 98200 },
  { date: 1739318400, open: 98200, high: 101000, low: 97500, close: 100400 },
  { date: 1739404800, open: 100400, high: 104000, low: 99500, close: 103200 },
  { date: 1739491200, open: 103200, high: 106500, low: 102000, close: 105800 },
  { date: 1739577600, open: 105800, high: 107000, low: 101000, close: 102500 },
  { date: 1739664000, open: 102500, high: 104000, low: 97500, close: 98800 },
  { date: 1739750400, open: 98800, high: 100500, low: 95000, close: 96200 },
  { date: 1739836800, open: 96200, high: 99000, low: 94800, close: 97500 },
  { date: 1739923200, open: 97500, high: 101500, low: 96800, close: 100800 },
  { date: 1740009600, open: 100800, high: 104500, low: 99500, close: 103500 },
  { date: 1740096000, open: 103500, high: 105800, low: 101000, close: 102800 },
  { date: 1740182400, open: 102800, high: 104200, low: 98500, close: 99500 },
  { date: 1740268800, open: 99500, high: 101000, low: 96000, close: 97200 },
  { date: 1740355200, open: 97200, high: 100500, low: 96500, close: 99800 },
  { date: 1740441600, open: 99800, high: 103000, low: 98500, close: 101800 },
  { date: 1740528000, open: 101800, high: 104000, low: 100000, close: 102500 },
  { date: 1740614400, open: 102500, high: 104500, low: 101000, close: 103000 },
];

export const FALLBACK_CANDLES: Record<string, RawCandle[]> = {
  'stx-bull-2021':         STX_BULL_2021,
  'stx-crash-2021':        STX_CRASH_2021,
  'sbtc-launch-2024':      SBTC_LAUNCH_2024,
  'alex-ath-2021':         ALEX_ATH_2021,
  'stx-nakamoto-2024':     STX_NAKAMOTO_2024,
  'sbtc-cap-removed-2025': SBTC_CAP_REMOVED_2025,
};
