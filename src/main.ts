import { Actor, log } from 'apify';
import { wasPushedRecordSaved } from './billing.js';
import { normalizeInput } from './input.js';
import { scrapeZomato } from './routes.js';
import type { ActorInput } from './types.js';

await Actor.init();

try {
  const input = normalizeInput(await Actor.getInput<ActorInput>());
  log.info('Starting Zomato restaurant scrape', {
    city: input.city,
    queries: input.searchQueries,
    maxResults: input.maxResults,
  });

  await scrapeZomato(input, async (record) => {
    const chargeResult = await Actor.pushData(record, 'restaurant-scraped');
    return {
      saved: wasPushedRecordSaved(chargeResult),
      eventChargeLimitReached: chargeResult.eventChargeLimitReached,
    };
  });

  log.info('Zomato restaurant scrape finished');
} catch (error) {
  log.exception(error as Error, 'Actor failed');
  throw error;
} finally {
  await Actor.exit();
}
