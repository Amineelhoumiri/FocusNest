-- Migration 003: Add source column to curated_playlists
-- Distinguishes 'youtube' playlists (free player) from 'spotify' playlists (Premium tab)
-- Run with: psql $DATABASE_URL -f server/scripts/migrations/003_curated_source.sql

ALTER TABLE public.curated_playlists
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) NOT NULL DEFAULT 'youtube';

-- The four rows seeded in migration 002 have Spotify-style IDs — mark them correctly
UPDATE public.curated_playlists
  SET source = 'spotify'
  WHERE source = 'youtube'
    AND spotify_playlist_id ~ '^[A-Za-z0-9]{22}$';
