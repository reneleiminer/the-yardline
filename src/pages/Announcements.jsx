import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { Search } from "lucide-react";

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

function parseJsonMessage(message) {
  if (!message) return {};
  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}


function isDeletedOrBlockedAuthor(author) {
  return (
    !author ||
    author.deletionStatus === "pending" ||
    author.deletionStatus === "completed" ||
    author.status === "deleted" ||
    author.status === "blocked_deleted" ||
    author.status === "banned" ||
    author.status === "blocked" ||
    author.status === "inactive"
  );
}

function isPostVisibleByAuthor(post, appUsersById) {
  if (post?.isHidden || post?.isDeleted || post?.isActive === false) return false;
  if (!post?.authorId) return true;

  return !isDeletedOrBlockedAuthor(appUsersById.get(post.authorId));
}

function isVisibleNews(post, appUsersById) {
  if (!post) return false;
  if (!isPostVisibleByAuthor(post, appUsersById)) return false;
  return post.type === "news" || post.type === "transfer" || post.type === "official";
}

function NewsCard({ post, featured = false }) {
  const image = getPostImages(post)[0];
  const date = getPostDate(post);
  const timeAgo = date ? formatDistanceToNow(new Date(date), { addSuffix: true, locale: de }) : "";
  const meta = parseJsonMessage(post.message);
  const category = post.type === "transfer"
    ? "Transfer"
    : post.category || (post.sourceType === "club_news" ? "Vereinsnews" : "News");
  const authorName = meta.author_name || meta.authorName || post.authorUsername || "";

  if (!featured) {
    return (
      <Link to={`/post/${post.id}`} className="grid min-h-[132px] grid-cols-[1fr_132px] overflow-hidden rounded-[26px] border border-white/10 bg-black/82 text-white shadow-[0_16px_36px_rgba(0,0,0,0.32)]">
        <div className="min-w-0 p-4">
          <p className="text-[10px] font-black uppercase tracking-wide text-[#ff2338]">{category}</p>
          <h2 className="mt-1 line-clamp-2 text-lg font-black italic leading-tight">
            {post.title || "News"}
          </h2>
          {(post.teaser || post.text) && (
            <p className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-white/58">
              {post.teaser || post.text}
            </p>
          )}
          {timeAgo && <p className="mt-2 text-[10px] font-bold text-white/45">{timeAgo}</p>}
          {authorName && (
            <p className="mt-1 truncate text-[10px] font-bold uppercase text-white/35">
              Presented by {authorName}
            </p>
          )}
        </div>

        <div className="bg-black/60">
          {image ? (
            <img src={getImageUrl(image)} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-blue-700 to-red-700" />
          )}
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/post/${post.id}`} className="block overflow-hidden rounded-[30px] border border-white/10 bg-black/84 text-white shadow-[0_20px_44px_rgba(0,0,0,0.34)]">
      {image && (
        <div className="aspect-[16/9] bg-black/60">
          <img src={getImageUrl(image)} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      )}

      <div className="p-4">
        <p className="text-[10px] font-black uppercase tracking-wide text-[#ff2338]">{category}</p>
        <h2 className="mt-1 line-clamp-2 text-3xl font-black italic leading-tight">
          {post.title || "News"}
        </h2>
        {(post.teaser || post.text) && (
          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-relaxed text-white/58">
            {post.teaser || post.text}
          </p>
        )}
        {timeAgo && <p className="mt-3 text-[11px] font-bold text-white/45">{timeAgo}</p>}
        {authorName && (
          <p className="mt-1 truncate text-[10px] font-bold uppercase text-white/35">
            Presented by {authorName}
          </p>
        )}
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

  const { data: appUsers = [] } = useQuery({
    queryKey: ["news-page-app-users"],
    queryFn: () => base44.entities.AppUser.list("-created_date", 500),
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    retry: 1,
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });

  const { data: appUpdates = [] } = useQuery({
    queryKey: ["news-page-banners"],
    queryFn: () => base44.entities.AppUpdate.list("-created_date", 200),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const adBanners = useMemo(() => {
    return appUpdates
      .filter((item) => item.version === "ad_banner" && item.isActive !== false)
      .map((item) => {
        const meta = parseJsonMessage(item.message);
        return {
          id: item.id,
          title: meta.title || item.title || "Werbung",
          imageUrl: meta.image_url || meta.imageUrl || item.imageUrl || "",
          linkUrl: meta.link_url || meta.linkUrl || "",
          active: meta.active !== false,
        };
      })
      .filter((item) => item.active && (item.title || item.imageUrl));
  }, [appUpdates]);

  const appUsersById = useMemo(() => new Map(appUsers.map((user) => [user.id, user])), [appUsers]);

  const visiblePosts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return posts
      .filter((post) => isVisibleNews(post, appUsersById))
      .filter((post) => {
        if (!query) return true;
        return [post.title, post.teaser, post.text, post.category, post.type]
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
  }, [appUsersById, posts, search]);

  const featured = visiblePosts[0] || null;
  const rest = featured ? visiblePosts.slice(1) : visiblePosts;
  const banner = adBanners[0] || null;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 pb-24">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/48" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="News suchen..."
          className="h-12 w-full rounded-2xl border border-white/12 bg-black/72 pl-10 pr-3 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-[#2f7dff]"
        />
      </div>

      {isLoading && visiblePosts.length === 0 ? null : visiblePosts.length === 0 ? (
        <p className="py-10 text-center text-lg font-black uppercase italic text-white">Keine News vorhanden.</p>
      ) : (
        <div className="space-y-4">
          {featured && <NewsCard post={featured} featured />}

          {rest.length > 0 && (
            <div className="space-y-3">
              {rest.map((post, index) => (
                <React.Fragment key={post.id}>
                  <NewsCard post={post} />
                  {banner && (index + 1) % 4 === 0 && (
                    <a
                      href={banner.linkUrl || undefined}
                      target={banner.linkUrl ? "_blank" : undefined}
                      rel="noreferrer"
                      className="block overflow-hidden rounded-[26px] border border-white/10 bg-black text-white shadow-[0_18px_38px_rgba(0,0,0,0.32)]"
                    >
                      {banner.imageUrl && (
                        <img src={getImageUrl(banner.imageUrl)} alt="" className="aspect-[16/5] w-full object-cover" loading="lazy" />
                      )}
                      <div className="p-4">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff2338]">Werbung</p>
                        <p className="mt-1 text-xl font-black italic">{banner.title}</p>
                      </div>
                    </a>
                  )}
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
