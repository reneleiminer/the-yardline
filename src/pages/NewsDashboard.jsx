import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Edit3,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Plus,
  Quote,
  Save,
  Trash2,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";

import { base44 } from "@/api/base44Client";
import ImageUploadField from "@/components/common/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useSetHeader from "@/hooks/useSetHeader";
import { useAuth } from "@/lib/AuthContext";
import { getImageUrl } from "@/lib/imageUtils";
import InternalAccessCards from "@/components/admin/InternalAccessCards";

const EMPTY_FORM = {
  type: "news",
  title: "",
  coverImageUrl: "",
  teaser: "",
  transferPlayer: "",
  transferFromExternal: "",
  transferFromTeamId: "",
  transferToTeamId: "",
  blocks: [],
};

function parseJsonMessage(message) {
  if (!message) return {};
  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function getPostDate(post) {
  return post?.publishedAtUtc || post?.createdAtUtc || post?.created_date || "";
}

function getTeamName(team) {
  return team?.shortName || team?.name || "Team";
}

function createBlock(type = "text") {
  return {
    id: crypto.randomUUID(),
    type,
    title: type === "quote" ? "Zitat" : type === "stats" ? "Statistik" : type === "image" ? "Bild" : "Textabschnitt",
    text: "",
    imageUrl: "",
    subject: "",
    rows: [{ label: "", value: "" }],
  };
}

function getUsefulBlocks(blocks = []) {
  return blocks.filter((block) => {
    if (block.type === "image") return !!block.imageUrl;
    if (block.type === "stats") {
      return !!block.subject || (block.rows || []).some((row) => row.label || row.value);
    }
    return !!block.text;
  });
}

function getPlainText(blocks = []) {
  return blocks
    .filter((block) => block.type === "text" || block.type === "quote")
    .map((block) => block.text)
    .filter(Boolean)
    .join("\n\n");
}

function normalizeFormFromPost(post) {
  const meta = parseJsonMessage(post.message);
  const blocks = Array.isArray(meta.blocks) && meta.blocks.length > 0
    ? meta.blocks
    : [createBlock("text")].map((block) => ({ ...block, text: post.text || "" }));

  return {
    ...EMPTY_FORM,
    type: post.type === "transfer" ? "transfer" : "news",
    title: post.title || "",
    coverImageUrl: post.imageUrl || "",
    teaser: post.teaser || "",
    transferPlayer: meta.transfer_player || meta.transferPlayer || "",
    transferFromExternal: meta.transfer_from_external || meta.transferFromExternal || "",
    transferFromTeamId: meta.transfer_from_team_id || meta.transferFromTeamId || "",
    transferToTeamId: meta.transfer_to_team_id || meta.transferToTeamId || "",
    blocks,
  };
}

function PostPreview({ post }) {
  const meta = parseJsonMessage(post.message);
  const image = post.imageUrl || "";

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/76 text-white shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
      {image && <img src={getImageUrl(image)} alt="" className="aspect-square w-full object-cover" loading="lazy" />}
      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff2338]">
          {post.type === "transfer" ? "Transfer" : "News"}
        </p>
        <h3 className="mt-1 line-clamp-2 text-lg font-black leading-tight">{post.title || "Ohne Titel"}</h3>
        {(post.teaser || post.text) && (
          <p className="mt-2 line-clamp-3 text-xs font-semibold leading-relaxed text-white/58">
            {post.teaser || post.text}
          </p>
        )}
        <div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-bold uppercase text-white/45">
          <span>Presented by {meta.author_name || post.authorUsername || "News"}</span>
          <span>{getPostDate(post) ? new Date(getPostDate(post)).toLocaleDateString("de-DE") : ""}</span>
        </div>
      </div>
    </div>
  );
}

