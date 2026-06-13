import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, BarChart3, Edit3, ExternalLink, FileText, Plus, Quote, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { base44 } from "@/api/base44Client";
import ImageUploadField from "@/components/common/ImageUploadField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useSetHeader from "@/hooks/useSetHeader";
import { useAuth } from "@/lib/AuthContext";
import { getImageUrl } from "@/lib/imageUtils";

const EMPTY_FORM = {
  type: "news",
  title: "",
  imageUrl: "",
  authorName: "",
  profileUrl: "",
  profilePlatform: "instagram",
  teaser: "",
  text: "",
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

function createBlock(type) {
  return {
    id: crypto.randomUUID(),
    type,
    title: type === "quote" ? "Zitat" : type === "stats" ? "Statistik" : "Textabschnitt",
    text: "",
    subject: "",
    rows: [{ label: "", value: "" }],
  };
}

function normalizeFormFromPost(post) {
  const meta = parseJsonMessage(post.message);

  return {
    ...EMPTY_FORM,
    type: post.type === "transfer" ? "transfer" : "news",
    title: post.title || "",
    imageUrl: post.imageUrl || "",
    authorName: meta.author_name || meta.authorName || post.authorUsername || "",
    profileUrl: meta.profile_url || meta.profileUrl || "",
    profilePlatform: meta.profile_platform || meta.profilePlatform || "instagram",
    teaser: post.teaser || "",
    text: post.text || "",
    transferPlayer: meta.transfer_player || meta.transferPlayer || "",
    transferFromExternal: meta.transfer_from_external || meta.transferFromExternal || "",
    transferFromTeamId: meta.transfer_from_team_id || meta.transferFromTeamId || "",
    transferToTeamId: meta.transfer_to_team_id || meta.transferToTeamId || "",
    blocks: Array.isArray(meta.blocks) ? meta.blocks : [],
  };
}

function PostPreview({ post }) {
  const meta = parseJsonMessage(post.message);

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-black/76 text-white shadow-[0_18px_42px_rgba(0,0,0,0.28)]">
      {post.imageUrl && (
        <img src={getImageUrl(post.imageUrl)} alt="" className="aspect-square w-full object-cover" loading="lazy" />
      )}
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
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({
    ...EMPTY_FORM,
    authorName: appUserSnapshot?.displayName || appUserSnapshot?.username || "",
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["news-dashboard-posts"],
    queryFn: () => base44.entities.Post.list("-publishedAtUtc", 120),
    staleTime: 1000 * 60,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ["news-dashboard-teams"],
    queryFn: () => base44.entities.Team.list("name"),
    staleTime: 1000 * 60 * 10,
  });

  const ownPosts = useMemo(() => {
    const isAdmin = appUserSnapshot?.roleSlug === "admin";
    return posts
      .filter((post) => ["news", "transfer"].includes(post.type))
      .filter((post) => isAdmin || post.authorId === appUserSnapshot?.id)
      .sort((a, b) => new Date(getPostDate(b) || 0) - new Date(getPostDate(a) || 0));
  }, [appUserSnapshot?.id, appUserSnapshot?.roleSlug, posts]);

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));

  const resetForm = () => {
    setEditingId("");
    setForm({
      ...EMPTY_FORM,
      authorName: appUserSnapshot?.displayName || appUserSnapshot?.username || "",
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Titel fehlt.");
      if (!form.text.trim() && form.blocks.length === 0) throw new Error("Text oder Inhaltselement fehlt.");

      const authorName = form.authorName.trim() || appUserSnapshot?.displayName || appUserSnapshot?.username || "News";
      const teamIds = form.type === "transfer"
        ? [form.transferFromTeamId, form.transferToTeamId].filter(Boolean)
        : [];

      const message = JSON.stringify({
        author_name: authorName,
        profile_url: form.profileUrl.trim(),
        profile_platform: form.profilePlatform,
        blocks: form.blocks,
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
        text: form.text.trim(),
        imageUrl: form.imageUrl.trim(),
        images: form.imageUrl.trim() ? [form.imageUrl.trim()] : [],
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
    },
  });

  const updateBlock = (blockId, patch) => {
    set("blocks", form.blocks.map(block => block.id === blockId ? { ...block, ...patch } : block));
  };

  const moveBlock = (blockId, direction) => {
    const index = form.blocks.findIndex(block => block.id === blockId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= form.blocks.length) return;
    const next = [...form.blocks];
    [next[index], next[target]] = [next[target], next[index]];
    set("blocks", next);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-24 text-white">
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
            ].map(item => (
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

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Input value={form.title} onChange={event => set("title", event.target.value)} placeholder="Titel" className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/42" />
            <Input value={form.authorName} onChange={event => set("authorName", event.target.value)} placeholder="Name / Presented by" className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/42" />
            <Input value={form.profileUrl} onChange={event => set("profileUrl", event.target.value)} placeholder="Profil-Link, z.B. Instagram" className="h-12 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/42" />
            <select value={form.profilePlatform} onChange={event => set("profilePlatform", event.target.value)} className="h-12 rounded-2xl border border-white/10 bg-[#151515] px-3 text-sm font-semibold text-white">
              <option value="instagram">Instagram</option>
              <option value="x">X</option>
              <option value="youtube">YouTube</option>
              <option value="website">Website</option>
            </select>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[220px_1fr]">
            <div>
              <ImageUploadField value={form.imageUrl} onChange={value => set("imageUrl", value)} label="Quadratisches Bild" />
              <Input value={form.imageUrl} onChange={event => set("imageUrl", event.target.value)} placeholder="oder Bild-URL einfügen" className="mt-3 h-11 rounded-2xl border-white/10 bg-white/10 text-white placeholder:text-white/42" />
            </div>

            <div className="space-y-3">
              <textarea value={form.teaser} onChange={event => set("teaser", event.target.value)} placeholder="Kurzer Teaser" className="min-h-[76px] w-full rounded-2xl border border-white/10 bg-white/10 p-3 text-sm font-semibold text-white outline-none placeholder:text-white/42" />
              <textarea value={form.text} onChange={event => set("text", event.target.value)} placeholder="Haupttext" className="min-h-[150px] w-full rounded-2xl border border-white/10 bg-white/10 p-3 text-sm font-semibold leading-relaxed text-white outline-none placeholder:text-white/42" />
            </div>
          </div>

          {form.type === "transfer" && (
            <div className="mt-4 rounded-[24px] border border-white/10 bg-white/6 p-4">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/70">Transfer-Daten</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={form.transferPlayer} onChange={event => set("transferPlayer", event.target.value)} placeholder="Spielername" className="h-11 rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-white/42" />
                <Input value={form.transferFromExternal} onChange={event => set("transferFromExternal", event.target.value)} placeholder="Von externem Team, falls nicht in App" className="h-11 rounded-2xl border-white/10 bg-black/40 text-white placeholder:text-white/42" />
                <select value={form.transferFromTeamId} onChange={event => set("transferFromTeamId", event.target.value)} className="h-11 rounded-2xl border border-white/10 bg-[#151515] px-3 text-sm font-semibold text-white">
                  <option value="">Von Team aus der App...</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{getTeamName(team)}</option>)}
                </select>
                <select value={form.transferToTeamId} onChange={event => set("transferToTeamId", event.target.value)} className="h-11 rounded-2xl border border-white/10 bg-[#151515] px-3 text-sm font-semibold text-white">
                  <option value="">Zu Team...</option>
                  {teams.map(team => <option key={team.id} value={team.id}>{getTeamName(team)}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="mt-4 rounded-[24px] border border-white/10 bg-white/6 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">Elemente</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => set("blocks", [...form.blocks, createBlock("text")])} className="bg-white text-black hover:bg-white/90"><FileText className="mr-1 h-3.5 w-3.5" />Text</Button>
                <Button type="button" size="sm" onClick={() => set("blocks", [...form.blocks, createBlock("quote")])} className="bg-white text-black hover:bg-white/90"><Quote className="mr-1 h-3.5 w-3.5" />Zitat</Button>
                <Button type="button" size="sm" onClick={() => set("blocks", [...form.blocks, createBlock("stats")])} className="bg-white text-black hover:bg-white/90"><BarChart3 className="mr-1 h-3.5 w-3.5" />Stats</Button>
              </div>
            </div>

            <div className="space-y-3">
              {form.blocks.map((block) => (
                <div key={block.id} className="rounded-2xl border border-white/10 bg-black/42 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <Input value={block.title} onChange={event => updateBlock(block.id, { title: event.target.value })} placeholder="Element-Titel" className="h-10 rounded-xl border-white/10 bg-white/10 text-white" />
                    <button type="button" onClick={() => moveBlock(block.id, -1)} className="rounded-xl bg-white/10 p-2 text-white"><ArrowUp className="h-4 w-4" /></button>
                    <button type="button" onClick={() => moveBlock(block.id, 1)} className="rounded-xl bg-white/10 p-2 text-white"><ArrowDown className="h-4 w-4" /></button>
                    <button type="button" onClick={() => set("blocks", form.blocks.filter(item => item.id !== block.id))} className="rounded-xl bg-red-500/15 p-2 text-red-200"><Trash2 className="h-4 w-4" /></button>
                  </div>

                  {block.type === "stats" ? (
                    <div className="space-y-2">
                      <Input value={block.subject} onChange={event => updateBlock(block.id, { subject: event.target.value })} placeholder="Spieler oder Team" className="h-10 rounded-xl border-white/10 bg-white/10 text-white" />
                      {(block.rows || []).map((row, rowIndex) => (
                        <div key={rowIndex} className="grid grid-cols-2 gap-2">
                          <Input value={row.label} onChange={event => {
                            const rows = [...(block.rows || [])];
                            rows[rowIndex] = { ...rows[rowIndex], label: event.target.value };
                            updateBlock(block.id, { rows });
                          }} placeholder="Statistik" className="h-10 rounded-xl border-white/10 bg-white/10 text-white" />
                          <Input value={row.value} onChange={event => {
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
                    <textarea value={block.text} onChange={event => updateBlock(block.id, { text: event.target.value })} placeholder={block.type === "quote" ? "Zitat..." : "Textabschnitt..."} className="min-h-[92px] w-full rounded-xl border border-white/10 bg-white/10 p-3 text-sm font-semibold text-white outline-none placeholder:text-white/42" />
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
            <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-white/70">Deine Beiträge</p>
            <div className="space-y-3">
              {ownPosts.length === 0 ? (
                <p className="py-8 text-center text-sm font-black uppercase text-white/55">Noch keine Beiträge</p>
              ) : ownPosts.map(post => (
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
