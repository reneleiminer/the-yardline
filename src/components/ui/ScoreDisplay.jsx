import React from "react";

export default function ScoreDisplay({
  homeScore = 0,
  awayScore = 0,
  dark = false,
  size = "md",
  className = "",
}) {
  const isLarge = size === "lg";
  const isSmall = size === "sm";

  const containerSizeClass = isLarge
    ? "px-3.5 py-2.5 sm:px-4 sm:py-3"
    : isSmall
      ? "px-2.5 py-1.5"
      : "px-3 py-2";

  const numberClass = isLarge
    ? "min-w-[42px] text-[32px] sm:min-w-[56px] sm:text-[44px]"
    : isSmall
      ? "min-w-[28px] text-[22px]"
      : "min-w-[32px] text-[25px]";

  const colonClass = isLarge
    ? "mx-2 h-9 w-9 text-[22px] sm:h-10 sm:w-10 sm:text-[24px]"
    : isSmall
      ? "mx-1.5 h-7 w-7 text-[17px]"
      : "mx-1.5 h-7 w-7 text-[18px]";

  return (
    <div
      className={`inline-flex items-center justify-center rounded-2xl border font-black leading-none tabular-nums ${containerSizeClass} ${
        dark
          ? "border-white/18 bg-black/30 text-white shadow-[0_14px_34px_rgba(0,0,0,0.36)] backdrop-blur-md"
          : "border-border/70 bg-background/90 text-foreground shadow-[0_8px_22px_rgba(15,23,42,0.13)]"
      } ${className}`}
    >
      <span className={`text-right tracking-tight ${numberClass}`}>
        {homeScore}
      </span>

      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full ${colonClass} ${
          dark
            ? "bg-white text-slate-950 shadow-[0_0_18px_rgba(255,255,255,0.30)]"
            : "bg-foreground text-background shadow-sm"
        }`}
      >
        :
      </span>

      <span className={`text-left tracking-tight ${numberClass}`}>
        {awayScore}
      </span>
    </div>
  );
}
