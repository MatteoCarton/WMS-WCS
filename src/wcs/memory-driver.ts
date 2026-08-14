import type {
  EquipmentDriver,
  MoveCommand,
  MoveReport,
  ReportHandler,
} from "./driver.js";

export interface MemoryDriver extends EquipmentDriver {
  readonly sent: () => readonly MoveCommand[];
  readonly emit: (report: MoveReport) => void;
}

export function createMemoryDriver(name: string): MemoryDriver {
  const handlers = new Set<ReportHandler>();
  const commands: MoveCommand[] = [];

  return {
    name,

    send: (command) => {
      commands.push(command);
    },

    onReport: (handler) => {
      handlers.add(handler);
    },

    close: () => Promise.resolve(),

    sent: () => commands,

    emit: (report) => {
      for (const handler of handlers) {
        handler(report);
      }
    },
  };
}
