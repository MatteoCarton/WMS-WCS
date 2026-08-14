import assert from "node:assert/strict";
import net from "node:net";
import type { TestContext } from "node:test";
import { test } from "node:test";
import { decode } from "../telegram/decode.js";
import { encode } from "../telegram/encode.js";
import type { TelegramValues } from "../telegram/format.js";
import { frameLength, moveFields, reportFields } from "../telegram/format.js";
import { createFramer } from "../telegram/framer.js";
import type { SimulatorOptions } from "./server.js";
import { startSimulator } from "./server.js";

const FAST: SimulatorOptions = {
  port: 0,
  aisles: 6,
  tickMilliseconds: 5,
  speedFactor: 200,
};

const REAL_TIME: SimulatorOptions = { ...FAST, speedFactor: 1 };

function moveFrame(taskId: string, from: string): string {
  const framed = encode(moveFields, {
    type: "MOVE",
    sequence: "1",
    taskId,
    lpn: "BIN00104",
    from,
    to: "PCK-02",
  });

  if (!framed.ok) {
    assert.fail(`cannot build the frame: ${JSON.stringify(framed.error)}`);
  }

  return framed.value;
}

function readReport(frame: string): TelegramValues {
  const parsed = decode(reportFields, frame);

  if (!parsed.ok) {
    assert.fail(`unreadable report: ${JSON.stringify(parsed.error)}`);
  }

  return parsed.value;
}

function outcomes(frames: readonly string[]): readonly string[] {
  return frames.map((frame) => readReport(frame)["outcome"] ?? "");
}

function collect(socket: net.Socket, count: number): Promise<readonly string[]> {
  return new Promise((resolve) => {
    const framer = createFramer(frameLength(reportFields));
    const frames: string[] = [];

    socket.setEncoding("ascii");
    socket.on("data", (chunk: string) => {
      frames.push(...framer.push(chunk));

      if (frames.length >= count) {
        resolve(frames);
      }
    });
  });
}

async function connected(
  t: TestContext,
  options: SimulatorOptions,
): Promise<net.Socket> {
  const simulator = await startSimulator(options);

  const socket = await new Promise<net.Socket>((resolve) => {
    const pending = net.createConnection({ port: simulator.port }, () =>
      resolve(pending),
    );
  });

  t.after(async () => {
    socket.destroy();
    await simulator.stop();
  });

  return socket;
}

test("an order is accepted, then reported done 18 seconds later", async (t) => {
  const socket = await connected(t, FAST);
  const reports = collect(socket, 2);

  socket.write(moveFrame("TSK00042", "C03-041-12-B"));

  const frames = await reports;
  assert.deepEqual(outcomes(frames), ["ACPT", "DONE"]);

  const accepted = readReport(frames[0] ?? "");
  const done = readReport(frames[1] ?? "");

  assert.equal(done["taskId"], "TSK00042");
  assert.equal(done["equipment"], "SRM-C03");
  assert.equal(Number(done["at"]) - Number(accepted["at"]), 18000);
});

test("an order for a busy crane is refused", async (t) => {
  const socket = await connected(t, REAL_TIME);
  const reports = collect(socket, 2);

  socket.write(moveFrame("TSK00042", "C03-041-12-B"));
  socket.write(moveFrame("TSK00043", "C03-002-01-A"));

  assert.deepEqual(outcomes(await reports), ["ACPT", "REJT"]);
});

test("orders split across arbitrary chunks are still understood", async (t) => {
  const socket = await connected(t, REAL_TIME);
  const reports = collect(socket, 2);

  const stream =
    moveFrame("TSK00042", "C03-041-12-B") +
    moveFrame("TSK00043", "C01-002-01-A");

  socket.write(stream.slice(0, 30));
  socket.write(stream.slice(30, 77));
  socket.write(stream.slice(77));

  assert.deepEqual(outcomes(await reports), ["ACPT", "ACPT"]);
});

test("the sequence number increases with every report", async (t) => {
  const socket = await connected(t, REAL_TIME);
  const reports = collect(socket, 2);

  socket.write(moveFrame("TSK00042", "C03-041-12-B"));
  socket.write(moveFrame("TSK00043", "C01-002-01-A"));

  const [first, second] = (await reports).map(readReport);

  assert.equal(Number(second?.["sequence"]) - Number(first?.["sequence"]), 1);
});
