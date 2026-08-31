"use client";

// Player profile image: the uploaded photo if there is one, otherwise the
// first letter of the name on the felt. Shared by the roster row and the
// round-setup grid; the caller passes the sizing utilities (size-* text-*).
import type { Player } from "@/types/models";

export function PlayerAvatar({
  player,
  className = "size-11 text-lg",
}: {
  player: Player;
  className?: string;
}) {
  if (player.image) {
    return (
      <span
        role="img"
        aria-label={player.name}
        className={`${className} shrink-0 rounded-full border border-border bg-cover bg-center`}
        style={{ backgroundImage: `url(${player.image})` }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`${className} flex shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised font-semibold text-accent`}
    >
      {player.name.trim().charAt(0) || "?"}
    </span>
  );
}
