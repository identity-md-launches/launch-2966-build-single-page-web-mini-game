import type { Snapshot } from "./game";
// Original Squeektoshi sprite. Each character is one pixel, drawn with integer edges.
const SPRITE = [
  "     oooo        oooo    ",
  "    obbbbo     obbbbo    ",
  "    obppboooooobppbo    ",
  "   oobbbbbbbbbbbbbbbo   ",
  "  obbbbtttttttbbbbbbbo  ",
  " obbbtttttttttttbbbbbo ",
  " obbtttttttttttttbbbbo ",
  "obbbttttttttttttttbbbo ",
  "obbbttttttttttttttbbbo ",
  "obbttttttttttottttbbbo ",
  "obbttttttttttoWttttbbo ",
  "obbtttttttttttttttppbo ",
  "obbbttttttttttttttpppo ",
  "obbbbttttttttttttttbbo ",
  " obbbbttttttttttttbbo  ",
  "  obbbbbtttttttttbbo   ",
  "   obbbbbbbbbbbbbo     ",
  "    oobboooobboo       ",
  "     oppo   oppo       ",
  "     oooo   oooo       ",
];
const PAL: Record<string, string> = {
  o: "#3f302e",
  b: "#cd8953",
  t: "#ffe8bd",
  p: "#ed9b91",
  W: "#fffaf0",
};
export function hamster(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  stride = 0,
) {
  ctx.save();
  ctx.translate(Math.round(x - 12 * scale), Math.round(y - 20 * scale));
  SPRITE.forEach((row, py) =>
    [...row].forEach((p, px) => {
      if (PAL[p]) {
        ctx.fillStyle = PAL[p];
        const offset = py > 16 ? (px < 10 ? stride : -stride) : 0;
        ctx.fillRect(px * scale + offset, py * scale, scale + 0.1, scale + 0.1);
      }
    }),
  );
  ctx.restore();
}
export function seed(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.35);
  ctx.fillStyle = "#75603a";
  ctx.fillRect(-5 * scale, -9 * scale, 10 * scale, 17 * scale);
  ctx.fillRect(-3 * scale, -12 * scale, 6 * scale, 23 * scale);
  ctx.fillStyle = "#f6c851";
  ctx.fillRect(-3 * scale, -8 * scale, 6 * scale, 15 * scale);
  ctx.fillStyle = "#fff0a7";
  ctx.fillRect(-1 * scale, -7 * scale, 2 * scale, 12 * scale);
  ctx.restore();
}
function pixelStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
) {
  ctx.fillStyle = color;
  ctx.fillRect(x - size * 3, y - size, size * 6, size * 2);
  ctx.fillRect(x - size, y - size * 3, size * 2, size * 6);
}
export function drawGame(
  canvas: HTMLCanvasElement,
  s: Snapshot,
  reduced: boolean,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.clientWidth,
    h = canvas.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (
    canvas.width !== Math.round(w * dpr) ||
    canvas.height !== Math.round(h * dpr)
  ) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  const r = Math.min(h * 0.405, w * 0.405);
  const cx = w / 2,
    cy = h * 0.455;
  const unit = r / 180;
  const ground = cy + r - 19 * unit;
  ctx.fillStyle = "#e9ede3";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#ced6c8";
  for (let x = 15; x < w; x += 22)
    for (let y = 14; y < h; y += 22) ctx.fillRect(x, y, 1.5, 1.5);
  // Restrained pixel clouds and sparks stay still until play begins.
  const starX = Math.max(28, cx - r - 48);
  pixelStar(ctx, starX, cy - 43, 2, "#759080");
  pixelStar(ctx, w - starX, cy + 22, 2, "#759080");
  pixelStar(ctx, cx + r * 0.86, cy - r * 0.96, 1.3, "#b4bfae");
  // Floor, axle stand and small clumps of grass.
  ctx.fillStyle = "#c9d5c0";
  ctx.fillRect(0, h - 28, w, 28);
  ctx.fillStyle = "#9dab94";
  ctx.fillRect(0, h - 28, w, 2);
  ctx.fillStyle = "#8c9a81";
  for (const x of [w * 0.07, w * 0.15, w * 0.84, w * 0.93]) {
    ctx.fillRect(x, h - 38, 3, 10);
    ctx.fillRect(x - 5, h - 34, 3, 6);
    ctx.fillRect(x + 5, h - 34, 3, 6);
  }
  ctx.fillStyle = "#36443c";
  ctx.fillRect(cx - 13 * unit, cy + 20 * unit, 26 * unit, r + 22 * unit);
  ctx.fillStyle = "#526450";
  ctx.fillRect(cx - 7 * unit, cy + 21 * unit, 12 * unit, r + 21 * unit);
  ctx.fillStyle = "#36443c";
  ctx.fillRect(cx - r * 0.65, cy + r + 27 * unit, r * 1.3, 12 * unit);
  ctx.fillStyle = "#6d7c62";
  ctx.fillRect(
    cx - r * 0.65 + 5 * unit,
    cy + r + 27 * unit,
    r * 1.3 - 10 * unit,
    4 * unit,
  );
  // Wheel is viewed straight on. The spokes rotate behind the runner.
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = "#dfe4d5";
  ctx.beginPath();
  ctx.arc(0, 0, r - 9 * unit, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#bfccba";
  ctx.lineWidth = 5 * unit;
  const rotation = s.rotation;
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6 + rotation;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 17 * unit, Math.sin(a) * 17 * unit);
    ctx.lineTo(Math.cos(a) * (r - 15 * unit), Math.sin(a) * (r - 15 * unit));
    ctx.stroke();
  }
  ctx.strokeStyle = "#3c493d";
  ctx.lineWidth = 21 * unit;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#eeb957";
  ctx.lineWidth = 14 * unit;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "#f8dda0";
  ctx.lineWidth = 3 * unit;
  ctx.beginPath();
  ctx.arc(0, 0, r + 4 * unit, 0, Math.PI * 2);
  ctx.stroke();
  // Tread marks make the wheel's rotation legible.
  ctx.fillStyle = "#9b7039";
  for (let i = 0; i < 36; i++) {
    const a = (i * Math.PI) / 18 + rotation;
    ctx.save();
    ctx.rotate(a);
    ctx.fillRect(r - 5 * unit, -2 * unit, 10 * unit, 4 * unit);
    ctx.restore();
  }
  ctx.fillStyle = "#3c493d";
  ctx.beginPath();
  ctx.arc(0, 0, 17 * unit, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#eeb957";
  ctx.beginPath();
  ctx.arc(0, 0, 11 * unit, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3c493d";
  ctx.fillRect(-3 * unit, -3 * unit, 6 * unit, 6 * unit);
  ctx.restore();
  // Seeds and hazards travel around the inner circumference.
  const demo = [
    { id: -1, kind: "seed", angle: 0.3, height: 24, wide: false, used: false },
    { id: -2, kind: "seed", angle: 0.54, height: 24, wide: false, used: false },
    { id: -3, kind: "seed", angle: 0.78, height: 24, wide: false, used: false },
    {
      id: -4,
      kind: "spike",
      angle: 2.43,
      height: 32,
      wide: false,
      used: false,
    },
  ] as const;
  for (const e of s.phase === "ready" ? demo : s.entities) {
    if (e.used) continue;
    const er = r - (19 + (e.kind === "seed" ? e.height : 0)) * unit;
    const x = cx + Math.cos(e.angle) * er,
      y = cy + Math.sin(e.angle) * er;
    if (e.kind === "seed") seed(ctx, x, y, 1.1 * unit);
    else {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(e.angle - Math.PI / 2);
      ctx.fillStyle = "#533f41";
      ctx.beginPath();
      ctx.moveTo(-16 * unit, 0);
      ctx.lineTo(0, -32 * unit);
      ctx.lineTo(16 * unit, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ce6b72";
      ctx.beginPath();
      ctx.moveTo(-9 * unit, -3 * unit);
      ctx.lineTo(0, -24 * unit);
      ctx.lineTo(8 * unit, -3 * unit);
      ctx.closePath();
      ctx.fill();
      if (e.wide) {
        ctx.fillStyle = "#533f41";
        ctx.beginPath();
        ctx.moveTo(9 * unit, 0);
        ctx.lineTo(22 * unit, -29 * unit);
        ctx.lineTo(37 * unit, 0);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  const isRunning = s.phase === "running" && s.jump === 0;
  const stride = isRunning && !reduced ? Math.sin(s.time * 22) * 2 * unit : 0;
  ctx.fillStyle = "#b9c4ac";
  ctx.beginPath();
  ctx.ellipse(cx, ground + 3 * unit, 31 * unit, 5 * unit, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.globalAlpha = s.invincible ? 0.55 : 1;
  hamster(ctx, cx, ground - s.jump * unit, 3.65 * unit, stride);
  ctx.restore();
  if (s.blockFlash > 0) {
    pixelStar(ctx, cx - 68 * unit, cy - 55 * unit, 3 * unit, "#bc415b");
    pixelStar(ctx, cx + 65 * unit, cy - 70 * unit, 2 * unit, "#bc415b");
  }
}
