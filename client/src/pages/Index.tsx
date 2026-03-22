/* src/index.css */
/* Main styling file for FocusNest. */
/* Enhanced with: ambient background orbs, staggered card animations, */
/* Kanban column energy gradients. */

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 240 7 % 97 %;
    --foreground: 240 10 % 4 %;
    --card: 0 0 % 100 %;
    --card - foreground: 240 10 % 4 %;
    --popover: 0 0 % 100 %;
    --popover - foreground: 240 10 % 4 %;
    --primary: 263 70 % 58 %;
    --primary - foreground: 0 0 % 100 %;
    --primary - bright: 263 91 % 66 %;
    --secondary: 240 5 % 96 %;
    --secondary - foreground: 240 6 % 10 %;
    --muted: 240 5 % 96 %;
    --muted - foreground: 240 4 % 46 %;
    --accent: 240 5 % 96 %;
    --accent - foreground: 240 6 % 10 %;
    --destructive: 0 84 % 60 %;
    --destructive - foreground: 0 0 % 100 %;
    --border: 240 6 % 90 %;
    --input: 240 6 % 90 %;
    --ring: 263 70 % 58 %;
    --radius: 0.75rem;

    --surface: 0 0 % 100 %;
    --surface - raised: 240 5 % 96 %;
    --text - secondary: 240 4 % 46 %;
    --text - muted: 215 16 % 47 %;
    --focus - blue: 217 91 % 60 %;
    --success: 160 84 % 39 %;
    --high - energy: 0 84 % 60 %;
    --low - energy: 160 84 % 39 %;
    --amber: 38 92 % 50 %;
    --zen - teal: 189 94 % 43 %;
    --ai - purple: 263 86 % 77 %;

    --sidebar - background: 0 0 % 98 %;
    --sidebar - foreground: 240 5 % 26 %;
    --sidebar - primary: 240 6 % 10 %;
    --sidebar - primary - foreground: 0 0 % 98 %;
    --sidebar - accent: 240 5 % 96 %;
    --sidebar - accent - foreground: 240 6 % 10 %;
    --sidebar - border: 220 13 % 91 %;
    --sidebar - ring: 217 91 % 60 %;
  }

  .dark {
    --background: 240 33 % 4 %;
    --foreground: 210 40 % 98 %;
    --card: 240 24 % 7 %;
    --card - foreground: 210 40 % 98 %;
    --popover: 240 24 % 7 %;
    --popover - foreground: 210 40 % 98 %;
    --primary: 263 70 % 58 %;
    --primary - foreground: 0 0 % 100 %;
    --primary - bright: 263 91 % 66 %;
    --secondary: 240 24 % 15 %;
    --secondary - foreground: 210 40 % 98 %;
    --muted: 240 24 % 15 %;
    --muted - foreground: 215 20 % 65 %;
    --accent: 240 24 % 15 %;
    --accent - foreground: 210 40 % 98 %;
    --destructive: 0 63 % 31 %;
    --destructive - foreground: 210 40 % 98 %;
    --border: 243 20 % 22 %;
    --input: 243 20 % 22 %;
    --ring: 263 70 % 58 %;

    --surface: 240 24 % 7 %;
    --surface - raised: 243 26 % 15 %;
    --text - secondary: 215 25 % 63 %;
    --text - muted: 215 19 % 35 %;
    --focus - blue: 217 91 % 60 %;
    --success: 160 84 % 39 %;
    --high - energy: 0 84 % 60 %;
    --low - energy: 160 84 % 39 %;
    --amber: 38 92 % 50 %;
    --zen - teal: 189 94 % 43 %;
    --ai - purple: 263 86 % 77 %;

    --sidebar - background: 240 24 % 7 %;
    --sidebar - foreground: 240 5 % 96 %;
    --sidebar - primary: 263 70 % 58 %;
    --sidebar - primary - foreground: 0 0 % 100 %;
    --sidebar - accent: 240 24 % 15 %;
    --sidebar - accent - foreground: 240 5 % 96 %;
    --sidebar - border: 243 20 % 22 %;
    --sidebar - ring: 263 70 % 58 %;
  }
}

