import React, { useState, useRef, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Textarea } from '@/components/ui/textarea';
import { parseMentions } from '@/lib/mentionUtils';
import { getImageUrl } from '@/lib/imageUtils';

const MIN_MENTION_QUERY_LENGTH = 2;
const SUGGESTION_LIMIT = 5;

function getActiveMentionQuery(text) {
  if (!text) return null;

  const lastAtIndex = text.lastIndexOf('@');
  if (lastAtIndex < 0) return null;

  const afterAt = text.slice(lastAtIndex + 1);

  if (/\s/.test(afterAt)) return null;
  if (afterAt.includes('\n')) return null;

  return {
    query: afterAt.trim().toLowerCase(),
    startIndex: lastAtIndex,
  };
}

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

export default function MentionInput({
  value,
  onChange,
  placeholder,
  disabled,
  onMentionsChange,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const textareaRef = useRef(null);

  const activeMention = useMemo(() => {
    return getActiveMentionQuery(value || '');
  }, [value]);

  const debouncedMention = useDebounce(activeMention, 250);

  useEffect(() => {
    if (!onMentionsChange) return;

    const mentions = parseMentions(value || '');
    onMentionsChange(mentions);
  }, [value, onMentionsChange]);

  useEffect(() => {
    let cancelled = false;

    const fetchSuggestions = async () => {
      const query = debouncedMention?.query || '';

      if (query.length < MIN_MENTION_QUERY_LENGTH) {
        setSuggestions([]);
        setLoadingSuggestions(false);
        return;
      }

      setLoadingSuggestions(true);

      try {
        const users = await base44.entities.AppUser.filter({
          deletionRequested: false,
        });

        if (cancelled) return;

        const filtered = users
          .filter(user => {
            if (!user?.username) return false;
            if (user.status === 'banned') return false;
            if (user.deletionStatus === 'completed') return false;

            const username = user.username.toLowerCase();
            const displayName = user.displayName?.toLowerCase() || '';

            return username.includes(query) || displayName.includes(query);
          })
          .sort((a, b) => {
            const aStarts = a.username?.toLowerCase().startsWith(query) ? 0 : 1;
            const bStarts = b.username?.toLowerCase().startsWith(query) ? 0 : 1;

            if (aStarts !== bStarts) return aStarts - bStarts;

            return (b.followersCount || 0) - (a.followersCount || 0);
          })
          .slice(0, SUGGESTION_LIMIT);

        setSuggestions(filtered);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();

    return () => {
      cancelled = true;
    };
  }, [debouncedMention]);

  const showSuggestions =
    !!activeMention &&
    activeMention.query.length >= MIN_MENTION_QUERY_LENGTH &&
    suggestions.length > 0;

  const handleSelectUser = (user) => {
    if (!activeMention) return;

    const text = value || '';
    const beforeMention = text.slice(0, activeMention.startIndex);
    const afterMention = text.slice(activeMention.startIndex + activeMention.query.length + 1);
    const newText = `${beforeMention}@${user.username} ${afterMention}`;

    onChange({ target: { value: newText } });
    setSuggestions([]);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="text-sm"
      />

      {showSuggestions && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-lg shadow-lg z-10 overflow-hidden">
          {suggestions.map(user => (
            <button
              key={user.id}
              type="button"
              onClick={() => handleSelectUser(user)}
              className="w-full text-left px-3 py-2 hover:bg-secondary/50 transition-colors flex items-center gap-2 border-b border-border/20 last:border-0"
            >
              {user.avatar ? (
                <img
                  src={getImageUrl(user.avatar)}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  fetchPriority="low"
                  className="w-5 h-5 rounded-full object-cover flex-shrink-0 bg-secondary"
                  onError={event => {
                    event.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-secondary flex-shrink-0" />
              )}

              <span className="text-xs font-medium truncate">
                {user.username}
              </span>

              {user.displayName && (
                <span className="text-xs text-muted-foreground ml-auto truncate max-w-[120px]">
                  {user.displayName}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {activeMention?.query?.length >= MIN_MENTION_QUERY_LENGTH && loadingSuggestions && suggestions.length === 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border/50 rounded-lg shadow-lg z-10 px-3 py-2">
          <p className="text-xs text-muted-foreground">
            Suche Nutzer...
          </p>
        </div>
      )}
    </div>
  );
}