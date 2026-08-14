import net from "node:net";
import { decode } from "../telegram/decode.js";
import { encode } from "../telegram/encode.js";
import type { TelegramValues } from "../telegram/format.js";
import { frameLength, moveFields, reportFields } from "../telegram/format.js";
import { createFramer } from "../telegram/framer.js";
import { createClock } from "./clock.js";
import type {
  MoveOrder,
  Report,
  ReportOutcome,
  Simulation,
} from "./engine.js";
import { advanceTo, submit } from "./engine.js";
import { cartonCrane } from "./equipment.js";
import { buildLayout, cartonAddresses } from "./layout.js";

export interface SimulatorOptions {
  readonly port: number;
  readonly aisles: number;
  readonly tickMilliseconds: number;
  readonly speedFactor: number;
}

export interface Simulator {
  readonly port: number;
  readonly stop: () => Promise<void>;
}

export const DEFAULT_OPTIONS: SimulatorOptions = {
  port: 5002,
  aisles: 6,
  tickMilliseconds: 50,
  speedFactor: 1,
};

const OUTCOME_CODES: Readonly<Record<ReportOutcome, string>> = {
  accepted: "ACPT",
  rejected: "REJT",
  completed: "DONE",
  failed: "FAIL",
};

function toOrder(values: TelegramValues): MoveOrder | null {
  const taskId = values["taskId"];
  const lpn = values["lpn"];
  const from = values["from"];
  const to = values["to"];

  if (
    taskId === undefined ||
    lpn === undefined ||
    from === undefined ||
    to === undefined
  ) {
    return null;
  }

  return { taskId, lpn, from, to };
}

export function startSimulator(
  options: SimulatorOptions = DEFAULT_OPTIONS,
): Promise<Simulator> {
  const clock = createClock();
  const clients = new Set<net.Socket>();

  let simulation: Simulation = {
    now: 0,
    layout: buildLayout(cartonAddresses()),
    equipment: Array.from({ length: options.aisles }, (_, index) =>
      cartonCrane(index + 1),
    ),
  };

  let sequence = 0;

  function frameOf(report: Report): string | null {
    sequence += 1;

    const framed = encode(reportFields, {
      type: "RPRT",
      sequence: String(sequence),
      taskId: report.taskId,
      outcome: OUTCOME_CODES[report.outcome],
      equipment: report.equipmentId,
      at: String(report.at),
    });

    if (!framed.ok) {
      console.error("simulator: cannot encode report", framed.error);
      return null;
    }

    return framed.value;
  }

  function send(socket: net.Socket, report: Report): void {
    const frame = frameOf(report);

    if (frame !== null) {
      socket.write(frame);
    }
  }

  function broadcast(reports: readonly Report[]): void {
    for (const report of reports) {
      const frame = frameOf(report);

      if (frame === null) {
        continue;
      }

      for (const client of clients) {
        client.write(frame);
      }
    }
  }

  function handle(socket: net.Socket, frame: string): void {
    const parsed = decode(moveFields, frame);

    if (!parsed.ok) {
      console.error("simulator: unreadable frame", parsed.error);
      return;
    }

    const order = toOrder(parsed.value);

    if (order === null) {
      console.error("simulator: frame is missing a field");
      return;
    }

    const submitted = submit(simulation, order);
    simulation = submitted.simulation;
    send(socket, submitted.report);
  }

  const server = net.createServer({ allowHalfOpen: true }, (socket) => {
    const framer = createFramer(frameLength(moveFields));

    clients.add(socket);
    socket.setEncoding("ascii");

    socket.on("data", (chunk: string) => {
      for (const frame of framer.push(chunk)) {
        handle(socket, frame);
      }
    });

    socket.on("close", () => clients.delete(socket));
    socket.on("error", () => clients.delete(socket));
  });

  const timer = setInterval(() => {
    clock.advance(options.tickMilliseconds * options.speedFactor);

    const advanced = advanceTo(simulation, clock.now());
    simulation = advanced.simulation;

    broadcast(advanced.reports);
  }, options.tickMilliseconds);

  return new Promise((resolve, reject) => {
    server.once("error", reject);

    server.listen(options.port, () => {
      const address = server.address();

      resolve({
        port: typeof address === "object" && address !== null ? address.port : options.port,
        stop: () =>
          new Promise((done) => {
            clearInterval(timer);
            for (const client of clients) {
              client.destroy();
            }
            server.close(() => done());
          }),
      });
    });
  });
}
