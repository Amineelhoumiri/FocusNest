-- Migration 002: Admin-curated binaural playlists
-- Run with: psql $DATABASE_URL -f server/scripts/migrations/002_curated_playlists.sql

CREATE TABLE IF NOT EXISTS public.curated_playlists (
    id                  SERIAL PRIMARY KEY,
    spotify_playlist_id VARCHAR(255) NOT NULL UNIQUE,
    name                VARCHAR(255) NOT NULL,
    description         TEXT,
    image_url           TEXT,
    added_by            UUID REFERENCES public.users(user_id) ON DELETE SET NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed with four well-known binaural/focus playlists
INSERT INTO public.curated_playlists (spotify_playlist_id, name, description)
VALUES
  ('37i9dQZF1DX8NTLI2TtZa6', 'Brain Food',          'Spotify · Focus & concentration'),
  ('37i9dQZF1DWZeKCadgRdKQ', 'Deep Focus',          'Spotify · Minimal distraction music'),
  ('37i9dQZF1DX9sIqqvKsjEK', 'Intense Studying',    'Spotify · High-focus instrumental'),
  ('37i9dQZF1DWXLeA8Omikj7', 'Beats to think to',   'Spotify · Lo-fi focus beats')
ON CONFLICT (spotify_playlist_id) DO NOTHING;
