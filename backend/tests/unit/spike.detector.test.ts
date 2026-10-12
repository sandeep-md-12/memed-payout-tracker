import { detectSpike, type SpikeRule } from '../../src/services/spike.detector';

const rule: SpikeRule = { minGain: 5_000, maxViewsPerHour: 50_000 };
const start = new Date('2026-10-13T10:00:00Z');
const minutesLater = (m: number) => new Date(start.getTime() + m * 60_000);

describe('detectSpike', () => {
  it('flags a big gain that arrives too fast', () => {
    // +40K in 2 minutes = 1.2M views/hour
    expect(detectSpike({ views: 10_000, at: start }, { views: 50_000, at: minutesLater(2) }, rule)).toEqual({
      viewsGained: 40_000,
      minutes: 2,
    });
  });

  it('ignores the same gain spread over a normal amount of time', () => {
    // +40K in 2 hours = 20K views/hour
    expect(detectSpike({ views: 10_000, at: start }, { views: 50_000, at: minutesLater(120) }, rule)).toBeNull();
  });

  it('ignores small gains, however fast (avoids flagging tiny posts)', () => {
    expect(detectSpike({ views: 0, at: start }, { views: 4_999, at: minutesLater(0.1) }, rule)).toBeNull();
  });

  it('ignores drops in views', () => {
    expect(detectSpike({ views: 90_000, at: start }, { views: 10_000, at: minutesLater(1) }, rule)).toBeNull();
  });

  it('treats a pace exactly at the limit as normal', () => {
    // +50K in exactly 1 hour
    expect(detectSpike({ views: 0, at: start }, { views: 50_000, at: minutesLater(60) }, rule)).toBeNull();
  });

  it('handles two reports with the same timestamp without dividing by zero', () => {
    expect(detectSpike({ views: 0, at: start }, { views: 10_000, at: start }, rule)?.viewsGained).toBe(10_000);
  });
});
