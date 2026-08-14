import { DEFAULT_OPTIONS, startSimulator } from "./server.js";

const speedFactor = Number(
  process.env["SPEED"] ?? String(DEFAULT_OPTIONS.speedFactor),
);

const port = Number(process.env["PORT"] ?? String(DEFAULT_OPTIONS.port));

const simulator = await startSimulator({
  ...DEFAULT_OPTIONS,
  port,
  speedFactor,
});

console.log(
  `simulator listening on ${simulator.port}, ${DEFAULT_OPTIONS.aisles} carton aisles, speed x${speedFactor}`,
);
