import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Loader2, Search } from "lucide-react";

import { base44 } from "@/api/base44Client";
import { getImageUrl } from "@/lib/imageUtils";

function getPostImages(post) {
  if (Array.isArray(post?.images)) return post.images.filter(Boolean);
  if (post?.imageUrl) return [post.imageUrl];
  if (post?.image) return [post.image];
  if (post?.coverImageUrl) return [post.coverImageUrl];
  return [];
}

function getPostDate(post) {
  return post?.publishedAtUtc || post?.createdAtUtc || post?.created_date || post?.createdAt || "";
}

function isVisibleNews(post) {
  if (!post) return false;
  if (post.isHidden || post.isDeleted) return false;
  if (post.isActive === false) return false;
  return post.type === "news" || post.type === "official";
}

function NewsCard({ post, featured = false }) {
  const image = getPostImages(post)[0];
  const date = getPostDate(post);
  const timeAgo = date ? formatDistanceToNow(new Date(date), { addSuffix: true, locale: de }) : "";
  const category = post.category || (post.sourceType === "club_news" ? "Vereinsnews" : "News");

  return (
    <Link to={`/post/${post.id}`} className="block overflow-hidden rounded-[24px] bg-white text-black">
      {image && (
        <div className={featured ? "aspect-[16/9] bg-slate-200" : "aspect-[16/10] bg-slate-200"}>
          <img src={getImageUrl(image)} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}

      <div className={featured ? "p-4" : "p-3"}>
        <p className="text-[10px] font-black uppercase tracking-wide text-red-700">{category}</p>
        <h2 className={`${featured ? "text-xl" : "text-sm"} mt-1 line-clamp-2 font-black leading-tight`}>
          {post.title || "News"}
        </h2>
        {(post.teaser || post.text) && (
          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-black/55">
            {post.teaser || post.text}
          </p>
        )}
        {timeAgo && <p className="mt-3 text-[11px] font-bold text-black/40">{timeAgo}</p>}
      </div>
    </Link>
  );
}

export default function Announcements() {
  const [search, setSearch] = useState("");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["news-page-posts"],
    queryFn: () => base44.entities.Post.list("-publishedAtUtc", 80),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return posts
      .filter(isVisibleNews)
      .filter((post) => {
        if (!query) return true;
        return [post.title, post.teaser, post.text, post.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        const dateA = new Date(getPostDate(a) || 0).getTime();
        const dateB = new Date(getPostDate(b) || 0).getTime();
        return dateB - dateA;
      });
  }, [posts, search]);

  const featured = visiblePosts[0] || null;
  const rest = featured ? visiblePosts.slice(1) : visiblePosts;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-24">
      <div className="mb-5">
        <h1 className="text-4xl font-black italic tracking-normal text-black">News</h1>
        <div className="yardline-stripes mt-3 h-9 rounded-2xl bg-white" />
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/45" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="News suchen..."
          className="h-12 w-full rounded-2xl border border-black/10 bg-white pl-10 pr-3 text-sm font-semibold text-black outline-none placeholder:text-black/35 focus:border-blue-600"
        />
      </div>

      {isLoading && visiblePosts.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
        </div>
      ) : visiblePosts.length === 0 ? (
        <div className="rounded-[24px] bg-white px-4 py-10 text-center">
          <p className="text-sm font-bold text-black/45">Keine News vorhanden.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {featured && <NewsCard post={featured} featured />}

          {rest.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {rest.map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
