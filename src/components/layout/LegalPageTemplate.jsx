import React from 'react';

export default function LegalPageTemplate({ title, content }) {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-6 pb-24">
      <article className="rounded-2xl border border-border/50 bg-card px-4 py-5 sm:px-6 sm:py-6">
        <h1 className="text-2xl font-black mb-5">
          {title}
        </h1>

        <div className="text-sm text-foreground/90 leading-7 whitespace-pre-wrap">
          {content}
        </div>
      </article>
    </div>
  );
}