export function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    play: "m8 5 11 7-11 7V5Z",
    pause: "M8 5v14M16 5v14",
    arrow: "M5 12h14m-6-6 6 6-6 6",
    volume: "m11 5-6 4H2v6h3l6 4V5Zm4 3a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14",
    mute: "m11 5-6 4H2v6h3l6 4V5Zm5 4 6 6m0-6-6 6",
    help: "M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4m0 4h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
    trophy:
      "M8 3h8v6a4 4 0 0 1-8 0V3Zm0 2H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v7m-5 1h10",
    block: "m12 3 9 5v9l-9 5-9-5V8l9-5Zm0 9 9-4m-9 4L3 8m9 4v10",
    x: "M5 4h4l10 16h-4L5 4Zm14 0L5 20",
    close: "m6 6 12 12M6 18 18 6",
    spark: "m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z",
    check: "m5 12 4 4L19 6",
    globe:
      "M3 12h18M12 2c6 6 6 14 0 20-6-6-6-14 0-20Zm10 10a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.spark} />
    </svg>
  );
}
export function PixelSeed({ size = 24 }: { size?: number }) {
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24">
      <path d="M11 2h5v3h3v10h-3v4h-3v3H7v-3H4v-9h3V6h4Z" fill="#806238" />
      <path d="M11 6h4v8h-3v5H8v-9h3Z" fill="#edbc50" />
      <path d="M11 8h2v7h-2Z" fill="#fff0b2" />
    </svg>
  );
}
export function PixelHeart({ empty = false }: { empty?: boolean }) {
  return (
    <svg aria-hidden="true" width="22" height="22" viewBox="0 0 20 20">
      <path
        d="M2 3h5v2h6V3h5v2h2v7h-2v2h-2v2h-3v2H7v-2H4v-2H2v-2H0V5h2Z"
        fill={empty ? "#d8d4cc" : "#b74660"}
      />
      <path d="M3 5h3v2H3Z" fill={empty ? "#e5e1d8" : "#ef9ca6"} />
    </svg>
  );
}
export function PixelHamster() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 32 32"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path d="M5 3h7v4h8V3h7v10h2v13h-5v4H8v-4H3V13h2Z" fill="#3f302e" />
      <path d="M7 5h3v6h12V5h3v10h2v9h-5v4H10v-4H5v-9h2Z" fill="#cd8953" />
      <path d="M9 13h14v4h2v7h-5v3h-9v-3H7v-7h2Z" fill="#ffe8bd" />
      <path d="M9 14h3v4H9Zm12 0h3v4h-3Z" fill="#3f302e" />
      <path d="M14 20h5v3h-5Z" fill="#b74660" />
      <path d="M6 5h4v4H6Zm17 0h3v4h-3Z" fill="#ed9b91" />
    </svg>
  );
}
