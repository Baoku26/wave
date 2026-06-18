type Network = 'mainnet' | 'testnet';

const CONTRACT_ADDRESSES: Record<Network, {
  waveToken: string;
  waveGame:  string;
  waveNft:   string;
}> = {
  mainnet: {
    waveToken: 'SP_DEPLOYER.wave-token',
    waveGame:  'SP_DEPLOYER.wave-game',
    waveNft:   'SP_DEPLOYER.wave-nft',
  },
  testnet: {
    waveToken: 'ST3ZVYXZWTR3Y7XNCK7RAM2KD4G77SKNBW6T4YH2W.wave-token',
    waveGame:  'ST3ZVYXZWTR3Y7XNCK7RAM2KD4G77SKNBW6T4YH2W.wave-game',
    waveNft:   'ST3ZVYXZWTR3Y7XNCK7RAM2KD4G77SKNBW6T4YH2W.wave-nft',
  },
};

export function getContracts(network?: Network) {
  const net = network ?? ((process.env.NEXT_PUBLIC_NETWORK as Network) || 'testnet');
  return CONTRACT_ADDRESSES[net];
}

export const CONTRACTS = CONTRACT_ADDRESSES;
