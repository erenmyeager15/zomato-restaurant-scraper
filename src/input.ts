import type { ActorInput, NormalizedInput } from './types.js';

const DEFAULT_CITY = 'Mumbai';
const DEFAULT_QUERIES = ['pizza'];
const MAX_RESULTS_LIMIT = 500;
const MAX_FILTER_ITEMS = 20;
const DEFAULT_PROXY: Record<string, unknown> = {
  useApifyProxy: true,
  apifyProxyGroups: ['RESIDENTIAL'],
  apifyProxyCountry: 'IN',
};

function cleanList(values: string[] | undefined, lowercase = false): string[] {
  return (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => lowercase ? value.toLowerCase() : value);
}

export function slugifyCity(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'mumbai';
}

function normalizeProxyConfiguration(input: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!input) return { ...DEFAULT_PROXY };
  if (input.useApifyProxy === false || Array.isArray(input.proxyUrls)) return { ...input };
  return {
    ...DEFAULT_PROXY,
    ...input,
  };
}

export function normalizeInput(input: ActorInput | null): NormalizedInput {
  const city = input?.city?.trim() || DEFAULT_CITY;
  const searchQueries = [...new Set(cleanList(input?.searchQueries))].slice(0, MAX_FILTER_ITEMS);
  const categories = [...new Set(cleanList(input?.categories, true))].slice(0, MAX_FILTER_ITEMS);

  return {
    city,
    citySlug: slugifyCity(city),
    searchQueries: searchQueries.length ? searchQueries : DEFAULT_QUERIES,
    categories,
    minRating: Math.min(Math.max(input?.minRating ?? 0, 0), 5),
    maxResults: Math.min(Math.max(input?.maxResults ?? 1, 1), MAX_RESULTS_LIMIT),
    proxyConfiguration: normalizeProxyConfiguration(input?.proxyConfiguration),
  };
}
