import type { Lpn } from "../domain/container.js";
import type { LocationCode } from "../domain/location.js";
import type { Result } from "../domain/result.js";
import { ok } from "../domain/result.js";
import type {
  IllegalTransition,
  TransitionTable,
} from "../domain/state-machine.js";
import { transition } from "../domain/state-machine.js";
import type { TaskId } from "../domain/task.js";
import { pad } from "../shared/pad.js";
import type { MotionProfile } from "./kinematics.js";
import type { Point } from "./layout.js";
import { AISLE_HEAD } from "./layout.js";

export type EquipmentId = string;

export type EquipmentKind = "stacker_crane" | "conveyor" | "pick_station";

export type EquipmentState = "idle" | "busy" | "faulted";

export interface Movement {
  readonly taskId: TaskId;
  readonly lpn: Lpn;
  readonly from: LocationCode;
  readonly to: LocationCode;
  readonly target: Point;
  readonly startedAt: number;
  readonly finishesAt: number;
}

export interface Equipment {
  readonly id: EquipmentId;
  readonly kind: EquipmentKind;
  readonly state: EquipmentState;
  readonly aisle: number;
  readonly position: Point;
  readonly horizontal: MotionProfile;
  readonly vertical: MotionProfile;
  readonly movement: Movement | null;
}

export const equipmentTransitions: TransitionTable<EquipmentState> = {
  idle: ["busy", "faulted"],
  busy: ["idle", "faulted"],
  faulted: ["idle"],
};

export const CARTON_CRANE_HORIZONTAL: MotionProfile = {
  maxSpeed: 6,
  acceleration: 3,
};

export const CARTON_CRANE_VERTICAL: MotionProfile = {
  maxSpeed: 3,
  acceleration: 3,
};

export const PICK_SECONDS = 3;
export const DROP_SECONDS = 3;

export function cartonCrane(aisle: number): Equipment {
  return {
    id: `SRM-C${pad(aisle, 2)}`,
    kind: "stacker_crane",
    state: "idle",
    aisle,
    position: AISLE_HEAD,
    horizontal: CARTON_CRANE_HORIZONTAL,
    vertical: CARTON_CRANE_VERTICAL,
    movement: null,
  };
}

export function changeEquipmentState(
  equipment: Equipment,
  to: EquipmentState,
): Result<Equipment, IllegalTransition<EquipmentState>> {
  const next = transition(equipmentTransitions, equipment.state, to);
  return next.ok ? ok({ ...equipment, state: next.value }) : next;
}

export function startMovement(
  equipment: Equipment,
  movement: Movement,
): Result<Equipment, IllegalTransition<EquipmentState>> {
  const busy = changeEquipmentState(equipment, "busy");
  return busy.ok ? ok({ ...busy.value, movement }) : busy;
}

export function finishMovement(
  equipment: Equipment,
): Result<Equipment, IllegalTransition<EquipmentState>> {
  const idle = changeEquipmentState(equipment, "idle");

  if (!idle.ok) {
    return idle;
  }

  const position = equipment.movement?.target ?? equipment.position;

  return ok({ ...idle.value, position, movement: null });
}
