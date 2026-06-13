import { Actor, log } from 'apify';
import { PlaywrightCrawler, type RequestOptions } from 'crawlee';
import type { Page } from 'playwright';
import type { NormalizedInput, RawRestaurant, RestaurantRecord } from './types.js';

type PushRecord = (record: RestaurantRecord) => Promise<void>;

const BLOCKED_PATTERNS = [
  /captcha/i,
  /access denied/i,
  /are you a robot/i,
  /unusual traffic/i,
  /verify you are human/i,
];

function randomDelay(minMs = 1000, maxMs = 3000): number {
  return Math.floor(minMs + Math.random() * (maxMs - minMs + 1));
}

function buildSearchUrl(citySlug: string, query: string): string {
  const baseUrl = `https://www.zomato.com/${citySlug}/restaurants`;
  const normalizedQuery = query.trim();
  if (!normalizedQuery || normalizedQuery.toLowerCase() === 'restaurants') return baseUrl;

  const url = new URL(baseUrl);
  url.searchParams.set('q', normalizedQuery);
  return url.toString();
}

function normalizeText(value: string | null | undefined): string | null {
  const text = value?.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '').replace(/\s+/g, ' ').trim();
  return text || null;
}

function normalizeUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value, 'https://www.zomato.com').toString().split('?')[0];
  } catch {
    return null;
  }
}

function restaurantIdFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    return parts.at(-1)?.replace(/^(info|order)$/i, '') || parts.at(-2) || null;
  } catch {
    return null;
  }
}

function parseCount(value: string | null): number | null {
  if (!value) return null;
  const match = value.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k|m)?/i);
  if (!match) return null;
  const base = Number(match[1]);
  if (!Number.isFinite(base)) return null;
  const suffix = match[2]?.toLowerCase();
  if (suffix === 'm') return Math.round(base * 1_000_000);
  if (suffix === 'k') return Math.round(base * 1_000);
  return Math.round(base);
}

function inferLocality(locality: string | null, address: string | null, city: string): string | null {
  const cleanedLocality = normalizeText(locality);
  if (
    cleanedLocality
    && !/\b\d+(?:\.\d+)?\s*km\b/i.test(cleanedLocality)
    && !cleanedLocality.endsWith(',')
    && cleanedLocality.toLowerCase() !== city.toLowerCase()
  ) {
    return cleanedLocality;
  }

  const addressParts = normalizeText(address)
    ?.split(',')
    .map((part) => normalizeText(part))
    .filter(Boolean) as string[] | undefined;

  if (!addressParts?.length) return cleanedLocality;
  const cityLower = city.toLowerCase();
  const usefulParts = addressParts.filter((part) => part.toLowerCase() !== cityLower);
  return usefulParts.at(-1) ?? cleanedLocality ?? null;
}

function passesFilters(raw: RawRestaurant, input: NormalizedInput): boolean {
  if (!raw.restaurantName || !raw.restaurantUrl) return false;
  if (raw.rating !== null && raw.rating < input.minRating) return false;
  if (!input.categories.length) return true;

  const haystack = [
    raw.restaurantName,
    raw.cuisines?.join(' '),
    raw.locality,
    raw.address,
  ].filter(Boolean).join(' ').toLowerCase();

  return input.categories.some((category) => haystack.includes(category));
}

function toRecord(raw: RawRestaurant, input: NormalizedInput, query: string, position: number): RestaurantRecord {
  const restaurantUrl = normalizeUrl(raw.restaurantUrl) ?? raw.restaurantUrl ?? '';
  return {
    source: 'zomato',
    searchQuery: query,
    city: input.city,
    position,
    restaurantId: normalizeText(raw.restaurantId) ?? restaurantIdFromUrl(restaurantUrl),
    restaurantName: normalizeText(raw.restaurantName) ?? 'Unknown restaurant',
    cuisines: raw.cuisines?.map((cuisine) => normalizeText(cuisine)).filter(Boolean) as string[] | null,
    rating: raw.rating,
    reviewCount: raw.reviewCount,
    costForTwo: normalizeText(raw.costForTwo),
    priceRange: normalizeText(raw.priceRange),
    locality: inferLocality(raw.locality, raw.address, input.city),
    address: normalizeText(raw.address),
    deliveryTime: normalizeText(raw.deliveryTime),
    imageUrl: normalizeUrl(raw.imageUrl),
    restaurantUrl,
    scrapedAt: new Date().toISOString(),
  };
}

