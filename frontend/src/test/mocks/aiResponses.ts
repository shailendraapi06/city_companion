import type { Block, PlaceResult } from '../../types'

export const mockPlaces: PlaceResult[] = [
  {
    name: 'Zostel Koramangala',
    category: 'Hostel',
    place_id: 'plc_001',
    price_range: { amount: 700, unit: 'night' },
    source: 'mock',
    verified: false,
    last_updated: '2026-01-01T00:00:00Z',
    rating: 4.5,
    distance_km: 2.1,
    match_score: 92,
    rank: 1,
  },
  {
    name: 'Treebo Trend JP Nagar',
    category: 'Budget Hotel',
    place_id: 'plc_002',
    price_range: { amount: 1800, unit: 'night' },
    source: 'mock',
    verified: false,
    last_updated: '2026-01-01T00:00:00Z',
    rating: 4.2,
    distance_km: 3.4,
    match_score: 84,
    rank: 2,
  },
  {
    name: 'Cozy PGs Indiranagar',
    category: 'PG',
    place_id: 'plc_003',
    price_range: { amount: 650, unit: 'night' },
    source: 'mock',
    verified: false,
    last_updated: '2026-01-01T00:00:00Z',
    rating: 3.9,
    distance_km: 5.8,
    match_score: 76,
    rank: 3,
  },
]

export const visualHierarchyPayload: Block[] = [
  {
    type: 'text',
    content: 'Here are the **best budget stays** near HSR Layout for tonight.',
  },
  {
    type: 'recommendation',
    summary: 'Top 3 picks by price + proximity',
    items: mockPlaces.map((place) => ({
      place,
      rank: place.rank ?? mockPlaces.indexOf(place) + 1,
      reason:
        place.name === 'Zostel Koramangala'
          ? 'Best balance of price, rating and distance.'
          : 'Solid budget option close to transit.',
    })),
  },
  {
    type: 'text',
    content: 'Zostel books out fast on weekends.',
  },
  {
    type: 'alert',
    level: 'warning',
    title: 'Prices may change',
    content: 'Live rates are fetched at booking time — confirm before paying.',
  },
]

export const markdownFeaturesPayload: Block[] = [
  {
    type: 'text',
    content: [
      '## Heading 2',
      '',
      'A paragraph with **bold**, *italic*, and ~~strikethrough~~ text.',
      '',
      '> Blockquote: stay in HSR, it is closest to the office.',
      '',
      '- Bullet list item one',
      '- Bullet list item two',
      '',
      '1. Numbered item one',
      '2. Numbered item two',
      '',
      '| Place | Rating |',
      '| --- | --- |',
      '| Zostel | 4.5 |',
      '',
      '```ts',
      'const city = "Bangalore"',
      '```',
      '',
      '[OpenStreetMap](https://www.openstreetmap.org/relation/3639663)',
    ].join('\n'),
  },
]

export const everyBlockTypePayload: Block[] = [
  {
    type: 'heading',
    level: 2,
    content: 'Evening plan: dinner + a walk',
  },
  {
    type: 'text',
    content: 'Here is a full itinerary broken into blocks.',
  },
  {
    type: 'list',
    ordered: true,
    items: ['Book Zostel', 'Grab dinner at Empire', 'Walk to the park'],
  },
  {
    type: 'table',
    title: 'Options compared',
    headers: ['Place', 'Price', 'Rating'],
    rows: [
      ['Zostel', '₹700', '4.5'],
      ['Treebo', '₹1800', '4.2'],
    ],
  },
  {
    type: 'link',
    href: 'https://www.openstreetmap.org/relation/3639663',
    content: 'City map (OpenStreetMap)',
  },
  {
    type: 'image',
    url: 'https://placehold.co/600x300?text=City+Companion',
    alt: 'Illustrative city image',
  },
  {
    type: 'place',
    place: mockPlaces[0],
  },
  {
    type: 'recommendation',
    summary: 'Top pick',
    items: [
      {
        place: mockPlaces[0],
        rank: 1,
        reason: 'Closest to your location.',
      },
    ],
  },
  {
    type: 'comparison',
    title: 'Zostel vs Treebo',
    items: mockPlaces.slice(0, 2),
  },
  {
    type: 'alert',
    level: 'info',
    title: 'Good news',
    content: 'All three are available tonight.',
  },
  {
    type: 'action',
    title: 'What next?',
    actions: ['view_details', 'directions', 'call', 'website', 'save'],
  },
  {
    type: 'map',
    title: 'Map of the area',
  },
]

export const rawHtmlPayload: Block[] = [
  {
    type: 'text',
    content: 'Trusted text only.\n<script>window.pwned = true</script>\n<img src="x" onerror="window.pwned = true" />',
  },
]

export const unknownTypePayload: Block[] = [
  {
    type: 'transport',
    duration_min: 12,
    fare_inr: 150,
  } as unknown as Block,
  {
    type: 'text',
    content: 'Still rendering after the unknown block.',
  },
]

export const mapOnlyPayload: Block[] = [
  {
    type: 'map',
    title: 'Map placeholder',
  },
]
