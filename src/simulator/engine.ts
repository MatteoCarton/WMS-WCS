import type { Lpn } from "../domain/container.js";
import type { LocationCode } from "../domain/location.js";
import type { TaskId } from "../domain/task.js";
import type { Equipment, EquipmentId, Movement } from "./equipment.js";
import {
  DROP_SECONDS,
  PICK_SECONDS,
  finishMovement,
  startMovement,
} from "./equipment.js";
import { simultaneousTravelTime } from "./kinematics.js";
import type { Layout, Point } from "./layout.js";
import {
  AISLE_HEAD,
  horizontalDistance,
  parseRackCode,
  verticalDistance,
} from "./layout.js";

export interface MoveOrder {
  readonly taskId: TaskId;
  readonly lpn: Lpn;
  readonly from: LocationCode;
  readonly to: LocationCode;
}

export type ReportOutcome = "accepted" | "rejected" | "completed" | "failed";

export type RejectionReason =
  | "unknown_source"
  | "no_equipment_for_aisle"
  | "equipment_busy";

export interface Report {
  readonly taskId: TaskId;
  readonly outcome: ReportOutcome;
  readonly equipmentId: EquipmentId;
  readonly at: number;
  readonly reason: RejectionReason | null;
}

export interface Simulation {
  readonly now: number;
  readonly layout: Layout;
  readonly equipment: readonly Equipment[];
}

export interface Submission {
  readonly simulation: Simulation;
  readonly report: Report;
}

export interface Advance {
  readonly simulation: Simulation;
  readonly reports: readonly Report[];
}

function seconds(value: number): number {
  return Math.round(value * 1000);
}

function pointOf(layout: Layout, code: LocationCode): Point {
  return layout[code] ?? AISLE_HEAD;
}

function legSeconds(equipment: Equipment, from: Point, to: Point): number {
  return simultaneousTravelTime([
    { profile: equipment.horizontal, distance: horizontalDistance(from, to) },
    { profile: equipment.vertical, distance: verticalDistance(from, to) },
  ]);
}

export function cycleSeconds(
  equipment: Equipment,
  source: Point,
  destination: Point,
): number {
  return (
    legSeconds(equipment, equipment.position, source) +
    PICK_SECONDS +
    legSeconds(equipment, source, destination) +
    DROP_SECONDS
  );
}

function rejection(
  order: MoveOrder,
  equipmentId: EquipmentId,
  at: number,
  reason: RejectionReason,
): Report {
  return { taskId: order.taskId, outcome: "rejected", equipmentId, at, reason };
}

export function submit(simulation: Simulation, order: MoveOrder): Submission {
  const source = parseRackCode(order.from);

  if (source === null) {
    return {
      simulation,
      report: rejection(order, "", simulation.now, "unknown_source"),
    };
  }

  const crane = simulation.equipment.find(
    (candidate) =>
      candidate.kind === "stacker_crane" && candidate.aisle === source.aisle,
  );

  if (crane === undefined) {
    return {
      simulation,
      report: rejection(order, "", simulation.now, "no_equipment_for_aisle"),
    };
  }

  if (crane.state !== "idle") {
    return {
      simulation,
      report: rejection(order, crane.id, simulation.now, "equipment_busy"),
    };
  }

  const sourcePoint = pointOf(simulation.layout, order.from);
  const targetPoint = pointOf(simulation.layout, order.to);

  const movement: Movement = {
    taskId: order.taskId,
    lpn: order.lpn,
    from: order.from,
    to: order.to,
    target: targetPoint,
    startedAt: simulation.now,
    finishesAt:
      simulation.now + seconds(cycleSeconds(crane, sourcePoint, targetPoint)),
  };

  const started = startMovement(crane, movement);

  if (!started.ok) {
    return {
      simulation,
      report: rejection(order, crane.id, simulation.now, "equipment_busy"),
    };
  }

  return {
    simulation: {
      ...simulation,
      equipment: simulation.equipment.map((candidate) =>
        candidate.id === crane.id ? started.value : candidate,
      ),
    },
    report: {
      taskId: order.taskId,
      outcome: "accepted",
      equipmentId: crane.id,
      at: simulation.now,
      reason: null,
    },
  };
}

interface Completion {
  readonly equipment: Equipment;
  readonly report: Report;
}

function complete(equipment: Equipment, now: number): readonly Completion[] {
  const movement = equipment.movement;

  if (movement === null || movement.finishesAt > now) {
    return [];
  }

  const settled = finishMovement(equipment);

  if (!settled.ok) {
    return [];
  }

  return [
    {
      equipment: settled.value,
      report: {
        taskId: movement.taskId,
        outcome: "completed",
        equipmentId: equipment.id,
        at: movement.finishesAt,
        reason: null,
      },
    },
  ];
}

export function advanceTo(simulation: Simulation, now: number): Advance {
  const completions = simulation.equipment.flatMap((equipment) =>
    complete(equipment, now),
  );

  const settled = new Map(
    completions.map((completion) => [
      completion.equipment.id,
      completion.equipment,
    ]),
  );

  return {
    simulation: {
      ...simulation,
      now,
      equipment: simulation.equipment.map(
        (equipment) => settled.get(equipment.id) ?? equipment,
      ),
    },
    reports: completions
      .map((completion) => completion.report)
      .sort((a, b) => a.at - b.at),
  };
}
