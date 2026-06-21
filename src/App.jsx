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
import { useAuth } from "@/lib/AuthContext";
import { hasFeatureAccess } from "@/lib/rolePermissions";

import AppLayout from "@/components/layout/AppLayout.jsx";
import Home from "@/pages/Home";
import MatchCenter from "@/pages/MatchCenter";
import Highlights from "@/pages/AnnouncementDetail";
import Announcements from "@/pages/Announcements";
import Settings from "@/pages/Settings";

const CompetitionDetail = lazy(() => import("@/pages/CompetitionDetail"));
const Support = lazy(() => import("@/pages/Support"));
const Legal = lazy(() => import("@/pages/Legal"));
const Updates = lazy(() => import("@/pages/Updates"));
const GameStatistics = lazy(() => import("@/components/profile/UserProfile"));

const Impressum = lazy(() => import("@/pages/legal/Impressum"));
const Datenschutz = lazy(() => import("@/pages/legal/Datenschutz"));
const Nutzungsbedingungen = lazy(() => import("@/pages/legal/Nutzungsbedingungen"));
const CommunityGuidelines = lazy(() => import("@/pages/legal/CommunityGuidelines"));

const Applications = lazy(() => import("@/pages/Applications"));
const Competitions = lazy(() => import("@/pages/Competitions"));
const ClubDetail = lazy(() => import("@/pages/ClubDetail"));
const TeamDetail = lazy(() => import("@/pages/TeamDetail"));
const LeagueDetail = lazy(() => import("@/pages/LeagueDetail"));
const LeagueStandings = lazy(() => import("@/pages/LeagueStandings"));
const GameDetail = lazy(() => import("@/pages/GameDetail"));
const PodcastDashboard = lazy(() => import("@/pages/PodcastDashboard"));
const NewsDashboard = lazy(() => import("@/pages/NewsDashboard"));
const LiveGamesDashboard = lazy(() => import("@/pages/LiveGamesDashboard"));

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminContent = lazy(() => import("@/pages/admin/AdminContent"));
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
const AdminGameOfTheWeek = lazy(() => import("@/pages/admin/AdminGameOfTheWeek.jsx"));
const PostDetail = lazy(() => import("@/pages/PostDetail"));

function RouteLoader() {
  return null;
}

function DataEditorRedirect() {
  const { appUserSnapshot } = useAuth();

  const target =
    hasFeatureAccess(appUserSnapshot, "data_games")
      ? "/admin/games"
      : hasFeatureAccess(appUserSnapshot, "data_teams")
        ? "/admin/teams"
        : hasFeatureAccess(appUserSnapshot, "data_leagues")
          ? "/admin/leagues"
          : hasFeatureAccess(appUserSnapshot, "data_standings")
            ? "/admin/standings"
            : hasFeatureAccess(appUserSnapshot, "data_highlights")
              ? "/admin/highlights"
              : hasFeatureAccess(appUserSnapshot, "gotw")
                ? "/gotw"
                : "/";

  return <Navigate to={target} replace />;
}

function AdminRoute({ children, requiredRoute = "/admin" }) {
  return (
    <ProtectedRoute
      requiredRoute={requiredRoute}
      allowedRoles={["admin"]}
      fallbackRoute="/settings?login=internal"
    >
      {children}
    </ProtectedRoute>
  );
}

function GotwRoute({ children }) {
  return (
    <ProtectedRoute
      requiredRoute="/gotw"
      allowedRoles={["gotw", "admin"]}
      fallbackRoute="/settings?login=internal"
    >
      {children}
    </ProtectedRoute>
  );
}

function PhotographerRoute({ children }) {
  return (
    <ProtectedRoute
      requiredRoute="/photographer"
      allowedRoles={["photographer", "admin"]}
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
      allowedRoles={["podcast", "admin"]}
      fallbackRoute="/settings?login=internal"
    >
      {children}
    </ProtectedRoute>
  );
}

function NewsRoute({ children }) {
  return (
    <ProtectedRoute
      requiredRoute="/news-dashboard"
      allowedRoles={["news", "admin"]}
      fallbackRoute="/settings?login=internal"
    >
      {children}
    </ProtectedRoute>
  );
}

function GameResultRoute({ children }) {
  return (
    <ProtectedRoute
      requiredRoute="/admin/game-result"
      fallbackRoute="/settings?login=internal"
    >
      {children}
    </ProtectedRoute>
  );
}

function LiveGamesRoute({ children }) {
  return (
    <ProtectedRoute
      requiredRoute="/live-games"
      fallbackRoute="/settings?login=internal"
    >
      {children}
    </ProtectedRoute>
  );
}

function AppRoutes() {
  return (
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

            <Route path="/playoffs" element={<Competitions />} />
            <Route path="/wettbewerbe" element={<Navigate to="/playoffs" replace />} />
            <Route path="/wettbewerbe/:competitionId" element={<CompetitionDetail />} />

            <Route path="/club/:clubId" element={<ClubDetail />} />
            <Route path="/team/:teamId" element={<TeamDetail />} />
            <Route path="/league/:leagueId" element={<LeagueDetail />} />

            <Route path="/support" element={<Support />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Navigate to="/settings" replace />} />
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
              element={<DataEditorRedirect />}
            />

            <Route
              path="/gotw"
              element={
                <GotwRoute>
                  <AdminGameOfTheWeek />
                </GotwRoute>
              }
            />

            <Route
              path="/photographer"
              element={
                <PhotographerRoute>
                  <AdminGameDayShots />
                </PhotographerRoute>
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
              path="/news-dashboard"
              element={
                <NewsRoute>
                  <NewsDashboard />
                </NewsRoute>
              }
            />

            <Route
              path="/live-games"
              element={
                <LiveGamesRoute>
                  <LiveGamesDashboard />
                </LiveGamesRoute>
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
              path="/admin/content"
              element={
                <AdminRoute>
                  <AdminContent />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/news"
              element={
                <AdminRoute>
                  <NewsDashboard />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/highlights"
              element={
                <AdminRoute requiredRoute="/admin/highlights">
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
                <AdminRoute requiredRoute="/admin/leagues">
                  <AdminLeagues />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/teams"
              element={
                <AdminRoute requiredRoute="/admin/teams">
                  <AdminTeams />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/games"
              element={
                <AdminRoute requiredRoute="/admin/games">
                  <AdminGames />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/game-of-the-week"
              element={
                <AdminRoute requiredRoute="/admin/game-of-the-week">
                  <AdminGameOfTheWeek />
                </AdminRoute>
              }
            />

            <Route
              path="/admin/gameday-shots"
              element={
                <AdminRoute requiredRoute="/admin/gameday-shots">
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
                <AdminRoute requiredRoute="/admin/standings">
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
                <GameResultRoute>
                  <AdminGameResult />
                </GameResultRoute>
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
                  <AppUserProvider>
                    <ScrollToTop />
                    <AppRoutes />
                  </AppUserProvider>
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
