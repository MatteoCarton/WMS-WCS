import type { Result } from "./result.js";
import { err, ok } from "./result.js";

export type TransitionTable<S extends string> = Readonly<
  Record<S, readonly S[]>
>;

export interface IllegalTransition<S extends string> {
  readonly from: S;
  readonly to: S;
  readonly allowed: readonly S[];
}

export function allowedTargets<S extends string>(
  table: TransitionTable<S>,
  from: S,
): readonly S[] {
  return table[from];
}

export function isTerminal<S extends string>(
  table: TransitionTable<S>,
  state: S,
): boolean {
  return table[state].length === 0;
}

export function canTransition<S extends string>(
  table: TransitionTable<S>,
  from: S,
  to: S,
): boolean {
  return table[from].includes(to);
}

export function transition<S extends string>(
  table: TransitionTable<S>,
  from: S,
  to: S,
): Result<S, IllegalTransition<S>> {
  return canTransition(table, from, to)
    ? ok(to)
    : err({ from, to, allowed: table[from] });
}
