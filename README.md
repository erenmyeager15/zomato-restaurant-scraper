# Zomato Restaurant Scraper - Listings, Ratings & Prices

Scrape public Zomato restaurant listings by city and keyword. This Actor collects restaurant names, cuisines, ratings, review counts, pricing signals, locality, address snippets, images, and Zomato restaurant URLs. It is designed for restaurant market research, food delivery category analysis, local competitor monitoring, cuisine discovery, and location-level hospitality research.

For the first run, use one city, one keyword such as `pizza`, `minRating` set to `0`, `maxResults` set to `1`, and the recommended India residential proxy. Inspect that record, then increase the limit or rating filter.

The scraper supports multiple keywords in one run, deduplicates restaurants by URL, scrolls Zomato result pages, handles missing fields with `null`, and saves clean records to the Apify Dataset. It uses Playwright with session rotation, retries, random delays, and India residential proxy configuration for more reliable regional access.

This independent Actor extracts public business listing facts only. It is not an official Zomato API and does not collect accounts, orders, customer data, private restaurant-dashboard data, hidden contacts, or personal profiles.

## Use Cases

- Restaurant market research by city, locality, cuisine, or category.
- Food delivery competitor tracking across visible restaurant listings.
- Pricing and rating analysis for restaurant discovery products.
- Local hospitality research for sales, operations, and expansion teams.
- Building restaurant datasets for dashboards, maps, and BI workflows.

## Pricing and cost control

This Actor uses Apify Pay Per Event pricing. Check the run cost estimate and set a maximum cost per run in Apify Console before scaling. Browser compute and India residential proxy use affect platform resource consumption.

| Event | Price | When charged |
| --- | ---: | --- |
| `apify-actor-start` | `$0.00005 / GB` | Charged at startup according to Actor memory, with at least one event |
| `restaurant-scraped` | `$0.003` | Once per clean restaurant record saved to the dataset |

Restaurant records are charged only when they are successfully saved. A small start event covers browser initialization.

Cost-control tips:

- Start with one city, such as `Mumbai`.
- Use one keyword or cuisine, such as `pizza`, `biryani`, or `cafe`.
- Use `maxResults: 1` and `minRating: 0` for the first run.
- Raise `minRating` when you specifically need higher-rated results.
- Keep the recommended India residential proxy enabled for regional reliability.
- Set a maximum cost per run in Apify Console. The Actor aborts further crawling when Apify reports that limit.
- Increase result limits only after a small run returns the expected restaurant records.

## Input

Tiny test input:

```json
{
  "city": "Mumbai",
  "searchQueries": ["pizza"],
  "categories": [],
  "minRating": 0,
  "maxResults": 1,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"],
    "apifyProxyCountry": "IN"
  }
}
```

| Field | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `city` | string | no | `Mumbai` | Zomato city to search. |
| `searchQueries` | array | no | `["pizza"]` | Restaurant or cuisine keywords. Use one keyword for tests. |
| `categories` | array | no | `[]` | Optional text filters matched against restaurant name, cuisine, locality, and address. |
| `minRating` | number | no | `0` | Only save restaurants at or above this rating. Raise after the first run if needed. |
| `maxResults` | integer | no | `1` | Maximum unique restaurant records to save. Start with one result. |
| `proxyConfiguration` | object | no | India residential | Proxy settings recommended for regional access. |

## Output dataset

```json
{
  "source": "zomato",
  "searchQuery": "pizza",
  "city": "Mumbai",
  "position": 1,
  "restaurantId": "dea-fire-flair-fermentation-prabhadevi",
  "restaurantName": "DEA - Fire, Flair, Fermentation",
  "cuisines": ["Pizza", "Italian"],
  "rating": 4.4,
  "reviewCount": 615,
  "costForTwo": "INR 4,000 for two",
  "priceRange": null,
  "locality": "Prabhadevi",
  "address": "6th Floor, Swatantrya Veer Savarkar Marg, Mumbai",
  "deliveryTime": null,
  "imageUrl": "https://...",
  "restaurantUrl": "https://www.zomato.com/mumbai/dea-fire-flair-fermentation-prabhadevi",
  "scrapedAt": "2026-06-21T13:42:16.000Z"
}
```

## How to Scrape Zomato Restaurants

1. Enter one city, for example `Mumbai`, `Delhi NCR`, `Bengaluru`, `Pune`, or `Hyderabad`.
2. Add one search keyword such as `pizza`, `biryani`, `cafe`, or `fine dining`.
3. Set `maxResults` to `1` and `minRating` to `0` for the first run.
4. After checking the output, optionally raise `minRating` or add cuisine/text filters.
5. Run the Actor and export the dataset as JSON, CSV, Excel, or via API.

## Notes

- Zomato pages can vary by city, query, and region.
- Some fields may be `null` when Zomato does not show them on the listing page.
- India residential proxies are recommended for stable regional access.
- For large runs, use focused keywords rather than one broad query.

## Responsible Use

Use this Actor only for lawful purposes and in compliance with Zomato's terms, robots.txt, applicable privacy laws, and local regulations. Do not use it to collect, store, or resell personal data without a lawful basis. This Actor is intended for public restaurant listing research and market analytics and is not affiliated with Zomato.
