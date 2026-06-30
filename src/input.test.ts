import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeInput } from './input.js';

test('uses a one-result, India residential default', () => {
  const input = normalizeInput(null);

  assert.equal(input.city, 'Mumbai');
  assert.equal(input.citySlug, 'mumbai');
  assert.deepEqual(input.searchQueries, ['pizza']);
  assert.equal(input.minRating, 0);
  assert.equal(input.maxResults, 1);
  assert.deepEqual(input.proxyConfiguration, {
    useApifyProxy: true,
    apifyProxyGroups: ['RESIDENTIAL'],
    apifyProxyCountry: 'IN',
  });
});

test('cleans filters, clamps limits, and completes partial proxy input', () => {
  const input = normalizeInput({
    city: ' Delhi NCR ',
    searchQueries: [' Biryani ', '', 'Biryani'],
    categories: [' North Indian ', 'NORTH INDIAN'],
    minRating: 9,
    maxResults: 900,
    proxyConfiguration: { apifyProxyCountry: 'IN' },
  });

  assert.equal(input.city, 'Delhi NCR');
  assert.equal(input.citySlug, 'delhi-ncr');
  assert.deepEqual(input.searchQueries, ['Biryani']);
  assert.deepEqual(input.categories, ['north indian']);
  assert.equal(input.minRating, 5);
  assert.equal(input.maxResults, 500);
  assert.deepEqual(input.proxyConfiguration, {
    useApifyProxy: true,
    apifyProxyGroups: ['RESIDENTIAL'],
    apifyProxyCountry: 'IN',
  });
});

test('caps query counts and preserves explicit proxy-off input', () => {
  const input = normalizeInput({
    searchQueries: Array.from({ length: 25 }, (_, index) => `query-${index}`),
    proxyConfiguration: { useApifyProxy: false },
  });

  assert.equal(input.searchQueries.length, 20);
  assert.deepEqual(input.proxyConfiguration, { useApifyProxy: false });
});
