export const STATUS_URL = "https://api.squeekchain.com/v1/status";
export const POLL_MS = 20_000;
export type WheelStatus = {
  kind: "loading" | "live" | "solo";
  core: "SPINNING" | "IDLE" | null;
  rpm: number | null;
  block: string | null;
  checkedAt: number | null;
  reason: string | null;
};
export const loadingStatus: WheelStatus = {
  kind: "loading",
  core: null,
  rpm: null,
  block: null,
  checkedAt: null,
  reason: null,
};
const solo = (reason: string): WheelStatus => ({
  kind: "solo",
  core: null,
  rpm: null,
  block: null,
  checkedAt: Date.now(),
  reason,
});
export function parseStatus(input: unknown, now = Date.now()): WheelStatus {
  if (!input || typeof input !== "object") return solo("invalid");
  const data = input as Record<string, any>;
  const m = data.measurement;
  if (
    data.status === "unavailable" ||
    m?.status === "unavailable" ||
    m?.coreStatus === "unavailable" ||
    m?.freshness === "unavailable" ||
    (m?.freshness && m.freshness !== "online")
  )
    return solo("unavailable");
  if (
    !m ||
    !["SPINNING", "IDLE"].includes(m.coreStatus) ||
    !Number.isFinite(m.rpmMilli) ||
    m.rpmMilli < 0
  )
    return solo("invalid");
  // Expired telemetry must not keep awarding a live bonus.
  if (m.observedAt && m.staleAfterSeconds) {
    const observed = Date.parse(m.observedAt);
    if (
      !Number.isFinite(observed) ||
      now - observed > m.staleAfterSeconds * 1000
    )
      return solo("stale");
  }
  const rawBlock =
    data.builder?.status === "unavailable"
      ? null
      : data.builder?.anchor?.blockHeight;
  const block =
    typeof rawBlock === "string" && /^\d+$/.test(rawBlock)
      ? rawBlock
      : typeof rawBlock === "number" &&
          Number.isSafeInteger(rawBlock) &&
          rawBlock >= 0
        ? String(rawBlock)
        : null;
  return {
    kind: "live",
    core: m.coreStatus,
    rpm: m.rpmMilli / 1000,
    block,
    checkedAt: now,
    reason: null,
  };
}
export async function readStatus(signal: AbortSignal): Promise<WheelStatus> {
  try {
    const response = await fetch(STATUS_URL, {
      signal,
      cache: "no-store",
      credentials: "omit",
    });
    if (!response.ok) return solo(`http-${response.status}`);
    return parseStatus(await response.json());
  } catch {
    return solo("network");
  }
}
