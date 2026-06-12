import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";

import PageNotFound from "./lib/PageNotFound";
import { AuthProvider } from "@/lib/AuthContext";
import { GlobalDataProvider } from "@/lib/GlobalDataContext";
import { HeaderProvider } from "@/lib/HeaderContext";
import { AppUserProvider } from "@/lib/useAppUser";
import { I18nProvider } from "@/lib/i18n";
import ProtectedRoute from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";
import MaintenanceGate from "@/components/MaintenanceGate";

import AppLayout from "@/components/layout/AppLayout.jsx";
import Home from "@/pages/Home";
import MatchCenter from "@/pages/MatchCenter";
import Highlights from "@/pages/AnnouncementDetail";
import Announcements from "@/pages/Announcements";
import Settings from "@/pages/Settings";

const CompetitionDetail = lazy(() => import("@/pages/CompetitionDetail"));
const Support = lazy(() => import("@/pages/Support"));
const Profile = lazy(() => import("@/pages/Profile"));
const Legal = lazy(() => import("@/pages/Legal"));
const Updates = lazy(() => import("@/pages/Updates"));
const GameStatistics = lazy(() => import("@/components/profile/UserProfile"));

const Impressum = lazy(() => import("@/pages/legal/Impressum"));
const Datenschutz = lazy(() => import("@/pages/legal/Datenschutz"));
const Nutzungsbedingungen = lazy(() => import("@/pages/legal/Nutzungsbedingungen"));
const CommunityGuidelines = lazy(() => import("@/pages/legal/CommunityGuidelines"));

const Applications = lazy(() => import("@/pages/Applications"));
const ClubDetail = lazy(() => import("@/pages/ClubDetail"));
const TeamDetail = lazy(() => import("@/pages/TeamDetail"));
const LeagueDetail = lazy(() => import("@/pages/LeagueDetail"));
const LeagueStandings = lazy(() => import("@/pages/LeagueStandings"));
const GameDetail = lazy(() => import("@/pages/GameDetail"));
const DataEditorDashboard = lazy(() => import("@/pages/DataEditorDashboard"));
const PodcastDashboard = lazy(() => import("@/pages/PodcastDashboard"));

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminPartners = lazy(() => import("@/pages/admin/AdminPartners"));
const AdminLegal = lazy(() => import("@/pages/admin/AdminLegal"));
const AdminLeagues = lazy(() => import("@/pages/admin/AdminLeagues"));
const AdminTeams = lazy(() => import("@/pages/admin/AdminTeams"));
const AdminGames = lazy(() => import("@/pages/admin/AdminGames"));
const AdminGameDayShots = lazy(() => import("@/pages/admin/AdminPosts"));
const AdminStreams = lazy(() => import("@/pages/admin/AdminStreams"));
const AdminStandings = lazy(() => import("@/pages/admin/AdminStandings"));
const AdminCompetitions = lazy(() => import("@/pages/admin/AdminCompetitions"));
const AdminCompetitionDetail = lazy(() => import("@/pages/admin/AdminCompetitionDetail"));
const AdminUpdates = lazy(() => import("@/pages/admin/AdminUpdates"));
const AdminHighlights = lazy(() => import("@/pages/Tournaments"));
const AdminGameResult = lazy(() => import("@/pages/admin/AdminGameResult"));
const AdminSupport = lazy(() => import("@/pages/admin/AdminSupport"));
const AdminGameOfTheWeek = lazy(() => import("@/pages/admin/AdminGameOfTheWeek"));
const PostDetail = lazy(() => import("@/pages/PostDetail"));

function RouteLoader() {
  return null;
}

function AdminRoute({ children }) {
  return (
    <ProtectedRoute
      requiredRoute="/admin"
      allowedRoles={["admin"]}
      fallbackRoute="/settings?login=internal"
    >
      {children}
    </ProtectedRoute>
  );
}

function DataEditorRoute({ children }) {
  return (
    <ProtectedRoute
      requiredRoute="/data-editor"
      allowedRoles={["data_editor", "media_partner", "club"]}
      fallbackRoute="/settings?login=internal"
    >
      {children}
    </ProtectedRoute>
  );
}