@layer base {
  * {
    @apply border - border;
}

  body {
  @apply bg - background text - foreground font - sans antialiased;
  /* Prevent white flash on dark mode */
  min - height: 100vh;
}

  html {
  font - size: 16px;
  line - height: 1.6;
}
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AMBIENT BACKGROUND ORBS
   Two large blurred gradient orbs that drift slowly — gives the deep premium
   look of Linear.app / Vercel Dashboard. Applied via the .ambient-bg wrapper.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

.ambient - bg {
  position: relative;
  overflow: hidden;
}

.ambient - bg:: before,
.ambient - bg::after {
  content: "";
  position: fixed;
  border - radius: 50 %;
  filter: blur(120px);
  pointer - events: none;
  z - index: 0;
  opacity: 0;
  transition: opacity 0.5s ease;
}

/* Orb 1 — violet, top-left area */
.dark.ambient - bg:: before,
.ambient - bg::before {
  width: 600px;
  height: 600px;
  top: -200px;
  left: -200px;
  background: radial - gradient(circle,
    hsl(263 70 % 58 % / 0.18) 0 %,
    hsl(263 70 % 58 % / 0.06) 50 %,
    transparent 70 %
  );
  animation: orb - drift - 1 20s ease -in -out infinite;
}

/* Orb 2 — focus blue, bottom-right area */
.dark.ambient - bg:: after,
.ambient - bg::after {
  width: 500px;
  height: 500px;
  bottom: -150px;
  right: -150px;
  background: radial - gradient(circle,
    hsl(217 91 % 60 % / 0.12) 0 %,
    hsl(217 91 % 60 % / 0.04) 50 %,
    transparent 70 %
  );
  animation: orb - drift - 2 25s ease -in -out infinite;
}

/* Only show orbs in dark mode — too intense on light backgrounds */
.dark.ambient - bg::before {
  opacity: 1;
}
.dark.ambient - bg::after {
  opacity: 1;
}

/* Light mode: much subtler orbs */
: root: not(.dark).ambient - bg::before {
  opacity: 0.4;
  background: radial - gradient(circle,
    hsl(263 70 % 58 % / 0.07) 0 %,
    transparent 70 %
  );
}
: root: not(.dark).ambient - bg::after {
  opacity: 0.4;
  background: radial - gradient(circle,
    hsl(217 91 % 60 % / 0.05) 0 %,
    transparent 70 %
  );
}

/* Orb drift keyframes — slow, organic, non-distracting */
@keyframes orb - drift - 1 {
  0 % { transform: translate(0px, 0px)   scale(1); }
  25 % { transform: translate(60px, 40px) scale(1.05); }
  50 % { transform: translate(30px, 80px) scale(0.95); }
  75 % { transform: translate(-40px, 30px) scale(1.02); }
  100 % { transform: translate(0px, 0px)   scale(1); }
}

@keyframes orb - drift - 2 {
  0 % { transform: translate(0px, 0px)    scale(1); }
  33 % { transform: translate(-50px, -30px) scale(1.08); }
  66 % { transform: translate(40px, -60px) scale(0.95); }
  100 % { transform: translate(0px, 0px)    scale(1); }
}

/* Ensure page content sits above the orbs */
.ambient - bg > * {
  position: relative;
  z- index: 1;
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   STAGGERED CARD ANIMATIONS
   Apply .stagger-item to each card in a list. The nth-child delay creates
   a cascade effect where cards appear one by one on page load.
   Usage: add className="stagger-container" to the parent,
          add className="stagger-item" to each child card.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

.stagger - container.stagger - item {
  opacity: 0;
  transform: translateY(16px);
  animation: stagger -in 0.4s ease forwards;
}

/* Each successive child gets a 0.08s longer delay — creates the cascade */
.stagger - container.stagger - item: nth - child(1)  { animation - delay: 0.05s; }
.stagger - container.stagger - item: nth - child(2)  { animation - delay: 0.13s; }
.stagger - container.stagger - item: nth - child(3)  { animation - delay: 0.21s; }
.stagger - container.stagger - item: nth - child(4)  { animation - delay: 0.29s; }
.stagger - container.stagger - item: nth - child(5)  { animation - delay: 0.37s; }
.stagger - container.stagger - item: nth - child(6)  { animation - delay: 0.45s; }
.stagger - container.stagger - item: nth - child(7)  { animation - delay: 0.53s; }
.stagger - container.stagger - item: nth - child(8)  { animation - delay: 0.61s; }

@keyframes stagger -in {
  to {
  opacity: 1;
  transform: translateY(0);
}
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   KANBAN COLUMN ENERGY GRADIENTS
   Each column gets a distinct top gradient that reflects its meaning:
   - Backlog: neutral muted blue  (waiting, low urgency)
   - Ready:   amber/yellow        (primed, ready to go)
   - Doing:   violet primary      (active focus, most important)
   - Done:    success green       (completed, celebrate)
   Apply these classes to each Kanban column container div.
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* Shared column structure */
.kanban - col {
  position: relative;
  overflow: hidden;
}

/* Top gradient bar — 3px tall accent line at very top of column */
.kanban - col::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  border - radius: 999px 999px 0 0;
  z - index: 2;
}

/* Very subtle top-to-transparent gradient wash inside the column */
.kanban - col::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  pointer - events: none;
  z - index: 1;
}

/* Backlog — muted blue/slate */
.kanban - col - backlog::before {
  background: linear - gradient(90deg,
    hsl(217 60 % 55 % / 0.6),
    hsl(217 60 % 55 % / 0.2)
  );
}
.kanban - col - backlog::after {
  background: linear - gradient(180deg,
    hsl(217 60 % 55 % / 0.05) 0 %,
    transparent 100 %
  );
}

/* Ready / To Do — amber warm */
.kanban - col - todo::before {
  background: linear - gradient(90deg,
    hsl(38 92 % 50 % / 0.7),
    hsl(38 92 % 50 % / 0.2)
  );
}
.kanban - col - todo::after {
  background: linear - gradient(180deg,
    hsl(38 92 % 50 % / 0.06) 0 %,
    transparent 100 %
  );
}

/* Doing — violet primary, pulsing */
.kanban - col - doing::before {
  background: linear - gradient(90deg,
    hsl(263 70 % 58 % / 0.9),
    hsl(263 70 % 58 % / 0.3)
  );
  animation: col - doing - pulse 2.5s ease -in -out infinite;
}
.kanban - col - doing::after {
  background: linear - gradient(180deg,
    hsl(263 70 % 58 % / 0.08) 0 %,
    transparent 100 %
  );
}

@keyframes col - doing - pulse {
  0 %, 100 % { opacity: 1; }
  50 % { opacity: 0.6; }
}

/* Done — success green */
.kanban - col - done::before {
  background: linear - gradient(90deg,
    hsl(160 84 % 39 % / 0.7),
    hsl(160 84 % 39 % / 0.2)
  );
}
.kanban - col - done::after {
  background: linear - gradient(180deg,
    hsl(160 84 % 39 % / 0.05) 0 %,
    transparent 100 %
  );
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   EXISTING COMPONENTS — unchanged from original
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

@layer components {
  .glass - card {
    @apply bg - card / 60 backdrop - blur - xl border border - primary / 15 rounded - xl;
    backdrop - filter: blur(20px) saturate(180 %);
    box - shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .glass - card - hover {
    @apply glass - card transition - all duration - 200;
  }

  .glass - card - hover:hover {
    transform: translateY(-3px);
    box - shadow: 0 12px 40px rgba(0, 0, 0, 0.5), 0 0 20px hsl(var(--primary) / 0.15);
  }

  .glow - primary {
    box - shadow: 0 0 20px hsl(var(--primary) / 0.25);
  }

  .glow - high - energy {
    box - shadow: 0 0 20px hsl(var(--high - energy) / 0.3);
    border - color: hsl(var(--high - energy) / 0.4);
  }

  .glow - low - energy {
    box - shadow: 0 0 20px hsl(var(--low - energy) / 0.3);
    border - color: hsl(var(--low - energy) / 0.4);
  }

  .glow - active {
    box - shadow: 0 0 30px hsl(var(--primary) / 0.5);
    border - color: hsl(var(--primary));
    animation: pulse - glow 2s ease -in -out infinite;
  }

  .text - gradient - primary {
    @apply bg - clip - text text - transparent;
    background - image: linear - gradient(135deg, hsl(var(--primary)), hsl(var(--primary - bright)));
  }

  .bg - gradient - ambient {
    background: linear - gradient(135deg,
      hsl(var(--background)) 0 %,
        hsl(var(--primary) / 0.03) 50 %,
          hsl(var(--focus - blue) / 0.02) 100 %);
  }

  .shimmer {
    background: linear - gradient(90deg,
      hsl(var(--surface - raised)) 0 %,
        hsl(var(--primary) / 0.08) 50 %,
          hsl(var(--surface - raised)) 100 %);
    background - size: 200 % 100 %;
    animation: shimmer 1.5s ease -in -out infinite;
  }

  .btn - glow {
    @apply relative;
    box - shadow: 0 0 20px hsl(var(--primary) / 0.25), 0 4px 12px hsl(var(--primary) / 0.15);
  }

  .btn - glow:hover {
    box - shadow: 0 0 30px hsl(var(--primary) / 0.4), 0 4px 16px hsl(var(--primary) / 0.25);
  }

  /* Custom scrollbar — subtle violet tint */
  .custom - scrollbar:: -webkit - scrollbar {
    width: 4px;
  }
  .custom - scrollbar:: -webkit - scrollbar - track {
    background: transparent;
  }
  .custom - scrollbar:: -webkit - scrollbar - thumb {
    background: hsl(var(--primary) / 0.3);
    border - radius: 999px;
  }
  .custom - scrollbar:: -webkit - scrollbar - thumb:hover {
    background: hsl(var(--primary) / 0.5);
  }
}

@layer utilities {
  .font - mono - timer {
    font - family: 'JetBrains Mono', monospace;
    font - variant - numeric: tabular - nums;
    letter - spacing: -2px;
  }
}

@keyframes pulse - glow {
  0 %, 100 % { box- shadow: 0 0 20px hsl(var(--primary) / 0.3);
}
50 % { box- shadow: 0 0 40px hsl(var(--primary) / 0.6); }
}

@keyframes shimmer {
  0 % { background- position: -200 % 0;
}
100 % { background- position: 200 % 0;  }
}

@keyframes float {
  0 %, 100 % { transform: translateY(0)    rotate(0deg); }
  33 % { transform: translateY(-10px) rotate(1deg); }
  66 % { transform: translateY(5px)  rotate(- 1deg);
}
}