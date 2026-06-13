# Zomato Restaurant Scraper - Listings, Ratings & Prices

Scrape public Zomato restaurant listings by city and keyword. This Actor collects restaurant names, cuisines, ratings, review counts, pricing signals, locality, address snippets, images, and Zomato restaurant URLs. It is designed for restaurant market research, food delivery category analysis, local competitor monitoring, cuisine discovery, and location-level hospitality research.

The scraper supports multiple keywords in one run, deduplicates restaurants by URL, scrolls Zomato result pages, handles missing fields with `null`, and saves clean records to the Apify Dataset. It uses Playwright with session rotation, retries, random delays, and optional residential proxy configuration for more reliable regional access.

This Actor extracts public business listing facts only. It does not collect emails, personal profiles, private accounts, or non-public customer data.

## Use Cases

- Restaurant market research by city, locality, cuisine, or category.
- Food delivery competitor tracking across visible restaurant listings.
- Pricing and rating analysis for restaurant discovery products.
- Local hospitality research for sales, operations, and expansion teams.
- Building restaurant datasets for dashboards, maps, and BI workflows.

## Input

```json
{
  "city": "Mumbai",
  "searchQueries": ["restaurants", "pizza", "biryani"],
  "categories": ["cafe"],
  "minRating": 3.5,
  "maxResults": 50,
  "proxyConfiguration": {
    "useApifyProxy": true,
    "apifyProxyGroups": ["RESIDENTIAL"],
    "apifyProxyCountry": "IN"
  }
}
```

## Output

```json
{
  "source": "zomato",
  "searchQuery": "restaurants",
  "city": "Mumbai",
  "position": 1,
  "restaurantId": "the-bombay-canteen-lower-parel",
  "restaurantName": "The Bombay Canteen",
  "cuisines": ["Modern Indian", "Desserts"],
  "rating": 4.5,
  "reviewCount": 4200,
  "costForTwo": "₹2,000 for two",
  "priceRange": null,
  "locality": "Lower Parel",
  "address": "Lower Parel, Mumbai",
  "deliveryTime": null,
  "imageUrl": "https://...",
  "restaurantUrl": "https://www.zomato.com/mumbai/the-bombay-canteen-lower-parel",
  "scrapedAt": "2026-06-13T12:00:00.000Z"
}
```

## How to Scrape Zomato Restaurants

1. Enter the city, for example `Mumbai`, `Delhi NCR`, `Bengaluru`, `Pune`, or `Hyderabad`.
2. Add one or more search keywords such as `restaurants`, `pizza`, `biryani`, `cafe`, or `fine dining`.
3. Set `maxResults` to control how many unique restaurants are saved.
4. Optionally set `minRating` or cuisine/text filters.
5. Run the Actor and export the dataset as JSON, CSV, Excel, or via API.

## Pricing

| Event | Price | When charged |
| --- | ---: | --- |
| `restaurant-scraped` | `$0.003` | Once per clean restaurant record saved to the dataset |

The Actor charges only after a restaurant record is successfully saved.

## Notes

- Zomato pages can vary by city, query, and region.
- Some fields may be `null` when Zomato does not show them on the listing page.
- India residential proxies are recommended for stable regional access.
- For very large runs, use multiple focused keywords rather than one broad query.

## Responsible Use

Use this Actor only for lawful purposes and in compliance with Zomato's terms, robots.txt, applicable privacy laws, and local regulations. Do not use it to collect, store, or resell personal data without a lawful basis. This Actor is intended for public restaurant listing research and market analytics.
