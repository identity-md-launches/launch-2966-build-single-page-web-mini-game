import test from "node:test";
import assert from "node:assert/strict";
import { Game, GROUND, SEEDS_PER_BLOCK } from "../src/game.ts";
import { parseStatus, POLL_MS } from "../src/status.ts";
const advance = (g: Game, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 120) g.step(1 / 120);
};
const seedAtFeet = (g: Game) => {
  g.state.entities.push({
    id: 999,
    kind: "seed",
    angle: GROUND - 0.01,
    height: 24,
    wide: false,
    used: false,
  });
  g.step(0.01);
};
const spikeAtFeet = (g: Game) => {
  g.state.entities.push({
    id: 998,
    kind: "spike",
    angle: GROUND - 0.01,
    height: 32,
    wide: false,
    used: false,
  });
  g.step(0.01);
};
test("hold creates a higher jump, and midair presses do not double jump", () => {
  const tap = new Game(),
    hold = new Game();
  tap.start();
  hold.start();
  tap.press();
  tap.release();
  hold.press();
  let tapMax = 0,
    holdMax = 0;
  for (let i = 0; i < 120; i++) {
    tap.step(1 / 120);
    hold.step(1 / 120);
    tapMax = Math.max(tapMax, tap.state.jump);
    holdMax = Math.max(holdMax, hold.state.jump);
  }
  assert.ok(tapMax > 40);
  assert.ok(holdMax > tapMax * 1.8, `${holdMax} vs ${tapMax}`);
  hold.release();
  hold.press();
  advance(hold, 0.1);
  const before = hold.state.velocity;
  hold.release();
  hold.press();
  assert.equal(hold.state.velocity, before);
});
test("twelve seeds mine one block; streak raises combo, live bonus changes only points", () => {
  const base = new Game(),
    boost = new Game();
  base.start();
  boost.start();
  boost.boosted = true;
  for (let i = 0; i < SEEDS_PER_BLOCK; i++) {
    seedAtFeet(base);
    seedAtFeet(boost);
  }
  assert.equal(base.state.blocks, 1);
  assert.equal(base.state.seeds, 12);
  assert.equal(base.state.combo, 3);
  assert.ok(boost.state.score > base.state.score);
  assert.deepEqual(
    [base.state.jump, base.state.lives, base.state.rotation],
    [boost.state.jump, boost.state.lives, boost.state.rotation],
  );
});
test("spikes cost a heart, grant invulnerability, and three hits end a run", () => {
  const g = new Game();
  g.start();
  seedAtFeet(g);
  spikeAtFeet(g);
  assert.equal(g.state.lives, 2);
  spikeAtFeet(g);
  assert.equal(g.state.lives, 2);
  g.state.invincible = 0;
  spikeAtFeet(g);
  g.state.invincible = 0;
  spikeAtFeet(g);
  assert.equal(g.state.phase, "over");
  assert.equal(g.state.lives, 0);
  g.start();
  assert.equal(g.state.lives, 3);
  assert.equal(g.state.score, 0);
  assert.equal(g.state.phase, "running");
});
test("jumping over a spike is safe, paused state freezes and releases held input", () => {
  const g = new Game();
  g.start();
  g.press();
  advance(g, 0.2);
  assert.ok(g.state.jump > 34);
  spikeAtFeet(g);
  assert.equal(g.state.lives, 3);
  g.pause();
  const copy = JSON.stringify(g.state);
  advance(g, 1);
  assert.equal(JSON.stringify(g.state), copy);
  assert.equal(g.held, false);
  g.resume();
  g.step(0.01);
  assert.equal(g.state.phase, "running");
  assert.notEqual(JSON.stringify(g.state), copy);
});
test("later blocks increase speed and introduce wide spike patterns", () => {
  const slow = new Game(),
    fast = new Game();
  slow.start();
  fast.start();
  fast.state.blocks = 3;
  slow.step(0.02);
  fast.step(0.02);
  assert.ok(fast.state.rotation > slow.state.rotation);
  let sawWide = false;
  for (let i = 0; i < 600; i++) {
    fast.state.invincible = 1;
    fast.step(0.02);
    sawWide ||= fast.state.entities.some((e) => e.wide);
  }
  assert.ok(sawWide);
});
test("read-only telemetry uses milli-RPM and preserves large anchored heights as strings", () => {
  const s = parseStatus({
    measurement: { coreStatus: "SPINNING", rpmMilli: 12345 },
    builder: { anchor: { blockHeight: "900719925474099312345" } },
  });
  assert.equal(s.kind, "live");
  assert.equal(s.rpm, 12.345);
  assert.equal(s.block, "900719925474099312345");
  assert.equal(POLL_MS, 20000);
  const idle = parseStatus({
    measurement: { coreStatus: "IDLE", rpmMilli: 0 },
    builder: { anchor: { blockHeight: 0 } },
  });
  assert.equal(idle.rpm, 0);
  assert.equal(idle.block, "0");
});
test("unavailable, malformed, stale and unsafe telemetry never becomes zero or spinning", () => {
  const samples = [
    { status: "unavailable" },
    {
      measurement: {
        coreStatus: "SPINNING",
        rpmMilli: 40,
        freshness: "offline",
      },
    },
    { measurement: { coreStatus: "IDLE", rpmMilli: -1 } },
    null,
    {
      measurement: {
        coreStatus: "SPINNING",
        rpmMilli: 123,
        observedAt: "2020-01-01",
        staleAfterSeconds: 120,
      },
    },
  ];
  for (const input of samples) {
    const s = parseStatus(input);
    assert.equal(s.kind, "solo");
    assert.equal(s.rpm, null);
    assert.equal(s.block, null);
    assert.equal(s.core, null);
  }
  const s = parseStatus({
    measurement: { coreStatus: "IDLE", rpmMilli: 0 },
    builder: { anchor: { blockHeight: Number.MAX_SAFE_INTEGER + 1 } },
  });
  assert.equal(s.block, null);
});
