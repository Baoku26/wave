import { EventEmitter } from 'eventemitter3';

export interface OHLCCandle {
  date: number;
  open: number;
  high: number;
  low: number;
  close: number;
  normalised: number;
}

export interface TrickEvent {
  name: 'cutback' | 'aerial' | 'tube';
  points: number;
}

export interface RunCompletePayload {
  score: number;
  tricks: TrickEvent[];
  survived: boolean;
  distanceCandles: number;
  airtimeMs: number;
}

export interface ScoreUpdatePayload {
  score: number;
  multiplier: number;
  distanceCandles: number;
  airtimeMs: number;
}

export interface StartRunPayload {
  eraId: string;
  token: string;
  candles: OHLCCandle[];
  playerAddress: string;
}

type GameEvents = {
  'game-ready': [];
  'game-scene-ready': [];
  'start-run': [StartRunPayload];
  'run-complete': [RunCompletePayload];
  'trick-landed': [TrickEvent];
  'wipeout-warn': [];
  'wipeout': [];
  'score-update': [ScoreUpdatePayload];
};

class TypedEventBus extends EventEmitter<GameEvents> {}

export const EventBus = new TypedEventBus();
