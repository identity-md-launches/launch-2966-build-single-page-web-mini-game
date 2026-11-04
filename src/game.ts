export const SEEDS_PER_BLOCK = 12;
export const GROUND = Math.PI / 2;
export type Phase = "ready" | "running" | "paused" | "over";
export type GameEvent = "jump" | "seed" | "hit" | "block" | "over";
export type Entity = {
  id: number;
  kind: "seed" | "spike";
  angle: number;
  height: number;
  wide: boolean;
  used: boolean;
};
export type Snapshot = {
  phase: Phase;
  score: number;
  seeds: number;
  blocks: number;
  lives: number;
  combo: number;
  streak: number;
  jump: number;
  velocity: number;
  rotation: number;
  time: number;
  invincible: number;
  entities: Entity[];
  blockFlash: number;
};
export class Game {
  state: Snapshot;
  held = false;
  boosted = false;
  private spawn = 0.5;
  private sequence = 0;
  private id = 0;
  private holdTime = 0;
  onEvent: (event: GameEvent) => void;
  constructor(onEvent: (event: GameEvent) => void = () => {}) {
    this.onEvent = onEvent;
    this.state = this.fresh();
  }
  private fresh(): Snapshot {
    return {
      phase: "ready",
      score: 0,
      seeds: 0,
      blocks: 0,
      lives: 3,
      combo: 1,
      streak: 0,
      jump: 0,
      velocity: 0,
      rotation: 0,
      time: 0,
      invincible: 0,
      entities: [],
      blockFlash: 0,
    };
  }
  start() {
    this.state = this.fresh();
    this.state.phase = "running";
    this.spawn = 0.5;
    this.sequence = 0;
    this.held = false;
  }
  press() {
    if (this.state.phase !== "running" || this.held) return;
    this.held = true;
    if (this.state.jump <= 0.1) {
      this.state.velocity = 420;
      this.holdTime = 0;
      this.onEvent("jump");
    }
  }
  release() {
    this.held = false;
  }
  pause() {
    if (this.state.phase === "running") {
      this.state.phase = "paused";
      this.release();
    }
  }
  resume() {
    if (this.state.phase === "paused") this.state.phase = "running";
  }
  step(dt: number) {
    const s = this.state;
    if (s.phase !== "running") return;
    dt = Math.min(Math.max(dt, 0), 0.035);
    s.time += dt;
    const speed = Math.min(0.9 + s.blocks * 0.105, 1.8);
    s.rotation += dt * speed;
    s.invincible = Math.max(0, s.invincible - dt);
    s.blockFlash = Math.max(0, s.blockFlash - dt);
    if (s.jump > 0 || s.velocity > 0) {
      this.holdTime += dt;
      const gravity =
        this.held && s.velocity > 0 && this.holdTime < 0.24 ? 540 : 1180;
      s.velocity -= gravity * dt;
      if (!this.held && s.velocity > 340) s.velocity = 340;
      s.jump = Math.max(0, s.jump + s.velocity * dt);
      if (s.jump === 0) s.velocity = 0;
    }
    this.spawn -= dt;
    if (this.spawn <= 0) {
      const pattern = this.sequence++ % (s.blocks >= 2 ? 5 : 4);
      if (pattern === 2 || (pattern === 4 && s.blocks >= 2)) {
        s.entities.push({
          id: this.id++,
          kind: "spike",
          angle: -0.34,
          height: 32,
          wide: s.blocks >= 2 && pattern === 4,
          used: false,
        });
        this.spawn = 1.35 / speed;
      } else {
        const height = s.blocks > 0 && pattern === 3 ? 86 : 24;
        for (let i = 0; i < 3; i++)
          s.entities.push({
            id: this.id++,
            kind: "seed",
            angle: -0.34 - i * 0.22,
            height,
            wide: false,
            used: false,
          });
        this.spawn = 1.18 / speed;
      }
    }
    for (const entity of s.entities) {
      entity.angle += dt * speed;
      if (entity.used) continue;
      const near =
        Math.abs(entity.angle - GROUND) < (entity.wide ? 0.16 : 0.115);
      if (
        near &&
        entity.kind === "seed" &&
        Math.abs(s.jump + 24 - entity.height) < 33
      ) {
        entity.used = true;
        s.seeds++;
        s.streak++;
        s.combo = Math.min(5, 1 + Math.floor(s.streak / 5));
        s.score += Math.round(10 * s.combo * (this.boosted ? 1.1 : 1));
        this.onEvent("seed");
        if (s.seeds % SEEDS_PER_BLOCK === 0) {
          s.blocks++;
          s.score += 100;
          s.blockFlash = 2.2;
          this.onEvent("block");
        }
      } else if (
        near &&
        entity.kind === "spike" &&
        s.jump < 34 &&
        !s.invincible
      ) {
        entity.used = true;
        s.lives--;
        s.streak = 0;
        s.combo = 1;
        s.invincible = 1.8;
        this.onEvent("hit");
        if (s.lives <= 0) {
          s.phase = "over";
          this.release();
          this.onEvent("over");
          break;
        }
      } else if (entity.angle > GROUND + 0.25) {
        entity.used = true;
        if (entity.kind === "seed") {
          s.streak = 0;
          s.combo = 1;
        } else s.score += 5;
      }
    }
    s.entities = s.entities.filter(
      (e) => e.angle < Math.PI + 0.35 && !(e.used && e.kind === "seed"),
    );
  }
}