async function assertNotBlocked(page: Page): Promise<void> {
  const bodyText = await page.locator('body').innerText({ timeout: 10_000 }).catch(() => '');
  if (BLOCKED_PATTERNS.some((pattern) => pattern.test(bodyText))) {
    throw new Error('Zomato returned an anti-bot or verification page');
  }
}

async function scrollForRestaurants(page: Page, maxResults: number): Promise<void> {
  let stableScrolls = 0;
  let previousCount = 0;

  for (let i = 0; i < 16; i += 1) {
    const currentCount = await page.locator('a[href*="zomato.com"]').count().catch(() => 0);
    if (currentCount >= maxResults * 2) break;
    if (currentCount <= previousCount) stableScrolls += 1;
    else stableScrolls = 0;
    if (stableScrolls >= 3) break;

    previousCount = currentCount;
    await page.mouse.wheel(0, 3500);
    await page.waitForTimeout(randomDelay());
  }
}

async function extractRestaurants(page: Page, citySlug: string): Promise<RawRestaurant[]> {
  return page.evaluate((slug) => {
    const absoluteUrl = (value: string | null | undefined): string | null => {
      if (!value) return null;
      try {
        return new URL(value, 'https://www.zomato.com').toString().split('?')[0];
      } catch {
        return null;
      }
    };

    const clean = (value: string | null | undefined): string | null => {
      const text = value?.replace(/[\u200B-\u200D\uFEFF\u2060]/g, '').replace(/\s+/g, ' ').trim();
      return text || null;
    };

    const parseRating = (value: string | null | undefined): number | null => {
      const match = value?.match(/\b([3-4]\.\d|5(?:\.0)?)\b/);
      if (!match) return null;
      const rating = Number(match[1]);
      return Number.isFinite(rating) ? rating : null;
    };

    const parseReviewCount = (value: string | null | undefined): number | null => {
      const match = value?.replace(/,/g, '').match(/(\d+(?:\.\d+)?)\s*(k|m)?(?:\s*(?:reviews?|votes?))?/i);
      if (!match) return null;
      const base = Number(match[1]);
      if (!Number.isFinite(base)) return null;
      const suffix = match[2]?.toLowerCase();
      if (suffix === 'm') return Math.round(base * 1_000_000);
      if (suffix === 'k') return Math.round(base * 1_000);
      return Math.round(base);
    };

    const looksLikeRestaurantUrl = (href: string): boolean => {
      const url = absoluteUrl(href);
      if (!url) return false;
      try {
        const parsed = new URL(url);
        const path = parsed.pathname.toLowerCase();
        if (!parsed.hostname.includes('zomato.com')) return false;
        if (!path.includes(`/${slug}/`)) return false;
        if (!path.endsWith('/info')) return false;
        if (path === `/${slug}/restaurants` || path.includes('/restaurants/')) return false;
        if (/(collections|events|gold|who-we-are|careers|partner-with-us|privacy|contact)/.test(path)) return false;
        return path.split('/').filter(Boolean).length >= 2;
      } catch {
        return false;
      }
    };

    const extractJsonLd = (): RawRestaurant[] => {
      const output: RawRestaurant[] = [];
      const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]'));

      const visit = (node: unknown): void => {
        if (!node) return;
        if (Array.isArray(node)) {
          node.forEach(visit);
          return;
        }
        if (typeof node !== 'object') return;

        const record = node as Record<string, unknown>;
        if (Array.isArray(record['@graph'])) visit(record['@graph']);
        if (Array.isArray(record.itemListElement)) visit(record.itemListElement);
        if (record.item && typeof record.item === 'object') visit(record.item);

        const type = Array.isArray(record['@type']) ? record['@type'].join(' ') : String(record['@type'] ?? '');
        const url = absoluteUrl(String(record.url ?? ''));
        if (!type.toLowerCase().includes('restaurant') || !url || !looksLikeRestaurantUrl(url)) return;

        const address = record.address as Record<string, unknown> | string | undefined;
        const aggregateRating = record.aggregateRating as Record<string, unknown> | undefined;
        const cuisine = record.servesCuisine;
        const cuisines = Array.isArray(cuisine) ? cuisine.map(String) : typeof cuisine === 'string' ? cuisine.split(',') : null;

        output.push({
          restaurantId: null,
          restaurantName: clean(String(record.name ?? '')),
          cuisines,
          rating: parseRating(String(aggregateRating?.ratingValue ?? '')),
          reviewCount: parseReviewCount(String(aggregateRating?.reviewCount ?? aggregateRating?.ratingCount ?? '')),
          costForTwo: null,
          priceRange: clean(String(record.priceRange ?? '')),
          locality: typeof address === 'object' ? clean(String(address.addressLocality ?? '')) : null,
          address: typeof address === 'object' ? clean(String(address.streetAddress ?? address.addressRegion ?? '')) : clean(String(address ?? '')),
          deliveryTime: null,
          imageUrl: absoluteUrl(Array.isArray(record.image) ? String(record.image[0]) : String(record.image ?? '')),
          restaurantUrl: url,
        });
      };

      for (const script of scripts) {
        try {
          visit(JSON.parse(script.textContent ?? ''));
        } catch {
          // Ignore invalid JSON-LD scripts.
        }
      }

      return output;
    };

    const extractDomCards = (): RawRestaurant[] => {
      const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'));
      const records: RawRestaurant[] = [];

      for (const anchor of anchors) {
        const restaurantUrl = absoluteUrl(anchor.href);
        if (!restaurantUrl || !looksLikeRestaurantUrl(restaurantUrl)) continue;

        let card: Element | null = anchor;
        for (let depth = 0; depth < 8 && card?.parentElement; depth += 1) {
          card = card.parentElement;
          const text = clean(card.textContent);
          if (text && text.length > 45 && (card.querySelector('img') || /₹|for two|reviews?|votes?|min/i.test(text))) break;
        }

        const cardText = clean(card?.textContent) ?? clean(anchor.textContent) ?? '';
        const lines = cardText.split(/(?=[A-Z][a-z])|\n/).map(clean).filter(Boolean) as string[];
        const heading = clean(card?.querySelector('h1,h2,h3,h4,h5')?.textContent)
          ?? clean(anchor.querySelector('h1,h2,h3,h4,h5')?.textContent)
          ?? clean(anchor.textContent)
          ?? clean(card?.querySelector('img')?.getAttribute('alt'));
        const imageUrl = absoluteUrl(card?.querySelector<HTMLImageElement>('img')?.src);
        const costLine = clean(cardText.match(/(?:₹|Rs\.?)\s*[\d,]+(?:\s*for\s*(?:two|one))?/i)?.[0])
          ?? lines.find((line) => /₹|rs\.?|for two|for one/i.test(line))
          ?? null;
        const deliveryLine = lines.find((line) => /\b\d{1,3}\s*min\b/i.test(line)) ?? null;
        const cuisineLine = lines.find((line) => line.includes(',') && !/reviews?|votes?|₹|min|rating/i.test(line)) ?? null;
        const addressLine = lines.find((line) => /road|street|market|mumbai|nagar|west|east|central|near|sector|colony|area/i.test(line)) ?? null;

        records.push({
          restaurantId: null,
          restaurantName: heading,
          cuisines: cuisineLine ? cuisineLine.split(',').map((item) => clean(item)).filter(Boolean) as string[] : null,
          rating: parseRating(cardText),
          reviewCount: parseReviewCount(cardText),
          costForTwo: costLine,
          priceRange: null,
          locality: addressLine,
          address: addressLine,
          deliveryTime: deliveryLine,
          imageUrl,
          restaurantUrl,
        });
      }

      return records;
    };

    const byUrl = new Map<string, RawRestaurant>();
    for (const item of [...extractJsonLd(), ...extractDomCards()]) {
      const url = absoluteUrl(item.restaurantUrl ?? '');
      if (!url || !item.restaurantName) continue;
      const previous = byUrl.get(url);
      byUrl.set(url, {
        restaurantId: previous?.restaurantId ?? item.restaurantId ?? null,
        restaurantName: previous?.restaurantName ?? clean(item.restaurantName) ?? null,
        cuisines: previous?.cuisines ?? (item.cuisines?.length ? item.cuisines : null),
        rating: previous?.rating ?? item.rating ?? null,
        reviewCount: previous?.reviewCount ?? item.reviewCount ?? null,
        costForTwo: previous?.costForTwo ?? item.costForTwo ?? null,
        priceRange: previous?.priceRange ?? item.priceRange ?? null,
        locality: previous?.locality ?? item.locality ?? null,
        address: previous?.address ?? item.address ?? null,
        deliveryTime: previous?.deliveryTime ?? item.deliveryTime ?? null,
        imageUrl: previous?.imageUrl ?? item.imageUrl ?? null,
        restaurantUrl: url,
      });
    }

    return Array.from(byUrl.values());
  }, citySlug);
}

