import React from 'react';
import { Link } from 'react-router-dom';
import { getImageUrl } from '@/lib/imageUtils';

export default function FeaturedCard({ post }) {
  if (!post) return null;

  const image = getImageUrl(post.images?.[0]);

  return (
    <div className="px-4 py-2">
      <Link to={`/post/${post.id}`} className="block relative rounded-2xl overflow-hidden aspect-[16/9] group">
        <img
          src={image}
          alt={post.title || 'Featured'}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { e.target.src = getImageUrl(); }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          {post.category && (
            <span className="inline-block px-2.5 py-0.5 bg-primary/90 text-primary-foreground text-xs font-semibold rounded-full mb-2">
              {post.category}
            </span>
          )}
          <h2 className="text-white font-bold text-lg leading-tight line-clamp-2">
            {post.title || post.text}
          </h2>
          {post.teaser && (
            <p className="text-white/70 text-sm mt-1 line-clamp-1">{post.teaser}</p>
          )}
        </div>
      </Link>
    </div>
  );
}