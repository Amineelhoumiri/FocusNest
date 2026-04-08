import * as React from "react";
import { cn } from "@/lib/utils";
import { Music2 } from "lucide-react";

export type NavbarNowPlayingProps = {
  className?: string;
  title?: string | null;
  subtitle?: string | null;
  artworkUrl?: string | null;
  active: boolean;
  /** Omit when used as `DropdownMenuTrigger` asChild — Radix attaches the open handler. */
  onClick?: () => void;
};

const FALLBACK_ART =
  "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=96&h=96&q=80";

export function NavbarNowPlaying({
  className,
  title,
  subtitle,
  artworkUrl,
  active,
  onClick,
}: NavbarNowPlayingProps) {
  const art = artworkUrl || FALLBACK_ART;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-xl border px-2 py-1 transition-all max-w-[min(13rem,calc(100vw-8rem))] sm:max-w-[min(13rem,calc(100vw-10rem))]",
        "bg-card border-border/60 hover:border-primary/30 hover:bg-card",
        active ? "shadow-[0_10px_26px_hsl(var(--primary)_/_0.10)]" : "opacity-90",
        className
      )}
      aria-label={active ? "Now playing, open Music page" : "Music, open Music page"}
    >
      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-primary/15 bg-primary/10">
        {active ? (
          <img
            src={art}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Music2 className="h-4 w-4 text-primary/70" />
          </div>
        )}
      </div>

      <div className="min-w-0 max-w-[10.5rem] text-left leading-tight">
        <div className={cn("truncate text-[11px] font-semibold", active ? "text-foreground/90" : "text-foreground/75")}>
          {title?.trim() ? title : active ? "Now playing" : "Focus sounds"}
        </div>
        <div className="truncate text-[10px] text-muted-foreground/70">
          {subtitle?.trim() ? subtitle : active ? "Open in Music" : "Tap for controls"}
        </div>
      </div>
    </button>
  );
}

