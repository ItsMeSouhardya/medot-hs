export default function Icon({ name, className }: { name: "arrow" | "sound" | "touch" | "scan" | "check" | "menu" | "close" | "chevron"; className?: string }) {
  const paths = {
    arrow: "M4 12h16m-6-6 6 6-6 6",
    sound: "m11 4-6 5H2v6h3l6 5V4m4 4c3 2 3 6 0 8m3-11c5 4 5 10 0 14",
    touch: "M8 13V6a2 2 0 0 1 4 0v6m0-2 4 1 3 3v4l-3 4H9l-5-7a2 2 0 0 1 3-2l2 2",
    scan: "M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5M8 8h3v3H8V8m5 0h3v3h-3V8m-5 5h3v3H8v-3m6 0h2v3h-2",
    check: "m5 12 4 4L19 6",
    menu: "M4 6h16M4 12h16M4 18h16",
    close: "m6 6 12 12M6 18 18 6",
    chevron: "m6 9 6 6 6-6",
  };
  return <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={paths[name]} /></svg>;
}
