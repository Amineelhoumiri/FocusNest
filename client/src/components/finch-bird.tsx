import React from 'react'

interface FinchBirdProps {
  size?: number
  variant?: "dark" | "light" | "white" | "purple"
}

export function FinchBird({ size = 36, variant = "purple" }: FinchBirdProps) {
  const colors = {
    dark:   { body: "#7c6ff7", wing: "#534AB7", tip: "#9188e8", eye: "white", pupil: "#1a1830" },
    light:  { body: "#7c6ff7", wing: "#534AB7", tip: "#9188e8", eye: "white", pupil: "#1a1830" },
    white:  { body: "rgba(255,255,255,0.95)", wing: "rgba(255,255,255,0.65)", tip: "rgba(255,255,255,0.8)", eye: "rgba(255,255,255,0.9)", pupil: "#3d2e9e" },
    purple: { body: "#a89cf7", wing: "#7c6ff7", tip: "#c4b5fd", eye: "white", pupil: "#1a1830" },
  }
  const c = colors[variant]
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      {/* Main body */}
      <path
        d="M18 6C18 6 26 10 27 17C28 22 24 27 18 28C12 27 8 22 9 17C10 10 18 6 18 6Z"
        fill={c.body} opacity="0.92" />
      {/* Wing highlight — lighter upper section */}
      <path
        d="M18 6C18 6 26 10 27 17L18 17Z"
        fill={c.wing} />
      {/* Tail feather tip */}
      <path
        d="M27 10C27 10 32 9 33 13C31 13 29 12 27 10Z"
        fill={c.tip} />
      {/* Eye */}
      <circle cx="22" cy="12" r="2" fill={c.eye} />
      {/* Pupil */}
      <circle cx="22.7" cy="11.7" r="0.75" fill={c.pupil} />
    </svg>
  )
}

export function FinchBirdFlight({ size = 52, variant = "white" }: FinchBirdProps) {
  const isWhite = variant === "white"
  return (
    <svg width={size} height={size} viewBox="0 0 40 36" fill="none">
      {/* Wings spread */}
      <path
        d="M20 20C20 20 12 16 8 10C12 10 16 13 18 14C18 14 15 9 16 5C18 8 19 12 20 14C21 12 22 8 24 5C25 9 22 14 22 14C24 13 28 10 32 10C28 16 20 20 20 20Z"
        fill={isWhite ? "rgba(255,255,255,0.95)" : "#a89cf7"} />
      {/* Tail */}
      <path
        d="M20 20C20 20 16 24 14 29C16 27 19 25 20 24C21 25 24 27 26 29C24 24 20 20 20 20Z"
        fill={isWhite ? "rgba(255,255,255,0.60)" : "#7c6ff7"} />
      {/* Body centre */}
      <circle cx="20" cy="19.5" r="2.2"
        fill={isWhite ? "rgba(255,255,255,0.90)" : "#c4b5fd"} />
      {/* Eye */}
      <circle cx="20.7" cy="19.1" r="0.85"
        fill={isWhite ? "#3d2e9e" : "#1a1830"} />
    </svg>
  )
}
