import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BAY_PITCH,
  CARTON_AISLES,
  CARTON_BAYS,
  CARTON_LEVELS,
  buildLayout,
  cartonAddresses,
  horizontalDistance,
  rackCode,
  rackPoint,
  verticalDistance,
} from "./layout.js";

const layout = buildLayout(cartonAddresses());

test("the carton store holds 11 520 locations", () => {
  assert.equal(cartonAddresses().length, 11520);
  assert.equal(CARTON_AISLES * CARTON_BAYS * CARTON_LEVELS * 2, 11520);
});

test("every location has its own code", () => {
  assert.equal(Object.keys(layout).length, 11520);
});

test("codes follow the warehouse convention", () => {
  assert.equal(
    rackCode({ aisle: 3, bay: 45, level: 7, side: "A" }),
    "C03-045-07-A",
  );
});

test("the first bay sits at the aisle entrance", () => {
  const point = rackPoint({ aisle: 1, bay: 1, level: 1, side: "A" });

  assert.equal(point.x, 0);
  assert.equal(point.z, 0);
});

test("the aisle is 48 metres long", () => {
  const last = rackPoint({ aisle: 1, bay: CARTON_BAYS, level: 1, side: "A" });

  assert.equal(last.x, 47.4);
  assert.equal(last.x + BAY_PITCH, 48);
});

test("the top level sits 5,5 metres up", () => {
  const top = rackPoint({ aisle: 1, bay: 1, level: CARTON_LEVELS, side: "A" });

  assert.equal(top.z, 5.5);
});

test("the two sides face each other across the aisle", () => {
  const left = rackPoint({ aisle: 1, bay: 20, level: 4, side: "A" });
  const right = rackPoint({ aisle: 1, bay: 20, level: 4, side: "B" });

  assert.equal(left.y, -right.y);
  assert.equal(left.x, right.x);
  assert.equal(left.z, right.z);
});

test("distances ignore which side of the aisle a location is on", () => {
  const from = rackPoint({ aisle: 1, bay: 1, level: 1, side: "A" });
  const to = rackPoint({ aisle: 1, bay: 41, level: 12, side: "B" });

  assert.equal(horizontalDistance(from, to), 24);
  assert.equal(verticalDistance(from, to), 5.5);
});

test("distances never come out negative", () => {
  const near = rackPoint({ aisle: 1, bay: 5, level: 2, side: "A" });
  const far = rackPoint({ aisle: 1, bay: 60, level: 9, side: "A" });

  assert.equal(horizontalDistance(far, near), horizontalDistance(near, far));
  assert.equal(verticalDistance(far, near), verticalDistance(near, far));
});
