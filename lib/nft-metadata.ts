export interface NftMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
}

export interface RunForMetadata {
  eraId: string;
  eraName: string;
  token: string;
  score: number;
  tricks: string[];
  survived: boolean;
  player: string;
}

export function buildMetadata(run: RunForMetadata, ipfsCid: string): NftMetadata {
  const outcome = run.survived ? 'Survived' : 'Wipeout';
  return {
    name: `WAVE — ${run.eraName}`,
    description: `${outcome} on ${run.eraName} (${run.token}) · ${run.score.toLocaleString()} pts · ${run.tricks.length} trick${run.tricks.length !== 1 ? 's' : ''}.`,
    image: `ipfs://${ipfsCid}`,
    external_url: 'https://wave.surf',
    attributes: [
      { trait_type: 'Era',     value: run.eraName },
      { trait_type: 'Token',   value: run.token },
      { trait_type: 'Score',   value: run.score },
      { trait_type: 'Tricks',  value: run.tricks.length },
      { trait_type: 'Outcome', value: outcome },
    ],
  };
}
