import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";

import PageNotFound from "./lib/PageNotFound";
import { AuthProvider } from "@/lib/AuthContext";
import { GlobalDataProvider } from "@/lib/GlobalDataContext";
import { HeaderProvider } from "@/lib/HeaderContext";
import { AppUserProvider } from "@/lib/useAppUser";
import ProtectedRoute from "@/components/ProtectedRoute";
import ScrollToTop from "@/components/ScrollToTop";

import AppLayout from "@/components/layout/AppLayout.jsx";

const Home = lazy(() => import("@/pages/Home"));
const Games = lazy(() => import("@/pages/Games"));
const Highlights = lazy(() => import("@/pages/AnnouncementDetail"));
const Tables = lazy(() => import("@/pages/Tables"));
const Competitions = lazy(() => import("@/pages/Competitions"));
const CompetitionDetail = lazy(() => import("@/pages/CompetitionDetail"));
const Support = lazy(() => import("@/pages/Support"));
const Settings = lazy(() => import("@/pages/Settings"));
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
const Announcements = lazy(() => import("@/pages/Announcements"));
const PostDetail = lazy(() => import("@/pages/PostDetail"));
const CreateNews = lazy(() => import("@/pages/create/News"));

function RouteLoader() {
  return (
    <div className="min-h-[calc(100dvh-160px)] w-full flex items-center justify-center">
      <div className="h-12 w-12 rounded-2xl border border-primary/25 bg-black/70 flex items-center justify-center shadow-[0_0_24px_rgba(0,91,255,0.18)]">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    </div>
  );
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
      allowedRoles={["data_editor", "media_partner"]}
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
          <Route element={<AppLayout />}>
            <Route path="/" element={<Home />} />

            <Route path="/feed" element={<Announcements />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/create/news" element={<CreateNews />} />
            <Route path="/spiele" element={<Games />} />
            <Route path="/highlights" element={<Highlights />} />
            <Route path="/game/:id" element={<GameDetail />} />

            <Route path="/tabellen" element={<Tables />} />
            <Route path="/tabellen/:leagueId" element={<LeagueStandings />} />

            <Route path="/wettbewerbe" element={<Competitions />} />
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
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <GlobalDataProvider>
            <HeaderProvider>
              <ScrollToTop />
              <AppRoutes />
            </HeaderProvider>
          </GlobalDataProvider>
        </Router>

        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
