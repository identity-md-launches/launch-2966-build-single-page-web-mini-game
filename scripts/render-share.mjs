import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const modulePath =
  process.argv[2] || "test/scratch/tooling/node_modules/playwright/index.mjs";
const { chromium } = await import(pathToFileURL(resolve(modulePath)).href);
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<style>body{margin:0}</style>${await readFile("public/share-card.svg", "utf8")}`,
  );
  await page.screenshot({ path: "public/share-card.png" });
  console.log("Rendered public/share-card.png (1200 × 630) from original SVG.");
} finally {
  await browser.close();
}
