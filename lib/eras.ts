export const ERAS = {
  'stx-bull-2021': {
    token: 'STX',
    name: 'The March Run',
    description: '10x in 3 weeks — the iconic Stacks moment',
    from: 1614556800, // Mar 1 2021
    to: 1617148800,   // Mar 28 2021
    difficulty: 'medium',
    accentColor: '#3B82F6',
  },
  'stx-crash-2021': {
    token: 'STX',
    name: 'Black May',
    description: '70% dump in days — survival challenge',
    from: 1620604800, // May 10 2021
    to: 1621814400,   // May 24 2021
    difficulty: 'hard',
    accentColor: '#3B82F6',
  },
  'sbtc-launch-2024': {
    token: 'sBTC',
    name: 'Genesis Candle',
    description: 'First sBTC candles — historic first',
    from: 1729555200, // Oct 22 2024
    to: 1730764800,   // Nov 5 2024
    difficulty: 'easy',
    accentColor: '#F7931A',
  },
  'alex-ath-2021': {
    token: 'ALEX',
    name: 'DeFi Summer',
    description: 'ALEX ATH — DeFi summer on Stacks',
    from: 1635724800, // Nov 1 2021
    to: 1638316800,   // Nov 30 2021
    difficulty: 'medium',
    accentColor: '#8B5CF6',
  },
  'stx-nakamoto-2024': {
    token: 'STX',
    name: 'Nakamoto Hype',
    description: '3x run on upgrade anticipation',
    from: 1704067200, // Jan 1 2024
    to: 1707955200,   // Feb 15 2024
    difficulty: 'medium',
    accentColor: '#3B82F6',
  },
  'sbtc-cap-removed-2025': {
    token: 'sBTC',
    name: 'Floodgates',
    description: 'Deposit cap removal — volatility event',
    from: 1739145600, // Feb 10 2025
    to: 1740787200,   // Feb 28 2025
    difficulty: 'hard',
    accentColor: '#F7931A',
  },
} as const;

export type EraId = keyof typeof ERAS;

export const ERA_LIST = Object.entries(ERAS).map(([id, config]) => ({
  id: id as EraId,
  ...config,
}));
