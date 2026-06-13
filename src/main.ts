import { Actor, log } from 'apify';
import { scrapeZomato } from './routes.js';
import type { ActorInput, NormalizedInput } from './types.js';

const DEFAULT_CITY = 'Mumbai';
const DEFAULT_QUERIES = ['restaurants'];
const MAX_RESULTS_LIMIT = 500;

function slugifyCity(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'mumbai';
}

function normalizeInput(input: ActorInput | null): NormalizedInput {
  const city = input?.city?.trim() || DEFAULT_CITY;
  const searchQueries = (input?.searchQueries?.length ? input.searchQueries : DEFAULT_QUERIES)
    .map((query) => query.trim())
    .filter(Boolean);
  const categories = (input?.categories ?? [])
    .map((category) => category.trim().toLowerCase())
    .filter(Boolean);
  const maxResults = Math.min(Math.max(input?.maxResults ?? 50, 1), MAX_RESULTS_LIMIT);
  const minRating = Math.min(Math.max(input?.minRating ?? 0, 0), 5);

  return {
    city,
    citySlug: slugifyCity(city),
    searchQueries: searchQueries.length ? [...new Set(searchQueries)] : DEFAULT_QUERIES,
    categories,
    minRating,
    maxResults,
    proxyConfiguration: input?.proxyConfiguration,
  };
}

await Actor.init();

try {
  const input = normalizeInput(await Actor.getInput<ActorInput>());
  log.info('Starting Zomato restaurant scrape', {
    city: input.city,
    queries: input.searchQueries,
    maxResults: input.maxResults,
  });

  await scrapeZomato(input, async (record) => {
    await Actor.pushData(record);
    await Actor.charge({ eventName: 'restaurant-scraped' });
  });

  log.info('Zomato restaurant scrape finished');
} catch (error) {
  log.exception(error as Error, 'Actor failed');
  throw error;
} finally {
  await Actor.exit();
}
