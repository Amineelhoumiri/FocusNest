const SpotifyWebApi = require("spotify-web-api-node");

const SCOPES = [
    "user-read-private",
    "user-read-currently-playing",
    "user-read-playback-state",
    "user-modify-playback-state",
    "playlist-read-private",
    "playlist-read-collaborative",
    "streaming",               // Required for Web Playback SDK
];

/**
 * Creates a configured SpotifyWebApi client.
 * Optionally sets an access token for authenticated calls.
 */
function createClient(accessToken = null, requestHost = null) {
    // SPOTIFY_REDIRECT_URI must be set in production and match the Spotify app dashboard.
    // If unset, we derive it from the incoming request host (same-origin deploy fallback).
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI ||
        (requestHost ? `${requestHost}/api/spotify/callback` : "http://localhost:8080/api/spotify/callback");

    const api = new SpotifyWebApi({
        clientId:     process.env.SPOTIFY_CLIENT_ID,
        clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
        redirectUri,
    });
    if (accessToken) api.setAccessToken(accessToken);
    return api;
}

/**
 * Generate the Spotify OAuth authorization URL.
 * @param {string} state - Signed JWT containing user_id (prevents CSRF)
 */
function getAuthUrl(state, requestHost = null) {
    // show_dialog=false — avoids a known Development Mode quirk where
    // show_dialog=true can cause access_denied even when user clicks Agree
    return createClient(null, requestHost).createAuthorizeURL(SCOPES, state, false);
}

/**
 * Exchange an authorization code for access + refresh tokens.
 * @param {string} code - The code Spotify sends to the callback URL
 */
async function exchangeCode(code, requestHost = null) {
    // The redirect URI passed here must exactly match the one used in getAuthUrl
    const data = await createClient(null, requestHost).authorizationCodeGrant(code);
    return {
        access_token:  data.body.access_token,
        refresh_token: data.body.refresh_token,
        expires_in:    data.body.expires_in, // seconds
    };
}

/**
 * Refresh an expired access token using the stored refresh token.
 * Returns a new access token (and optionally a new refresh token).
 */
async function refreshAccessToken(storedRefreshToken) {
    const api = createClient();
    api.setRefreshToken(storedRefreshToken);
    const data = await api.refreshAccessToken();
    return {
        access_token:  data.body.access_token,
        expires_in:    data.body.expires_in,
        refresh_token: data.body.refresh_token || storedRefreshToken,
    };
}

/**
 * Fetch the Spotify user's own profile (for display name + spotify_user_id).
 */
async function getSpotifyProfile(accessToken) {
    const data = await createClient(accessToken).getMe();
    return data.body; // { id, display_name, images, ... }
}

/**
 * Fetch the currently playing track. Returns null if nothing is playing.
 */
async function getNowPlaying(accessToken) {
    const data = await createClient(accessToken).getMyCurrentPlayingTrack();
    return data.body || null;
}

/**
 * Fetch the user's playlists (up to 20).
 */
async function getUserPlaylists(accessToken) {
    const data = await createClient(accessToken).getUserPlaylists({ limit: 20 });
    return data.body?.items || [];
}

/**
 * Start playback of a context (playlist/album) URI.
 */
async function playContext(accessToken, contextUri, deviceId = null) {
    const api = createClient(accessToken);
    const opts = { context_uri: contextUri };
    if (deviceId) opts.device_id = deviceId;
    await api.play(opts);
}

/**
 * Transfer playback to a specific device (e.g. the Web Playback SDK device).
 * This forces Spotify to recognize the device before a play command is issued.
 */
async function transferPlayback(accessToken, deviceId) {
    // play: false — just make FocusNest the active device without auto-resuming
    await createClient(accessToken).transferMyPlayback([deviceId], { play: false });
}

module.exports = {
    getAuthUrl,
    exchangeCode,
    refreshAccessToken,
    getSpotifyProfile,
    getNowPlaying,
    getUserPlaylists,
    playContext,
    transferPlayback,
};
