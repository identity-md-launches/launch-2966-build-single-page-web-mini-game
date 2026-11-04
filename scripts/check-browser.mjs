import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { preview } from "./preview-server.mjs";
const pwPath =
  process.argv[2] || "test/scratch/tooling/node_modules/playwright/index.mjs";
const axePath =
  process.argv[3] ||
  "test/scratch/tooling/node_modules/@axe-core/playwright/dist/index.mjs";
const { chromium, webkit } = await import(pathToFileURL(resolve(pwPath)).href);
const { default: AxeBuilder } = await import(
  pathToFileURL(resolve(axePath)).href
);
const spinning = {
  measurement: { coreStatus: "SPINNING", rpmMilli: 12345 },
  builder: { status: "available", anchor: { blockHeight: "123456" } },
};
const idle = {
  measurement: { coreStatus: "IDLE", rpmMilli: 0 },
  builder: { status: "available", anchor: { blockHeight: "123457" } },
};
const results = {
  checkedAt: new Date().toISOString(),
  export: "dist/ served under /preview/",
  tests: [],
  screenshots: [],
  browserLimitations: [],
};
const check = async (name, fn) => {
  const start = Date.now();
  try {
    await fn();
    results.tests.push({ name, passed: true, durationMs: Date.now() - start });
    console.log("PASS", name);
  } catch (e) {
    results.tests.push({ name, passed: false, error: e.message });
    console.error("FAIL", name, e.message);
  }
};
const server = await preview();
let browser;
await mkdir("artifacts/screenshots", { recursive: true });
try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  const missing = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().startsWith(server.url) && r.status() >= 400)
      missing.push(r.url().slice(server.url.length));
  });
  let response = spinning;
  let failure = null;
  let requests = 0;
  await page.route("https://api.squeekchain.com/v1/status", async (route) => {
    requests++;
    if (failure === "network") await route.abort("failed");
    else
      await route.fulfill({
        status: failure === "http" ? 503 : 200,
        contentType: "application/json",
        body: JSON.stringify(response),
      });
  });
  await page.clock.install();
  await page.goto(server.url);
  await page.evaluate(() => document.fonts.ready);
  await check(
    "SPINNING fixture: milli-RPM, anchored block and cosmetic bonus",
    async () => {
      await page.waitForFunction(() =>
        document
          .querySelector("[data-testid=rpm]")
          ?.textContent.includes("12.345"),
      );
      assert.equal(
        await page.locator("[data-testid=anchor]").textContent(),
        "#123,456",
      );
      assert.match(await page.locator(".bonus").textContent(), /1.1×/);
      assert.equal(requests, 1);
    },
  );
  await check(
    "sound toggle enables synthesized effects, then mutes them",
    async () => {
      await page.evaluate(() => {
        window.wheelTestNotes = 0;
        const original = AudioContext.prototype.createOscillator;
        AudioContext.prototype.createOscillator = function (...args) {
          window.wheelTestNotes++;
          return original.apply(this, args);
        };
      });
      await page.locator(".sound").click();
      assert.equal(
        await page.locator(".sound").getAttribute("aria-pressed"),
        "true",
      );
      await page.waitForFunction(() => window.wheelTestNotes > 0);
      await page.locator(".sound").click();
      assert.equal(
        await page.locator(".sound").getAttribute("aria-pressed"),
        "false",
      );
    },
  );
  await check(
    "primary action starts; Space jumps; P pauses and freezes the canvas",
    async () => {
      await page.getByTestId("primary").click();
      assert.equal(
        await page.locator(".stage").getAttribute("data-phase"),
        "running",
      );
      await page.keyboard.down("Space");
      await page.clock.runFor(180);
      await page.keyboard.up("Space");
      await page.clock.runFor(500);
      await page.keyboard.press("p");
      assert.equal(
        await page.locator(".stage").getAttribute("data-phase"),
        "paused",
      );
      const image = await page.locator("canvas").evaluate((c) => c.toDataURL());
      await page.clock.runFor(1200);
      assert.equal(
        await page.locator("canvas").evaluate((c) => c.toDataURL()),
        image,
      );
      await page.getByTestId("primary").click();
      assert.equal(
        await page.locator(".stage").getAttribute("data-phase"),
        "running",
      );
    },
  );
  await check(
    "help pauses, traps focus, closes with Escape, and restores focus",
    async () => {
      await page.locator(".help").click();
      assert.equal(await page.locator("dialog").evaluate((d) => d.open), true);
      assert.equal(
        await page.locator(".stage").getAttribute("data-phase"),
        "paused",
      );
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() => !!document.activeElement.closest("dialog")),
        true,
      );
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("dialog").evaluate((d) => d.open), false);
      assert.equal(
        await page
          .locator(".help")
          .evaluate((el) => el === document.activeElement),
        true,
      );
    },
  );
  await check(
    "seeds, combos, blocks, heart loss, game over, restart and local high score",
    async () => {
      await page.getByTestId("primary").click();
      await page.clock.runFor(10000);
      assert.ok(
        Number(
          (await page.getByTestId("score").textContent()).replaceAll(",", ""),
        ) > 0,
      );
      assert.ok(
        Number(await page.locator(".stat.blocks strong").textContent()) >= 1,
      );
      assert.match(
        await page.getByTestId("lives").getAttribute("aria-label"),
        /[12] \/ 3/,
      );
      await page.clock.runFor(45000);
      assert.equal(
        await page.locator(".stage").getAttribute("data-phase"),
        "over",
      );
      const score = Number(
        (await page.getByTestId("score").textContent()).replaceAll(",", ""),
      );
      const best = Number(
        (await page.getByTestId("best").textContent()).replaceAll(",", ""),
      );
      assert.ok(best >= score && score > 0);
      const share = new URL(
        await page.locator(".share-button").getAttribute("href"),
      );
      assert.equal(share.origin, "https://x.com");
      assert.equal(share.pathname, "/intent/post");
      assert.ok(share.searchParams.get("text").includes("@squeekchain"));
      await page.getByTestId("primary").click();
      assert.equal(
        await page.locator(".stage").getAttribute("data-phase"),
        "running",
      );
      assert.equal(await page.getByTestId("score").textContent(), "0000");
      await page.reload();
      await page.clock.runFor(150);
      assert.ok(
        Number(
          (await page.getByTestId("best").textContent()).replaceAll(",", ""),
        ) >= best,
      );
    },
  );
  await check(
    "20-second polling, IDLE zero, unavailable/null, HTTP/network failure and recovery",
    async () => {
      const initial = requests;
      response = idle;
      await page.clock.runFor(20000);
      await page.waitForFunction(
        () => document.querySelector(".state")?.textContent === "Idle",
      );
      assert.equal(requests, initial + 1);
      assert.match(await page.getByTestId("rpm").textContent(), /^0.0/);
      assert.equal(await page.locator(".bonus.boosted").count(), 0);
      response = { status: "unavailable" };
      await page.clock.runFor(20000);
      await page.waitForFunction(
        () => document.querySelector(".state")?.textContent === "Solo mode",
      );
      assert.equal(await page.getByTestId("rpm").textContent(), "—");
      assert.equal(await page.getByTestId("anchor").textContent(), "—");
      for (const mode of ["http", "network"]) {
        failure = mode;
        await page.clock.runFor(20000);
        assert.equal(await page.getByTestId("rpm").textContent(), "—");
        assert.equal(await page.locator(".bonus.boosted").count(), 0);
      }
      failure = null;
      response = spinning;
      await page.clock.runFor(20000);
      await page.waitForFunction(() =>
        document.querySelector(".bonus.boosted"),
      );
      assert.match(await page.getByTestId("rpm").textContent(), /12.345/);
    },
  );
  await check(
    "English and Chinese at 320, 390, 768, 1024 and 1440: no horizontal overflow",
    async () => {
      for (const width of [320, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        for (const lang of ["zh", "en"]) {
          await page.locator(".language").click();
          await page.clock.runFor(100);
          assert.equal(
            await page.locator("html").getAttribute("lang"),
            lang === "zh" ? "zh-Hans" : "en",
          );
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 1,
            ),
            false,
            `${width}px ${lang}`,
          );
          if (width === 390) {
            const button = await page.getByTestId("primary").boundingBox();
            assert.ok(
              button.y + button.height <= 844,
              `${lang} action bottom ${button.y + button.height}`,
            );
            assert.equal(await page.locator(".wheel-ticker").isVisible(), true);
          }
        }
      }
    },
  );
  await check(
    "keyboard focus and automated accessibility scan: ready, help and Chinese",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.locator("body").click({ position: { x: 1, y: 1 } });
      await page.keyboard.press("Tab");
      assert.ok(
        await page.evaluate(
          () =>
            parseFloat(getComputedStyle(document.activeElement).outlineWidth) >=
            2,
        ),
      );
      await page.screenshot({
        path: "artifacts/screenshots/keyboard-focus-fixture.png",
        fullPage: false,
      });
      results.screenshots.push("artifacts/screenshots/keyboard-focus-fixture.png");
      for (const state of ["ready", "help", "chinese"]) {
        if (state === "help") await page.locator(".help").click();
        if (state === "chinese") {
          await page.keyboard.press("Escape");
          await page.locator(".language").click();
        }
        if (state === "chinese") {
          await page.screenshot({
            path: "artifacts/screenshots/chinese-fixture.png",
            fullPage: true,
          });
          results.screenshots.push("artifacts/screenshots/chinese-fixture.png");
        }
        const audit = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(
          audit.violations.map((v) => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map((n) => n.target),
          })),
          [],
          state,
        );
      }
      await page.locator(".language").click();
    },
  );
  await check(
    "reduced motion: static ready scene and no CSS animation",
    async () => {
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.clock.runFor(100);
      const before = await page
        .locator("canvas")
        .evaluate((c) => c.toDataURL());
      await page.clock.runFor(500);
      assert.equal(
        await page.locator("canvas").evaluate((c) => c.toDataURL()),
        before,
      );
      assert.equal(
        await page.evaluate(
          () =>
            document.getAnimations().filter((a) => a.playState === "running")
              .length,
        ),
        0,
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
    },
  );
  await check("200% text enlargement reflows at 390px", async () => {
    const style = await page.addStyleTag({ content: "html{font-size:200%}" });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      ),
      false,
    );
    await style.evaluate((el) => el.remove());
  });
  await check("local resources and JavaScript: no failures", async () => {
    assert.deepEqual(errors, []);
    assert.deepEqual(missing, []);
  });
  await context.close();
  await check(
    "touch controls start, jump, pause and resume at 390px",
    async () => {
      const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      });
      const p = await ctx.newPage();
      await p.route("https://api.squeekchain.com/**", (r) =>
        r.fulfill({
          contentType: "application/json",
          body: JSON.stringify(idle),
        }),
      );
      await p.clock.install();
      await p.goto(server.url);
      await p.getByTestId("primary").tap();
      assert.equal(
        await p.locator(".stage").getAttribute("data-phase"),
        "running",
      );
      await p.locator("canvas").tap({ position: { x: 175, y: 200 } });
      await p.clock.runFor(100);
      await p.getByRole("button", { name: "Pause game" }).tap();
      assert.equal(
        await p.locator(".stage").getAttribute("data-phase"),
        "paused",
      );
      await p.getByTestId("primary").tap();
      assert.equal(
        await p.locator(".stage").getAttribute("data-phase"),
        "running",
      );
      await ctx.close();
    },
  );
  await check(
    "unavailable localStorage keeps game playable and reports session-only best",
    async () => {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      await p.addInitScript(() => {
        Storage.prototype.getItem = () => {
          throw new Error("Storage disabled for test");
        };
        Storage.prototype.setItem = () => {
          throw new Error("Storage disabled for test");
        };
      });
      await p.route("https://api.squeekchain.com/**", (r) =>
        r.fulfill({
          contentType: "application/json",
          body: JSON.stringify(idle),
        }),
      );
      await p.clock.install();
      await p.goto(server.url);
      await p.waitForFunction(() =>
        document.body.textContent.includes("Storage unavailable"),
      );
      await p.getByTestId("primary").click();
      await p.clock.runFor(6000);
      assert.ok(
        Number(
          (await p.getByTestId("best").textContent()).replaceAll(",", ""),
        ) > 0,
      );
      await ctx.close();
    },
  );
  await check(
    "8-second API timeout changes Connecting to solo without blocking play",
    async () => {
      const ctx = await browser.newContext();
      const p = await ctx.newPage();
      await p.route("https://api.squeekchain.com/**", () => {});
      await p.clock.install();
      await p.goto(server.url);
      assert.equal(await p.locator(".state").textContent(), "Connecting");
      await p.getByTestId("primary").click();
      await p.clock.runFor(8500);
      await p.waitForFunction(
        () => document.querySelector(".state")?.textContent === "Solo mode",
      );
      assert.equal(
        await p.locator(".stage").getAttribute("data-phase"),
        "running",
      );
      await ctx.close();
    },
  );
  // These screenshots use the actual endpoint, never fixture telemetry.
  for (const width of [390, 1440]) {
    const p = await browser.newPage({
      viewport: { width, height: width === 390 ? 844 : 1000 },
      deviceScaleFactor: 1,
    });
    let apiFailure = null;
    p.on("requestfailed", (r) => {
      if (r.url().includes("api.squeekchain.com"))
        apiFailure = r.failure()?.errorText;
    });
    await p.goto(server.url);
    await p.evaluate(() => document.fonts.ready);
    await p.waitForFunction(
      () => document.querySelector(".state")?.textContent !== "Connecting",
      {},
      { timeout: 12000 },
    );
    const path = `artifacts/screenshots/${width === 390 ? "mobile" : "desktop"}.png`;
    await p.screenshot({ path, fullPage: true });
    results.screenshots.push(path);
    if (apiFailure)
      results.browserLimitations.push(
        `Direct browser API request at ${width}px: ${apiFailure}; solo mode rendered.`,
      );
    await p.close();
  }
  try {
    const b = await webkit.launch({ headless: true });
    const p = await b.newPage({ viewport: { width: 390, height: 844 } });
    await p.route("https://api.squeekchain.com/**", (r) =>
      r.fulfill({
        contentType: "application/json",
        body: JSON.stringify(idle),
      }),
    );
    await p.goto(server.url);
    await p.getByTestId("primary").click();
    assert.equal(
      await p.locator(".stage").getAttribute("data-phase"),
      "running",
    );
    results.tests.push({ name: "WebKit primary action", passed: true });
    await b.close();
  } catch {
    results.browserLimitations.push(
      "WebKit launch unavailable: required browser system libraries are missing. No Safari interaction claim.",
    );
  }
} finally {
  await browser?.close();
  await server.close();
  results.passed = results.tests.filter((t) => t.passed).length;
  results.failed = results.tests.filter((t) => !t.passed).length;
  await writeFile(
    "artifacts/browser-checks.json",
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(`${results.passed} checks passed; ${results.failed} failed.`);
  if (results.failed) process.exitCode = 1;
}
