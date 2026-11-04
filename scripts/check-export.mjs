import { readFile, stat, readdir, writeFile } from "node:fs/promises";
import { join, dirname, normalize } from "node:path";
import assert from "node:assert/strict";
const checks = [];
async function check(name, fn) {
  await fn();
  checks.push({ name, passed: true });
}
const required = [
  "dist/index.html",
  "dist/favicon.svg",
  "dist/share-card.png",
  "dist/fonts/bricolage-latin.woff2",
  "dist/fonts/OFL.txt",
  "package.json",
  "package-lock.json",
  "src/main.tsx",
  "src/game.ts",
  "README.md",
  "DESIGN.md",
  "artifacts/validation.md",
  "artifacts/browser-checks.json",
  "artifacts/design-probe.json",
];
await check("all required outputs exist and are nonempty", async () => {
  for (const p of required) assert.ok((await stat(p)).size > 0, p);
});
const html = await readFile("dist/index.html", "utf8");
await check("static metadata is complete", async () => {
  for (const key of [
    "<title>",
    'name="description"',
    'rel="icon"',
    'property="og:title"',
    'property="og:image"',
  ])
    assert.ok(html.includes(key), key);
});
await check(
  "export HTML uses relative, existing local asset URLs",
  async () => {
    const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
    const og = html.match(
      /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/,
    );
    assert.ok(og);
    refs.push(og[1]);
    for (const ref of refs) {
      assert.ok(!ref.startsWith("/") && !ref.includes("://"), ref);
      assert.ok((await stat(join("dist", ref))).size > 0, ref);
    }
  },
);
await check("stylesheets use relative, existing font assets", async () => {
  const assetFiles = await readdir("dist/assets");
  for (const f of assetFiles.filter((f) => f.endsWith(".css"))) {
    const p = join("dist/assets", f);
    const css = await readFile(p, "utf8");
    for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
      const ref = match[1].replaceAll(/["']/g, "");
      assert.ok(!ref.startsWith("/") && !ref.includes("://"));
      assert.ok((await stat(normalize(join(dirname(p), ref)))).size > 0);
    }
  }
});
await check("share PNG is valid 1200×630 and matches the export", async () => {
  const p = await readFile("public/share-card.png"),
    d = await readFile("dist/share-card.png");
  assert.ok(
    p.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  );
  assert.equal(p.readUInt32BE(16), 1200);
  assert.equal(p.readUInt32BE(20), 630);
  assert.ok(p.equals(d));
});
await check("favicon and local font are valid and preserved", async () => {
  const f = await readFile("dist/favicon.svg", "utf8");
  assert.match(f, /<svg\b/);
  assert.match(f, /<\/svg>/);
  const p = await readFile("public/fonts/bricolage-latin.woff2"),
    d = await readFile("dist/fonts/bricolage-latin.woff2");
  assert.equal(p.subarray(0, 4).toString(), "wOF2");
  assert.ok(p.equals(d));
});
await check("lockfile agrees with direct dependency versions", async () => {
  const p = JSON.parse(await readFile("package.json", "utf8")),
    l = JSON.parse(await readFile("package-lock.json", "utf8"));
  assert.deepEqual(l.packages[""].dependencies, p.dependencies);
  assert.deepEqual(l.packages[""].devDependencies, p.devDependencies);
});
await check("recorded browser and design checks passed", async () => {
  const b = JSON.parse(await readFile("artifacts/browser-checks.json", "utf8")),
    d = JSON.parse(await readFile("artifacts/design-probe.json", "utf8"));
  assert.equal(b.failed, 0);
  assert.equal(b.passed, 14);
  assert.equal(d.checks.length, 16);
  assert.ok(d.checks.every((c) => c.passed));
});
const dirs = [
  "src",
  "public",
  "dist",
  "scripts",
  "tests",
  "licenses",
  "artifacts",
];
const roots = [
  "index.html",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts",
  ".gitignore",
  "README.md",
  "DESIGN.md",
  "NOTICE.md",
  "LICENSE",
];
async function walk(path) {
  const files = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    assert.ok(
      !["node_modules", ".cache", ".git", ".github"].includes(entry.name),
      `Unexpected generated/prohibited path in delivered tree: ${path}/${entry.name}`,
    );
    assert.ok(
      !entry.isSymbolicLink(),
      `Symlink in delivered tree: ${path}/${entry.name}`,
    );
    const p = join(path, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(p)));
    else {
      assert.ok(
        !/\.(tgz|zip|tsbuildinfo|map)$/.test(entry.name),
        `Packaging intermediate: ${p}`,
      );
      files.push(p);
    }
  }
  return files;
}
const report = {
  checkedAt: new Date().toISOString(),
  checks,
  fileCount: 0,
  bundleBytes: 0,
  distBytes: 0,
  limitBytes: 8388608,
  excludedGeneratedPaths: [
    "/node_modules/",
    "/test/scratch/",
    "/.cache/",
    "*.tsbuildinfo",
  ],
};
// Include this report itself; repeat until its serialized size and total stabilize.
let previous = -1;
for (let attempt = 0; attempt < 5; attempt++) {
  await writeFile(
    "artifacts/export-checks.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  const files = [...roots];
  for (const dir of dirs) files.push(...(await walk(dir)));
  const sizes = await Promise.all(
    files.map((p) => stat(p).then((s) => ({ p, bytes: s.size }))),
  );
  report.fileCount = files.length;
  report.bundleBytes = sizes.reduce((n, s) => n + s.bytes, 0);
  report.distBytes = sizes
    .filter((s) => s.p.startsWith("dist/"))
    .reduce((n, s) => n + s.bytes, 0);
  assert.ok(
    report.bundleBytes <= report.limitBytes,
    "Submission exceeds 8 MiB",
  );
  if (report.bundleBytes === previous) break;
  previous = report.bundleBytes;
}
await writeFile(
  "artifacts/export-checks.json",
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  `${checks.length} export checks passed. Bundle ${report.bundleBytes} / ${report.limitBytes} bytes; dist ${report.distBytes} bytes; ${report.fileCount} files.`,
);