export default function NewsDashboard() {
  useSetHeader({ mode: "dashboard", title: "News Dashboard" });

  const queryClient = useQueryClient();
  const { appUserSnapshot } = useAuth();
  const initialProfile = useMemo(() => ({
    authorName: appUserSnapshot?.newsProfileName || appUserSnapshot?.displayName || appUserSnapshot?.username || "",
    profileUrl: appUserSnapshot?.newsProfileUrl || "",
    profilePlatform: appUserSnapshot?.newsProfilePlatform || "instagram",
  }), [appUserSnapshot]);

  const [editingId, setEditingId] = useState("");
  const [profileForm, setProfileForm] = useState(initialProfile);
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    blocks: [createBlock("text")],
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["news-dashboard-posts"],
    queryFn: () => base44.entities.Post.list("-publishedAtUtc", 200),
    staleTime: 1000 * 60,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["news-dashboard-teams"],
    queryFn: () => base44.entities.Team.list("name"),
    staleTime: 1000 * 60 * 10,
  });

  const ownPosts = useMemo(() => {
    const isAdmin = appUserSnapshot?.roleSlug === "admin";
    const profileNames = [
      profileForm.authorName,
      initialProfile.authorName,
      appUserSnapshot?.displayName,
      appUserSnapshot?.username,
    ].filter(Boolean).map((value) => String(value).trim().toLowerCase());

    return posts
      .filter((post) => ["news", "transfer"].includes(post.type))
      .filter((post) => !post.isDeleted)
      .filter((post) => {
        if (isAdmin) return true;
        const meta = parseJsonMessage(post.message);
        return (
          post.authorId === appUserSnapshot?.id ||
          profileNames.includes(String(post.authorUsername || "").trim().toLowerCase()) ||
          profileNames.includes(String(meta.author_name || meta.authorName || "").trim().toLowerCase())
        );
      })
      .sort((a, b) => new Date(getPostDate(b) || 0) - new Date(getPostDate(a) || 0));
  }, [appUserSnapshot, initialProfile.authorName, posts, profileForm.authorName]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const resetForm = () => {
    setEditingId("");
    setForm({
      ...EMPTY_FORM,
      blocks: [createBlock("text")],
    });
  };

  const saveProfileMutation = useMutation({
    mutationFn: () => base44.entities.AppUser.update(appUserSnapshot.id, {
      newsProfileName: profileForm.authorName.trim(),
      newsProfileUrl: profileForm.profileUrl.trim(),
      newsProfilePlatform: profileForm.profilePlatform,
      updatedAtUtc: new Date().toISOString(),
    }),
    onSuccess: () => {
      toast.success("News-Profil gespeichert");
      queryClient.invalidateQueries({ queryKey: ["appUser"] });
    },
    onError: (error) => toast.error(error.message || "Profil konnte nicht gespeichert werden"),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Titel fehlt.");
      const usefulBlocks = getUsefulBlocks(form.blocks);
      if (usefulBlocks.length === 0) throw new Error("Mindestens ein Inhaltselement fehlt.");

      const authorName = profileForm.authorName.trim() || appUserSnapshot?.displayName || appUserSnapshot?.username || "News";
      const plainText = getPlainText(usefulBlocks);
      const blockImages = usefulBlocks.filter((block) => block.type === "image").map((block) => block.imageUrl).filter(Boolean);
      const firstImage = form.coverImageUrl.trim() || blockImages[0] || "";
      const teamIds = form.type === "transfer"
        ? [form.transferFromTeamId, form.transferToTeamId].filter(Boolean)
        : [];

      const message = JSON.stringify({
        author_name: authorName,
        profile_url: profileForm.profileUrl.trim(),
        profile_platform: profileForm.profilePlatform,
        blocks: usefulBlocks,
        transfer_player: form.transferPlayer.trim(),
        transfer_from_external: form.transferFromExternal.trim(),
        transfer_from_team_id: form.transferFromTeamId,
        transfer_to_team_id: form.transferToTeamId,
      });

      const payload = {
        type: form.type,
        sourceType: "news_dashboard",
        authorId: appUserSnapshot?.id,
        authorUsername: authorName,
        authorRole: "News",
        authorRoleSlug: "news",
        title: form.title.trim(),
        teaser: form.teaser.trim(),
        text: plainText,
        imageUrl: firstImage,
        images: [firstImage, ...blockImages].filter(Boolean),
        category: form.type === "transfer" ? "Transfer" : "News",
        teamIds,
        teamId: teamIds[0] || "",
        isHidden: false,
        isDeleted: false,
        featured: false,
        publishedAtUtc: new Date().toISOString(),
        message,
        updatedAtUtc: new Date().toISOString(),
      };

      if (editingId) return base44.entities.Post.update(editingId, payload);
      return base44.entities.Post.create(payload);
    },
    onSuccess: () => {
      toast.success(editingId ? "Beitrag aktualisiert" : "Beitrag veröffentlicht");
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["news-dashboard-posts"] });
      queryClient.invalidateQueries({ queryKey: ["home-overview-news"] });
      queryClient.invalidateQueries({ queryKey: ["news-page-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => toast.error(error.message || "Beitrag konnte nicht gespeichert werden"),
  });

  const deleteMutation = useMutation({
    mutationFn: (postId) => base44.entities.Post.update(postId, {
      isDeleted: true,
      isHidden: true,
      updatedAtUtc: new Date().toISOString(),
    }),
    onSuccess: () => {
      toast.success("Beitrag gelöscht");
      queryClient.invalidateQueries({ queryKey: ["news-dashboard-posts"] });
      queryClient.invalidateQueries({ queryKey: ["home-overview-news"] });
      queryClient.invalidateQueries({ queryKey: ["news-page-posts"] });
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const updateBlock = (blockId, patch) => {
    set("blocks", form.blocks.map((block) => block.id === blockId ? { ...block, ...patch } : block));
  };

  const moveBlock = (blockId, direction) => {
    const index = form.blocks.findIndex((block) => block.id === blockId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= form.blocks.length) return;
    const next = [...form.blocks];
    [next[index], next[target]] = [next[target], next[index]];
    set("blocks", next);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-24 text-white">
      <InternalAccessCards currentKey="news" className="mb-5" />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <section className="rounded-[28px] border border-white/10 bg-black/72 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2338]">Redaktion</p>
              <h1 className="mt-1 text-2xl font-black uppercase italic leading-tight">News & Transfers</h1>
            </div>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm} className="border-white/15 bg-white/8 text-white hover:bg-white/12">
                Neuer Beitrag
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/7 p-1">
            {[
              { value: "news", label: "News" },
              { value: "transfer", label: "Transfer" },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => set("type", item.value)}
                className={`rounded-xl py-2 text-xs font-black uppercase transition-colors ${form.type === item.value ? "bg-[#c20f1a] text-white" : "text-white/55"}`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            <Input value={form.title} onChange={(event) => set("title", event.target.value)} placeholder="Titel" className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/42" />
            <textarea value={form.teaser} onChange={(event) => set("teaser", event.target.value)} placeholder="Kurzer Teaser" className="min-h-[76px] w-full rounded-2xl border border-white/10 bg-white/10 p-3 text-sm font-semibold text-white outline-none placeholder:text-white/42" />
            <ImageUploadField value={form.coverImageUrl} onChange={(value) => set("coverImageUrl", value)} label="Cover-Bild" />
            <Input value={form.coverImageUrl} onChange={(event) => set("coverImageUrl", event.target.value)} placeholder="oder Cover-URL einfügen" className="h-11 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/42" />
          </div>

          {form.type === "transfer" && (
            <div className="mt-4 rounded-[24px] border border-white/10 bg-white/6 p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/70">Transfer-Daten</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={form.transferPlayer} onChange={(event) => set("transferPlayer", event.target.value)} placeholder="Spielername" className="h-11 rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-white/42" />
                <Input value={form.transferFromExternal} onChange={(event) => set("transferFromExternal", event.target.value)} placeholder="Von externem Team, falls nicht in App" className="h-11 rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-white/42" />
                <select value={form.transferFromTeamId} onChange={(event) => set("transferFromTeamId", event.target.value)} className="h-11 rounded-2xl border border-white/10 bg-[#151515] px-3 text-sm font-semibold text-white">
                  <option value="">Von Team aus der App...</option>
                  {teams.map((team) => <option key={team.id} value={team.id}>{getTeamName(team)}</option>)}
                </select>
                <select value={form.transferToTeamId} onChange={(event) => set("transferToTeamId", event.target.value)} className="h-11 rounded-2xl border border-white/10 bg-[#151515] px-3 text-sm font-semibold text-white">
                  <option value="">Zu Team...</option>
                  {teams.map((team) => <option key={team.id} value={team.id}>{getTeamName(team)}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-[24px] border border-white/10 bg-white/6 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">Inhalt</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => set("blocks", [...form.blocks, createBlock("text")])} className="bg-white text-black hover:bg-white/90"><FileText className="mr-1 h-3.5 w-3.5" />Text</Button>
                <Button type="button" size="sm" onClick={() => set("blocks", [...form.blocks, createBlock("quote")])} className="bg-white text-black hover:bg-white/90"><Quote className="mr-1 h-3.5 w-3.5" />Zitat</Button>
                <Button type="button" size="sm" onClick={() => set("blocks", [...form.blocks, createBlock("image")])} className="bg-white text-black hover:bg-white/90"><ImageIcon className="mr-1 h-3.5 w-3.5" />Bild</Button>
                <Button type="button" size="sm" onClick={() => set("blocks", [...form.blocks, createBlock("stats")])} className="bg-white text-black hover:bg-white/90"><BarChart3 className="mr-1 h-3.5 w-3.5" />Stats</Button>
              </div>
            </div>

            <div className="space-y-3">
              {form.blocks.map((block) => (
                <div key={block.id} className="rounded-2xl border border-white/10 bg-black/42 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Input value={block.title} onChange={(event) => updateBlock(block.id, { title: event.target.value })} placeholder="Element-Titel" className="h-10 rounded-xl border-white/10 bg-white/10 text-white" />
                    <button type="button" onClick={() => moveBlock(block.id, -1)} className="rounded-xl bg-white/10 p-2 text-white"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => moveBlock(block.id, 1)} className="rounded-xl bg-white/10 p-2 text-white"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => set("blocks", form.blocks.filter((item) => item.id !== block.id))} className="rounded-xl bg-red-500/15 p-2 text-red-200"><Trash2 className="h-4 w-4" /></button>
                  </div>

                  {block.type === "image" ? (
                    <div className="space-y-3">
                      <ImageUploadField value={block.imageUrl} onChange={(value) => updateBlock(block.id, { imageUrl: value })} label="Bild im Beitrag" />
                      <Input value={block.imageUrl} onChange={(event) => updateBlock(block.id, { imageUrl: event.target.value })} placeholder="oder Bild-URL" className="h-10 rounded-xl border-white/10 bg-white/10 text-white" />
                      <Input value={block.text} onChange={(event) => updateBlock(block.id, { text: event.target.value })} placeholder="Bildunterschrift optional" className="h-10 rounded-xl border-white/10 bg-white/10 text-white" />
                    </div>
                  ) : block.type === "stats" ? (
                    <div className="space-y-2">
                      <Input value={block.subject} onChange={(event) => updateBlock(block.id, { subject: event.target.value })} placeholder="Spieler oder Team" className="h-10 rounded-xl border-white/10 bg-white/10 text-white" />
                      {(block.rows || []).map((row, rowIndex) => (
                        <div key={rowIndex} className="grid grid-cols-2 gap-2">
                          <Input value={row.label} onChange={(event) => {
                            const rows = [...(block.rows || [])];
                            rows[rowIndex] = { ...rows[rowIndex], label: event.target.value };
                            updateBlock(block.id, { rows });
                          }} placeholder="Statistik" className="h-10 rounded-xl border-white/10 bg-white/10 text-white" />
                          <Input value={row.value} onChange={(event) => {
                            const rows = [...(block.rows || [])];
                            rows[rowIndex] = { ...rows[rowIndex], value: event.target.value };
                            updateBlock(block.id, { rows });
                          }} placeholder="Wert" className="h-10 rounded-xl border-white/10 bg-white/10 text-white" />
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={() => updateBlock(block.id, { rows: [...(block.rows || []), { label: "", value: "" }] })} className="border-white/15 bg-white/8 text-white hover:bg-white/12">
                        <Plus className="mr-1 h-3.5 w-3.5" /> Wert
                      </Button>
                    </div>
                  ) : (
                    <textarea value={block.text} onChange={(event) => updateBlock(block.id, { text: event.target.value })} placeholder={block.type === "quote" ? "Zitat..." : "Textabschnitt..."} className="min-h-[112px] w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm font-semibold text-white outline-none placeholder:text-white/42" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()} className="mt-5 h-12 w-full rounded-2xl bg-[#c20f1a] font-black uppercase text-white hover:bg-[#a90d16]">
            <Save className="mr-2 h-4 w-4" />
            {editingId ? "Speichern" : "Veröffentlichen"}
          </Button>
        </section>

        <aside className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-black/72 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur">
            <div className="mb-3 flex items-center gap-2">
              <UserCog className="h-4 w-4 text-[#ff2338]" />
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">News-Profil</p>
            </div>
            <div className="space-y-3">
              <Input value={profileForm.authorName} onChange={(event) => setProfileForm((current) => ({ ...current, authorName: event.target.value }))} placeholder="Fester Name / Presented by" className="h-11 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/42" />
              <Input value={profileForm.profileUrl} onChange={(event) => setProfileForm((current) => ({ ...current, profileUrl: event.target.value }))} placeholder="Profil-Link" className="h-11 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/42" />
              <select value={profileForm.profilePlatform} onChange={(event) => setProfileForm((current) => ({ ...current, profilePlatform: event.target.value }))} className="h-11 w-full rounded-2xl border border-white/10 bg-[#151515] px-3 text-sm font-semibold text-white">
                <option value="instagram">Instagram</option>
                <option value="x">X</option>
                <option value="youtube">YouTube</option>
                <option value="website">Website</option>
              </select>
              <Button type="button" onClick={() => saveProfileMutation.mutate()} disabled={saveProfileMutation.isPending} className="h-11 w-full rounded-2xl bg-white text-black hover:bg-white/90">
                Profil speichern
              </Button>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-black/72 p-4 shadow-[0_18px_44px_rgba(0,0,0,0.32)] backdrop-blur">
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/70">Deine Beiträge</p>
            <div className="space-y-3">
              {ownPosts.length === 0 ? (
                <p className="py-8 text-center text-sm font-black uppercase text-white/55">Noch keine Beiträge</p>
              ) : ownPosts.map((post) => (
                <div key={post.id} className="rounded-[22px] border border-white/10 bg-white/6 p-3">
                  <PostPreview post={post} />
                  <div className="mt-3 flex gap-2">
                    <Button type="button" size="sm" onClick={() => {
                      setEditingId(post.id);
                      setForm(normalizeFormFromPost(post));
                    }} className="flex-1 bg-white text-black hover:bg-white/90">
                      <Edit3 className="mr-1 h-3.5 w-3.5" /> Bearbeiten
                    </Button>
                    <Button type="button" size="sm" asChild className="bg-white/10 text-white hover:bg-white/15">
                      <a href={`/post/${post.id}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    <Button type="button" size="sm" onClick={() => deleteMutation.mutate(post.id)} className="bg-red-500/15 text-red-100 hover:bg-red-500/25">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