function PodcastRoute({ children }) {
  return (
    <ProtectedRoute
      requiredRoute="/podcast"
      allowedRoles={["podcast_partner", "admin"]}
      fallbackRoute="/settings?login=internal"
    >
      {children}
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
    <AppUserProvider>
      <Suspense fallback={<RouteLoader />}>
        <Routes>
          <Route
            path="/admin-login"
            element={<Navigate to="/settings?login=internal" replace />}
          />

          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />

            <Route path="/feed" element={<Announcements />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/match-center" element={<MatchCenter />} />
            <Route path="/spiele" element={<Navigate to="/match-center" replace />} />
            <Route path="/highlights" element={<Highlights />} />
            <Route path="/game/:id" element={<GameDetail />} />

            <Route path="/tabellen" element={<Navigate to="/match-center" replace />} />
            <Route path="/tabellen/:leagueId" element={<LeagueStandings />} />

            <Route path="/wettbewerbe" element={<Navigate to="/match-center" replace />} />
            <Route path="/wettbewerbe/:competitionId" element={<CompetitionDetail />} />

            <Route path="/club/:clubId" element={<ClubDetail />} />
            <Route path="/team/:teamId" element={<TeamDetail />} />
            <Route path="/league/:leagueId" element={<LeagueDetail />} />

            <Route path="/support" element={<Support />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/user/statistics" element={<GameStatistics />} />

            <Route path="/legal" element={<Legal />} />
            <Route path="/updates" element={<Updates />} />
            <Route path="/legal/impressum" element={<Impressum />} />
            <Route path="/legal/datenschutz" element={<Datenschutz />} />
            <Route path="/legal/nutzungsbedingungen" element={<Nutzungsbedingungen />} />
            <Route path="/legal/community-guidelines" element={<CommunityGuidelines />} />
            <Route path="/impressum" element={<Impressum />} />
            <Route path="/datenschutz" element={<Datenschutz />} />
            <Route path="/nutzungsbedingungen" element={<Nutzungsbedingungen />} />
            <Route path="/community-guidelines" element={<CommunityGuidelines />} />

            <Route
              path="/data-editor"
              element={
                <DataEditorRoute>
                  <DataEditorDashboard />
                </DataEditorRoute>
              }
            />

            <Route
              path="/podcast"
              element={
                <PodcastRoute>
                  <PodcastDashboard />
                </PodcastRoute>
              }
            />

            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/users"
              element={
                <AdminRoute>
                  <AdminUsers />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/highlights"
              element={
                <AdminRoute>
                  <AdminHighlights />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/partners"
              element={
                <AdminRoute>
                  <AdminPartners />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/legal"
              element={
                <AdminRoute>
                  <AdminLegal />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/leagues"
              element={
                <AdminRoute>
                  <AdminLeagues />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/teams"
              element={
                <AdminRoute>
                  <AdminTeams />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/games"
              element={
                <AdminRoute>
                  <AdminGames />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/game-of-the-week"
              element={
                <AdminRoute>
                  <AdminGameOfTheWeek />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/gameday-shots"
              element={
                <AdminRoute>
                  <AdminGameDayShots />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/streams"
              element={
                <AdminRoute>
                  <AdminStreams />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/standings"
              element={
                <AdminRoute>
                  <AdminStandings />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/competitions"
              element={
                <AdminRoute>
                  <AdminCompetitions />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/competitions/:competitionId"
              element={
                <AdminRoute>
                  <AdminCompetitionDetail />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/updates"
              element={
                <AdminRoute>
                  <AdminUpdates />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/game-result"
              element={
                <AdminRoute>
                  <AdminGameResult />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/support"
              element={
                <AdminRoute>
                  <AdminSupport />
                </AdminRoute>
              }
            />
          </Route>

          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Suspense>
    </AppUserProvider>
  );
}

function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <MaintenanceGate>
              <GlobalDataProvider>
                <HeaderProvider>
                  <ScrollToTop />
                  <AppRoutes />
                </HeaderProvider>
              </GlobalDataProvider>
            </MaintenanceGate>
          </Router>

          <Toaster />
        </QueryClientProvider>
      </AuthProvider>
    </I18nProvider>
  );
}

export default App;
