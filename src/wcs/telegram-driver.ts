import net from "node:net";
import { decode } from "../telegram/decode.js";
import { encode } from "../telegram/encode.js";
import type { TelegramValues } from "../telegram/format.js";
import { frameLength, moveFields, reportFields } from "../telegram/format.js";
import { createFramer } from "../telegram/framer.js";
import type {
  EquipmentDriver,
  MoveCommand,
  MoveOutcome,
  MoveReport,
  ReportHandler,
} from "./driver.js";

export interface TelegramDriverOptions {
  readonly host: string;
  readonly port: number;
  readonly name: string;
}

const OUTCOMES: Readonly<Record<string, MoveOutcome>> = {
  ACPT: "accepted",
  REJT: "rejected",
  DONE: "completed",
  FAIL: "failed",
};

function toReport(values: TelegramValues): MoveReport | null {
  const taskId = values["taskId"];
  const code = values["outcome"];
  const equipmentId = values["equipment"];
  const at = values["at"];

  if (
    taskId === undefined ||
    code === undefined ||
    equipmentId === undefined ||
    at === undefined
  ) {
    return null;
  }

  const outcome = OUTCOMES[code];

  if (outcome === undefined) {
    return null;
  }

  return { taskId, outcome, equipmentId, at: Number(at) };
}

export function connectTelegramDriver(
  options: TelegramDriverOptions,
): Promise<EquipmentDriver> {
  return new Promise((resolve, reject) => {
    const handlers = new Set<ReportHandler>();
    const framer = createFramer(frameLength(reportFields));

    let sequence = 0;

    const socket = net.createConnection(
      { host: options.host, port: options.port },
      () => {
        resolve({
          name: options.name,

          send: (command: MoveCommand) => {
            sequence += 1;

            const framed = encode(moveFields, {
              type: "MOVE",
              sequence: String(sequence),
              taskId: command.taskId,
              lpn: command.lpn,
              from: command.from,
              to: command.to,
            });

            if (!framed.ok) {
              console.error(`${options.name}: cannot encode`, framed.error);
              return;
            }

            socket.write(framed.value);
          },

          onReport: (handler: ReportHandler) => {
            handlers.add(handler);
          },

          close: () =>
            new Promise((done) => {
              socket.end(() => done());
            }),
        });
      },
    );

    socket.setEncoding("ascii");
    socket.once("error", reject);

    socket.on("data", (chunk: string) => {
      for (const frame of framer.push(chunk)) {
        const parsed = decode(reportFields, frame);

        if (!parsed.ok) {
          console.error(`${options.name}: unreadable report`, parsed.error);
          continue;
        }

        const report = toReport(parsed.value);

        if (report === null) {
          console.error(`${options.name}: unusable report`, parsed.value);
          continue;
        }

        for (const handler of handlers) {
          handler(report);
        }
      }
    });
  });
}
