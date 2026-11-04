import { createRoot } from "react-dom/client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Game, SEEDS_PER_BLOCK } from "./game";
import { drawGame } from "./art";
import { ArcadeAudio } from "./audio";
import { en, zh, type Language } from "./i18n";
import { Icon, PixelHeart, PixelSeed, PixelHamster } from "./icons";
import { loadingStatus, POLL_MS, readStatus, type WheelStatus } from "./status";
import "./style.css";

const BEST_KEY = "wheel-rush-best-v1";
function storedBest() {
  try {
    const n = Number(localStorage.getItem(BEST_KEY));
    return Number.isSafeInteger(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}
function initialLanguage(): Language {
  try {
    return localStorage.getItem("wheel-rush-lang") === "zh" ? "zh" : "en";
  } catch {
    return "en";
  }
}
function App() {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const t = language === "en" ? en : zh;
  const [sound, setSound] = useState(false);
  const [status, setStatus] = useState<WheelStatus>(loadingStatus);
  const [best, setBest] = useState(storedBest);
  const [storageOK, setStorageOK] = useState(true);
  const [announcement, setAnnouncement] = useState("");
  const [, render] = useState(0);
  const canvas = useRef<HTMLCanvasElement>(null);
  const action = useRef<HTMLButtonElement>(null);
  const help = useRef<HTMLDialogElement>(null);
  const audio = useRef(new ArcadeAudio());
  const bestRef = useRef(best);
  const game = useRef(new Game());
  const s = game.current.state;
  const tRef = useRef(t);
  tRef.current = t;
  const boosted = status.kind === "live" && status.core === "SPINNING";
  game.current.boosted = boosted;
  game.current.onEvent = (event) => {
    audio.current.play(event);
    if (event === "block") setAnnouncement(tRef.current.mined);
    if (event === "hit") setAnnouncement(tRef.current.heartLost);
    if (event === "over") {
      setAnnouncement(
        `${tRef.current.result}. ${tRef.current.score}: ${game.current.state.score}`,
      );
      requestAnimationFrame(() => action.current?.focus());
    }
  };
  useEffect(() => {
    document.documentElement.lang = language === "en" ? "en" : "zh-Hans";
    try {
      localStorage.setItem("wheel-rush-lang", language);
    } catch {
      setStorageOK(false);
    }
  }, [language]);
  useEffect(() => {
    let dead = false;
    let controller: AbortController | null = null;
    const poll = async () => {
      controller?.abort();
      controller = new AbortController();
      const current = controller;
      const timeout = window.setTimeout(() => current.abort(), 8000);
      const result = await readStatus(current.signal);
      clearTimeout(timeout);
      if (!dead && controller === current) setStatus(result);
    };
    void poll();
    const interval = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      dead = true;
      clearInterval(interval);
      controller?.abort();
    };
  }, []);
  const sync = useCallback(() => render((n) => n + 1), []);
  const start = useCallback(() => {
    audio.current.unlock();
    game.current.start();
    sync();
    action.current?.focus({ preventScroll: true });
  }, [sync]);
  const press = useCallback(() => {
    audio.current.unlock();
    game.current.press();
  }, []);
  const release = useCallback(() => game.current.release(), []);
  const pause = useCallback(() => {
    game.current.pause();
    sync();
  }, [sync]);
  const resume = useCallback(() => {
    game.current.resume();
    sync();
    action.current?.focus({ preventScroll: true });
  }, [sync]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (help.current?.open || event.ctrlKey || event.altKey || event.metaKey)
        return;
      const target = event.target as HTMLElement;
      if (
        event.code === "Space" &&
        (target === document.body ||
          target === action.current ||
          target === canvas.current)
      ) {
        event.preventDefault();
        if (event.repeat) return;
        if (
          game.current.state.phase === "ready" ||
          game.current.state.phase === "over"
        )
          start();
        else if (game.current.state.phase === "paused") resume();
        else press();
      }
      if (event.code === "KeyP" || event.code === "Escape") {
        event.preventDefault();
        if (game.current.state.phase === "running") pause();
        else if (game.current.state.phase === "paused") resume();
      }
    };
    const keyup = (event: KeyboardEvent) => {
      if (event.code === "Space") release();
    };
    const hidden = () => {
      if (document.hidden) pause();
    };
    const blur = () => pause();
    window.addEventListener("keydown", keydown);
    window.addEventListener("keyup", keyup);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.removeEventListener("keyup", keyup);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, [start, press, release, pause, resume]);
  useEffect(() => {
    let frame = 0,
      last = 0,
      lastUI = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const loop = (at: number) => {
      const g = game.current;
      g.step(last ? (at - last) / 1000 : 0);
      last = at;
      if (canvas.current) drawGame(canvas.current, g.state, reduced.matches);
      if (g.state.score > bestRef.current) {
        bestRef.current = g.state.score;
        setBest(g.state.score);
        try {
          localStorage.setItem(BEST_KEY, String(g.state.score));
        } catch {
          setStorageOK(false);
        }
      }
      if (at - lastUI > 70) {
        sync();
        lastUI = at;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [sync]);
  const openHelp = () => {
    pause();
    help.current?.showModal();
  };
  const shareText =
    language === "en"
      ? `I scored ${s.score.toLocaleString("en-US")} points and mined ${s.blocks} game blocks in Wheel Rush! Tiny paws. Big rush. Play with the @squeekchain community.`
      : `我在 Wheel Rush 获得了 ${s.score} 分，挖出了 ${s.blocks} 个游戏区块！小小爪子，大大冲劲。来和 @squeekchain 社区一起玩！`;
  const shareURL = `https://x.com/intent/post?text=${encodeURIComponent(shareText)}`;
  const stateLabel =
    status.kind === "loading"
      ? t.checking
      : status.kind === "solo"
        ? t.solo
        : status.core === "SPINNING"
          ? t.spinning
          : t.idle;
  const stageLabel =
    s.phase === "ready" ? t.ready : `${t.level} ${s.blocks + 1}`;
  return (
    <>
      <a className="skip" href="#game">
        {t.skip}
      </a>
      <header className="site-header wrap">
        <a className="brand" href="./" aria-label="Wheel Rush">
          <PixelHamster />
          <span>
            Wheel Rush<span className="brand-sub">{t.community}</span>
          </span>
        </a>
        <nav
          className="utilities"
          aria-label={language === "en" ? "Game settings" : "游戏设置"}
        >
          <button
            className="utility language"
            aria-label={t.language}
            onClick={() => setLanguage(language === "en" ? "zh" : "en")}
          >
            <Icon name="globe" size={18} />
            <span>{language === "en" ? "中文" : "EN"}</span>
          </button>
          <button
            className="utility sound"
            aria-label={sound ? t.soundOn : t.soundOff}
            aria-pressed={sound}
            onClick={() => {
              const next = !sound;
              setSound(next);
              audio.current.enabled = next;
              audio.current.unlock();
              if (next) audio.current.play("seed");
            }}
          >
            <Icon name={sound ? "volume" : "mute"} />
            <span>{sound ? t.soundOn : t.soundOff}</span>
          </button>
          <button
            className="utility help"
            aria-label={t.help}
            onClick={openHelp}
          >
            <Icon name="help" />
          </button>
        </nav>
      </header>
      <main className="wrap">
        <section className="intro" aria-labelledby="page-title">
          <div>
            <h1 id="page-title">
              {t.tiny} <span>{t.rush}</span>
            </h1>
            <p>{t.intro}</p>
          </div>
          <div className="best">
            <Icon name="trophy" size={23} />
            <span>
              {t.best}
              <strong data-testid="best">{best.toLocaleString("en-US")}</strong>
            </span>
          </div>
        </section>
        <div className="game-layout">
          <section className="game-shell" id="game" aria-label="Wheel Rush">
            <div className="game-hud">
              <div className="stat score">
                <span>{t.score}</span>
                <strong data-testid="score">
                  {s.score.toLocaleString("en-US").padStart(4, "0")}
                </strong>
              </div>
              <div className="stat combo">
                <span>{t.combo}</span>
                <strong className={s.combo > 1 ? "combo-active" : ""}>
                  {s.combo}
                  <small>×</small>
                </strong>
              </div>
              <div className="stat blocks">
                <span>{t.blocks}</span>
                <strong>{String(s.blocks).padStart(2, "0")}</strong>
              </div>
              <div className="stat hearts">
                <span>{t.lives}</span>
                <div
                  className="heart-row"
                  role="img"
                  aria-label={`${s.lives} / 3 ${t.lives}`}
                  data-testid="lives"
                >
                  {[0, 1, 2].map((n) => (
                    <PixelHeart key={n} empty={n >= s.lives} />
                  ))}
                </div>
              </div>
            </div>
            <div className="wheel-ticker" role="group" aria-label={t.telemetry}>
              <span>
                <span className="status-dot" />
                {stateLabel}
                {boosted ? " · 1.1×" : ""}
              </span>
              <span>
                {status.rpm === null
                  ? t.unknown
                  : `${status.rpm.toLocaleString("en-US", {
                      maximumFractionDigits: 3,
                    })} RPM`}
              </span>
              <span>
                {status.block === null
                  ? "#—"
                  : `#${BigInt(status.block).toLocaleString("en-US")}`}
              </span>
            </div>
            <div className="stage" data-phase={s.phase}>
              <canvas
                ref={canvas}
                aria-label={t.gameCanvas}
                role="img"
                onPointerDown={(e) => {
                  if (s.phase === "running") {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    press();
                  }
                }}
                onPointerUp={release}
                onPointerCancel={release}
              />
              <div className="stage-label">
                <span className="level-marker">
                  {String(s.blocks + 1).padStart(2, "0")}
                </span>
                <span>
                  {stageLabel}
                  <small>
                    {s.phase === "ready"
                      ? t.readySub
                      : t.levelNames[Math.min(s.blocks, 3)]}
                  </small>
                </span>
              </div>
              {s.phase === "running" && (
                <button
                  className="pause-button"
                  aria-label={t.pause}
                  onClick={pause}
                >
                  <Icon name="pause" />
                </button>
              )}
              {s.phase === "running" && s.blockFlash > 0 && (
                <div className="block-toast" role="status">
                  <Icon name="block" />
                  {t.mined}
                  <small>{t.faster}</small>
                </div>
              )}
              {(s.phase === "paused" || s.phase === "over") && (
                <div className="stage-overlay">
                  <div className="result-panel">
                    <Icon
                      name={s.phase === "over" ? "trophy" : "pause"}
                      size={30}
                    />
                    <h2>{s.phase === "over" ? t.over : t.paused}</h2>
                    <p>{s.phase === "over" ? t.overSub : t.pausedSub}</p>
                    {s.phase === "over" && (
                      <>
                        <strong className="result-score">
                          {s.score.toLocaleString("en-US")}{" "}
                          <small>{t.score}</small>
                        </strong>
                        {s.score > 0 && s.score >= best && (
                          <span className="new-best">{t.newBest}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="progress-area">
              <div className="progress-label">
                <span>
                  <PixelSeed size={18} />
                  {t.progress}
                </span>
                <span>
                  <strong>{s.seeds % SEEDS_PER_BLOCK}</strong> /{" "}
                  {SEEDS_PER_BLOCK} <span className="seed-word">{t.seeds}</span>
                </span>
              </div>
              <progress
                aria-label={t.progress}
                value={s.seeds % SEEDS_PER_BLOCK}
                max={SEEDS_PER_BLOCK}
              />
            </div>
            <div className="game-actions">
              <button
                ref={action}
                className="primary"
                data-testid="primary"
                onPointerDown={(e) => {
                  if (s.phase === "running") {
                    e.preventDefault();
                    e.currentTarget.setPointerCapture(e.pointerId);
                    press();
                  }
                }}
                onPointerUp={release}
                onPointerCancel={release}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && s.phase === "running") {
                    e.preventDefault();
                    press();
                  }
                }}
                onKeyUp={(e) => {
                  if (e.key === "Enter") release();
                }}
                onClick={() => {
                  if (s.phase === "ready" || s.phase === "over") start();
                  else if (s.phase === "paused") resume();
                }}
              >
                <Icon name={s.phase === "running" ? "arrow" : "play"} />
                {s.phase === "ready"
                  ? t.play
                  : s.phase === "over"
                    ? t.again
                    : s.phase === "paused"
                      ? t.resume
                      : t.jump}
                <kbd>Space</kbd>
              </button>
              <div className="control-hint">
                <span>{t.controls}</span>
                <small>{t.hold}</small>
              </div>
              <a
                className="share-button"
                href={shareURL}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="x" size={17} />
                <span>{t.share}</span>
              </a>
            </div>
          </section>
          <aside className="sidebar">
            <section className="live-section" aria-labelledby="live-title">
              <div className="section-title">
                <span className="live-dot" />
                <h2 id="live-title">{t.liveTitle}</h2>
              </div>
              <p className="live-sub">{t.liveSub}</p>
              <dl className="telemetry">
                <div>
                  <dt>{t.telemetry}</dt>
                  <dd className={`state ${status.kind} ${status.core || ""}`}>
                    <span className="status-dot" />
                    {stateLabel}
                  </dd>
                </div>
                <div>
                  <dt>{t.rpm}</dt>
                  <dd data-testid="rpm">
                    {status.rpm === null
                      ? "—"
                      : status.rpm.toLocaleString("en-US", {
                          minimumFractionDigits: 1,
                          maximumFractionDigits: 3,
                        })}
                    <small>{status.rpm === null ? "" : " RPM"}</small>
                  </dd>
                </div>
                <div>
                  <dt>{t.anchor}</dt>
                  <dd data-testid="anchor">
                    {status.block === null
                      ? "—"
                      : `#${BigInt(status.block).toLocaleString("en-US")}`}
                  </dd>
                </div>
              </dl>
              <div className={`bonus ${boosted ? "boosted" : ""}`}>
                <Icon name="spark" />
                <div>
                  <strong>{t.bonus}</strong>
                  <p>
                    {boosted
                      ? t.bonusOn
                      : status.kind === "solo"
                        ? t.offline
                        : t.bonusOff}
                  </p>
                </div>
              </div>
              <p className="polling">
                <span className="tiny-dot" />
                {t.polling}
              </p>
            </section>
            <section className="guide" aria-labelledby="guide-title">
              <h2 id="guide-title">{t.guideTitle}</h2>
              <ol>
                <li>
                  <span className="guide-icon">
                    <PixelSeed />
                  </span>
                  <div>
                    <h3>{t.rule1}</h3>
                    <p>{t.desc1}</p>
                  </div>
                </li>
                <li>
                  <span className="guide-icon">
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 26 26"
                      aria-hidden="true"
                    >
                      <path d="M2 23 13 3l11 20Z" fill="#b85f6b" />
                      <path d="m8 20 5-10 5 10Z" fill="#f1a7ad" />
                    </svg>
                  </span>
                  <div>
                    <h3>{t.rule2}</h3>
                    <p>{t.desc2}</p>
                  </div>
                </li>
                <li>
                  <span className="guide-icon">
                    <Icon name="block" size={25} />
                  </span>
                  <div>
                    <h3>{t.rule3}</h3>
                    <p>{t.desc3}</p>
                  </div>
                </li>
              </ol>
            </section>
          </aside>
        </div>
        <div className="under-game">
          <span>
            <Icon name="trophy" size={15} />
            {storageOK ? t.local : t.localFailed}
          </span>
          <span>{t.disclaimer}</span>
        </div>
      </main>
      <footer className="site-footer wrap">
        <span>
          {t.footer}
          <span className="footer-seed">
            <PixelSeed size={16} />
          </span>
        </span>
        <a
          href="https://x.com/squeekchain"
          target="_blank"
          rel="noopener noreferrer"
        >
          @squeekchain <Icon name="arrow" size={15} />
        </a>
      </footer>
      <dialog
        ref={help}
        className="help-dialog"
        aria-labelledby="help-title"
        onClick={(e) => {
          if (e.target === help.current) help.current.close();
        }}
      >
        <div className="dialog-content">
          <div className="dialog-heading">
            <PixelHamster />
            <button
              className="utility"
              aria-label={t.close}
              onClick={() => help.current?.close()}
            >
              <Icon name="close" />
            </button>
          </div>
          <h2 id="help-title">{t.helpTitle}</h2>
          <p>{t.helpIntro}</p>
          <ul>
            <li>{t.keyHelp}</li>
            <li>{t.pauseHelp}</li>
            <li>{t.desc1}</li>
            <li>{t.desc3}</li>
            <li>{t.liveHelp}</li>
          </ul>
          <p className="dialog-note">{t.miningHelp}</p>
          <button className="primary" onClick={() => help.current?.close()}>
            {t.close}
            <Icon name="check" />
          </button>
        </div>
      </dialog>
      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
