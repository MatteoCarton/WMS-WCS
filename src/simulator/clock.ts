export interface SimulationClock {
  readonly now: () => number;
  readonly advance: (milliseconds: number) => void;
}

export function createClock(): SimulationClock {
  let elapsed = 0;

  return {
    now: () => elapsed,
    advance: (milliseconds) => {
      elapsed = elapsed + milliseconds;
    },
  };
}
