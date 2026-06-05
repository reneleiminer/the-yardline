import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Search, UserSearch as UserSearchIcon, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import UserSearchCard from '@/components/search/UserSearchCard';
import useSetHeader from '@/hooks/useSetHeader';
import { getRoleSlug } from '@/lib/roleDefinitions';

const FILTERS = [
  { label: 'Alle', slug: null },
  { label: 'Fans', slug: 'fan' },
  { label: 'Creator', slug: 'creator' },
  { label: 'Journalisten', slug: 'journalist' },
  { label: 'Fotografen', slug: 'photographer' },
  { label: 'Vereine', slug: 'club' },
  { label: 'Ligen', slug: 'league' },
  { label: 'Offizielle Medien', slug: 'official_media' },
];

const HIDDEN_PUBLIC_ROLES = new Set([
  'admin',
  'moderator',
  'data_editor',
]);

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debounced;
}

function isPublicSearchUser(user) {
  if (!user) return false;
  if (user.deletionRequested || user.deletionStatus === 'completed') return false;
  if (user.status === 'banned') return false;
  if (!user.username) return false;

  const roleSlug = getRoleSlug(user.roleSlug || user.role || 'fan');

  if (HIDDEN_PUBLIC_ROLES.has(roleSlug)) return false;

  return true;
}

export default function UserSearch() {
  useSetHeader({ mode: 'back', title: 'Nutzer suchen' });

  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const debouncedQuery = useDebounce(query.trim(), 300);

  const search = useCallback(async (searchQuery, roleFilter) => {
    if (!searchQuery && roleFilter === null) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const allUsers = await base44.entities.AppUser.filter({
        deletionRequested: false,
      });

      const lower = searchQuery.toLowerCase();

      let filtered = allUsers.filter(user => {
        if (!isPublicSearchUser(user)) return false;

        const roleSlug = getRoleSlug(user.roleSlug || user.role || 'fan');

        if (roleFilter && roleSlug !== roleFilter) return false;

        if (searchQuery) {
          const matchUsername = user.username?.toLowerCase().includes(lower);
          const matchDisplay = user.displayName?.toLowerCase().includes(lower);
          const matchRole = roleSlug.toLowerCase().includes(lower);
          const matchLegacyRole = user.role?.toLowerCase().includes(lower);

          if (!matchUsername && !matchDisplay && !matchRole && !matchLegacyRole) {
            return false;
          }
        }

        return true;
      });

      if (searchQuery) {
        filtered = filtered.sort((a, b) => {
          const aExact = a.username?.toLowerCase() === lower ? 0 : 1;
          const bExact = b.username?.toLowerCase() === lower ? 0 : 1;

          if (aExact !== bExact) return aExact - bExact;

          return (b.followersCount || 0) - (a.followersCount || 0);
        });
      } else {
        filtered = filtered.sort((a, b) => {
          return (b.followersCount || 0) - (a.followersCount || 0);
        });
      }

      setResults(filtered);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery, activeFilter);
  }, [debouncedQuery, activeFilter, search]);

  const handleFilterClick = slug => {
    setActiveFilter(current => current === slug ? null : slug);
  };

  return (
    <div className="px-4 pt-4 pb-24 space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

        <Input
          autoFocus
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Nutzer, Vereine, Ligen, Creator suchen..."
          className="pl-9 pr-9 bg-secondary/50 border-border/50 rounded-xl"
        />

        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
        {FILTERS.map(filter => (
          <button
            key={filter.slug ?? 'alle'}
            onClick={() => handleFilterClick(filter.slug)}
            className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
              activeFilter === filter.slug
                ? 'bg-primary text-white border-primary'
                : 'bg-card border-border/50 text-muted-foreground hover:border-primary/30'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : searched && results.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <UserSearchIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Keine Nutzer gefunden</p>
          <p className="text-xs mt-1">Versuche einen anderen Suchbegriff</p>
        </div>
      ) : !searched ? (
        <div className="text-center py-12 text-muted-foreground">
          <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">Gib einen Namen oder Username ein</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground px-1">
            {results.length} Ergebnis{results.length !== 1 ? 'se' : ''}
          </p>

          {results.map(user => (
            <UserSearchCard key={user.id} user={user} />
          ))}
        </div>
      )}
    </div>
  );
}