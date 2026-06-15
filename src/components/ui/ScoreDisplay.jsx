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

  const numberClass = isLarge
    ? "min-w-[38px] text-[34px] sm:min-w-[50px] sm:text-[46px]"
    : isSmall
      ? "min-w-[26px] text-[23px]"
      : "min-w-[30px] text-[27px]";

  const colonClass = isLarge
    ? "mx-1 text-[32px] sm:mx-1.5 sm:text-[40px]"
    : isSmall
      ? "mx-1 text-[23px]"
      : "mx-1 text-[27px]";

  const numberShadow = dark
    ? "drop-shadow-[0_3px_10px_rgba(0,0,0,0.48)]"
    : "drop-shadow-[0_2px_4px_rgba(0,0,0,0.16)]";

  const colonStyle = {
    textShadow: dark
      ? "0 0 12px rgba(255,255,255,0.92), 0 0 22px rgba(255,255,255,0.36), 0 3px 10px rgba(0,0,0,0.55)"
      : "0 0 8px rgba(255,255,255,0.72), 0 2px 5px rgba(0,0,0,0.20)",
  };

  return (
    <div
      className={`inline-grid grid-cols-[auto_auto_auto] items-center justify-center font-black leading-none tabular-nums ${
        dark ? "text-white" : "text-foreground"
      } ${className}`}
    >
      <span className={`text-right tracking-tight ${numberClass} ${numberShadow}`}>
        {homeScore}
      </span>

      <span
        className={`inline-flex shrink-0 items-center justify-center font-black leading-none text-current ${colonClass}`}
        style={colonStyle}
      >
        :
      </span>

      <span className={`text-left tracking-tight ${numberClass} ${numberShadow}`}>
        {awayScore}
      </span>
    </div>
  );
}
