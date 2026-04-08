// src/App.tsx
// Core application routing and context provider wrapper for FocusNest.
// This forms the root of the React DOM mapping paths to Page components.

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthProvider } from "@/context/AuthContext";
import { FocusScoreProvider } from "@/context/FocusScoreContext";
import { SpotifyPlaybackProvider } from "@/context/SpotifyPlaybackContext";
import { YouTubePlaybackProvider } from "@/context/YouTubePlaybackContext";
import { ZenModeProvider } from "@/context/ZenModeContext";
import AppLayout from "@/components/layout/AppLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Dashboard from "./pages/Dashboard";
import Tasks from "./pages/Tasks";
import TaskBoard from "./pages/TaskBoard";
import Sessions from "./pages/Sessions";
import SessionActive from "./pages/SessionActive";
import SessionComplete from "./pages/SessionComplete";
import Chat from "./pages/Chat";
import ChatHistory from "./pages/ChatHistory";
import Spotify from "./pages/Spotify";
import SettingsPage from "./pages/Settings";
import Profile from "./pages/Profile";
import Pricing from "./pages/Pricing";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/AdminDashboard";

import CookieBanner from "@/components/CookieBanner";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ZenModeProvider>
      <AuthProvider>
        <FocusScoreProvider>
          <SpotifyPlaybackProvider>
            <YouTubePlaybackProvider>
              <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route element={<AppLayout />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/tasks/:taskId" element={<TaskBoard />} />
                    <Route path="/sessions" element={<Sessions />} />
                    <Route path="/chat" element={<Chat />} />
                    <Route path="/chat/history" element={<ChatHistory />} />
                    <Route path="/spotify" element={<Spotify />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/admin" element={<AdminDashboard />} />
                  </Route>
                  <Route path="/sessions/active" element={<SessionActive />} />
                  <Route path="/sessions/complete" element={<SessionComplete />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <CookieBanner />
              </BrowserRouter>
              </TooltipProvider>
            </YouTubePlaybackProvider>
          </SpotifyPlaybackProvider>
        </FocusScoreProvider>
      </AuthProvider>
      </ZenModeProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