export async function scrapeZomato(input: NormalizedInput, pushRecord: PushRecord): Promise<void> {
  const proxyConfiguration = await Actor.createProxyConfiguration(input.proxyConfiguration);
  const seen = new Set<string>();
  let savedCount = 0;

  const requests: RequestOptions[] = input.searchQueries.map((query) => ({
    url: buildSearchUrl(input.citySlug, query),
    uniqueKey: `${input.citySlug}-${query}`,
    userData: { query },
  }));

  const crawler = new PlaywrightCrawler({
    proxyConfiguration,
    useSessionPool: true,
    sessionPoolOptions: {
      maxPoolSize: 30,
      sessionOptions: {
        maxUsageCount: 30,
      },
    },
    maxRequestRetries: 3,
    requestHandlerTimeoutSecs: 180,
    navigationTimeoutSecs: 60,
    retryOnBlocked: true,
    launchContext: {
      launchOptions: {
        headless: true,
      },
    },
    preNavigationHooks: [
      async ({ page }) => {
        await page.setExtraHTTPHeaders({
          'accept-language': 'en-IN,en;q=0.9',
          'upgrade-insecure-requests': '1',
        });
      },
    ],
    requestHandler: async ({ page, request }) => {
      if (savedCount >= input.maxResults) return;

      const query = String(request.userData.query ?? 'restaurants');
      log.info('Opening Zomato search page', { query, url: request.url });
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(randomDelay());
      await assertNotBlocked(page);
      await scrollForRestaurants(page, input.maxResults - savedCount);

      const rawRestaurants = await extractRestaurants(page, input.citySlug);
      log.info('Extracted restaurant candidates', { query, candidates: rawRestaurants.length });

      for (const raw of rawRestaurants) {
        if (savedCount >= input.maxResults) break;
        if (!passesFilters(raw, input)) continue;

        const url = normalizeUrl(raw.restaurantUrl);
        const key = url ?? `${raw.restaurantName}-${raw.locality}`;
        if (!key || seen.has(key)) continue;
        seen.add(key);

        const record = toRecord(raw, input, query, savedCount + 1);
        if (!record.restaurantUrl || !record.restaurantName) continue;

        await pushRecord(record);
        savedCount += 1;
      }
    },
    failedRequestHandler: async ({ request, error }) => {
      log.warning('Zomato request failed after retries', {
        url: request.url,
        error: error instanceof Error ? error.message : String(error),
      });
    },
  });

  await crawler.run(requests);
  log.info('Saved restaurants', { savedCount });
}
