import type { Lpn } from "../domain/container.js";
import type { LocationCode } from "../domain/location.js";
import type { TaskId } from "../domain/task.js";

export type EquipmentId = string;

export interface MoveCommand {
  readonly taskId: TaskId;
  readonly lpn: Lpn;
  readonly from: LocationCode;
  readonly to: LocationCode;
}

export type MoveOutcome = "accepted" | "rejected" | "completed" | "failed";

export interface MoveReport {
  readonly taskId: TaskId;
  readonly outcome: MoveOutcome;
  readonly equipmentId: EquipmentId;
  readonly at: number;
}

export type ReportHandler = (report: MoveReport) => void;

export interface EquipmentDriver {
  readonly name: string;
  readonly send: (command: MoveCommand) => void;
  readonly onReport: (handler: ReportHandler) => void;
  readonly close: () => Promise<void>;
}
