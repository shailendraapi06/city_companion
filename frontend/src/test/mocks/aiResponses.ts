import type { Block, PlaceResult } from '../../types'

export const mockPlaces: PlaceResult[] = [
  {
    name: 'Zostel Koramangala',
    category: 'Hostel',
    place_id: 'plc_001',
    address: '17, 5th Block, Koramangala, Bengaluru 560095',
    latitude: 12.9352,
    longitude: 77.6245,
    price_range: { amount: 700, unit: 'night' },
    source: 'mock',
    verified: false,
    last_updated: '2026-01-01T00:00:00Z',
    rating: 4.5,
    distance_km: 2.1,
    match_score: 92,
    rank: 1,
    reason: 'Best balance of price, rating and distance.',
    amenities: ['food', 'wifi', 'hot water', 'common room'],
    phone: '+91 99000 12345',
    website: 'https://zostel.com',
    score_breakdown: { budget: 26, requirement: 24, distance: 22, rating: 20, quality: 0 },
  },
  {
    name: 'Treebo Trend JP Nagar',
    category: 'Budget Hotel',
    place_id: 'plc_002',
    address: '12, 3rd Cross, JP Nagar Phase 1, Bengaluru 560078',
    latitude: 12.9076,
    longitude: 77.5866,
    price_range: { amount: 1800, unit: 'night' },
    source: 'mock',
    verified: false,
    last_updated: '2026-01-01T00:00:00Z',
    rating: 4.2,
    distance_km: 3.4,
    match_score: 84,
    rank: 2,
    reason: 'Solid budget option close to transit.',
    amenities: ['breakfast', 'wifi', 'air conditioning'],
    phone: '+91 99000 67890',
    website: 'https://treebo.com',
    score_breakdown: { budget: 18, requirement: 22, distance: 16, rating: 14, quality: 14 },
  },
  {
    name: 'Cozy PGs Indiranagar',
    category: 'PG',
    place_id: 'plc_003',
    address: '98, 12th Main, Indiranagar, Bengaluru 560038',
    latitude: 12.9719,
    longitude: 77.6412,
    price_range: { amount: 650, unit: 'night' },
    source: 'mock',
    verified: false,
    last_updated: '2026-01-01T00:00:00Z',
    rating: 3.9,
    distance_km: 5.8,
    match_score: 76,
    rank: 3,
    reason: 'Cheapest pick if you are happy to travel a bit further.',
    amenities: ['mess', 'laundry', 'wifi'],
    score_breakdown: { budget: 28, requirement: 18, distance: 8, rating: 10, quality: 12 },
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

/* ---------------------------------------------------------------------------
 * Phase 7C payloads — match the REAL backend shapes (Backend_Schema.md §9).
 * Recommendation items are FLAT PlaceResult objects with rank/reason/
 * score_breakdown embedded (not the legacy nested {place, rank, reason}).
 * ------------------------------------------------------------------------- */

export const recommendationPayload: Block[] = [
  {
    type: 'text',
    content: 'Here are your **top stays** near HSR Layout tonight:',
  },
  {
    type: 'recommendation',
    summary: 'Top 3 picks by price + proximity',
    items: mockPlaces.map((place) => ({
      place_id: place.place_id,
      name: place.name,
      category: place.category,
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude,
      price_range: place.price_range,
      rating: place.rating,
      distance_km: place.distance_km,
      match_score: place.match_score,
      rank: place.rank,
      reason: place.reason,
      amenities: place.amenities,
      phone: place.phone,
      website: place.website,
      score_breakdown: place.score_breakdown,
      source: place.source,
      verified: place.verified,
      last_updated: place.last_updated,
    })),
  },
  {
    type: 'text',
    content: 'Zostel books out fast on weekends — grab it early.',
  },
]

export const comparisonPayload: Block[] = [
  {
    type: 'text',
    content: 'Comparing the two closest stays side by side:',
  },
  {
    type: 'comparison',
    title: 'Zostel vs Treebo',
    headers: ['Place', 'Price/night', 'Distance', 'Food', 'Rating'],
    rows: [
      ['Zostel Koramangala', '₹700', '2.1 km', 'Yes', '4.5'],
      ['Treebo Trend JP Nagar', '₹1,800', '3.4 km', 'Breakfast', '4.2'],
    ],
    explanation: 'Zostel is the pick: half the price, closer, and better rated.',
  },
]

export const longRecommendationPayload: Block[] = [
  {
    type: 'text',
    content: 'Here are all the budget stays I found near your area:',
  },
  {
    type: 'recommendation',
    summary: 'Budget stays near HSR Layout',
    items: [
      mockPlaces[0],
      mockPlaces[1],
      mockPlaces[2],
      {
        place_id: 'plc_004',
        name: 'StayVista Rooms HSR',
        category: 'Budget Hotel',
        address: '22, 17th Cross, HSR Layout, Bengaluru',
        latitude: 12.9116,
        longitude: 77.6398,
        price_range: { amount: 950, unit: 'night' },
        rating: 4.1,
        distance_km: 1.2,
        match_score: 81,
        rank: 4,
        reason: 'Closest to HSR Layout with food options on-site.',
        amenities: ['food', 'wifi', 'parking'],
        phone: '+91 99000 11111',
        source: 'mock',
        verified: false,
        last_updated: '2026-01-01T00:00:00Z',
        score_breakdown: { budget: 20, requirement: 20, distance: 26, rating: 15, quality: 0 },
      },
      {
        place_id: 'plc_005',
        name: 'BlueMoon Hostel Bellandur',
        category: 'Hostel',
        address: '5, Outer Ring Road, Bellandur, Bengaluru',
        latitude: 12.925,
        longitude: 77.6762,
        price_range: { amount: 800, unit: 'night' },
        rating: 4.3,
        distance_km: 6.4,
        match_score: 72,
        rank: 5,
        reason: 'Good rating and common area, but further out.',
        amenities: ['wifi', 'laundry'],
        website: 'https://bluemoon.example.com',
        source: 'mock',
        verified: false,
        last_updated: '2026-01-01T00:00:00Z',
        score_breakdown: { budget: 22, requirement: 16, distance: 6, rating: 18, quality: 10 },
      },
      {
        place_id: 'plc_006',
        name: 'Zova Suites Koramangala',
        category: 'Budget Hotel',
        address: '44, 1st Block, Koramangala, Bengaluru',
        latitude: 12.9345,
        longitude: 77.6184,
        price_range: { amount: 1200, unit: 'night' },
        rating: 4.4,
        distance_km: 2.8,
        match_score: 78,
        rank: 6,
        reason: 'Rooms are small but clean and well rated.',
        amenities: ['breakfast', 'wifi', 'air conditioning'],
        phone: '+91 99000 22222',
        source: 'mock',
        verified: false,
        last_updated: '2026-01-01T00:00:00Z',
        score_breakdown: { budget: 14, requirement: 20, distance: 18, rating: 18, quality: 8 },
      },
      {
        place_id: 'plc_007',
        name: 'Nest Homestay Agara',
        category: 'Homestay',
        address: '3, Agara Main Road, Bengaluru',
        latitude: 12.9268,
        longitude: 77.6019,
        price_range: { amount: 1500, unit: 'night' },
        rating: 4.6,
        distance_km: 3.9,
        match_score: 74,
        rank: 7,
        reason: 'Top-rated but above the cheapest options.',
        amenities: ['food', 'wifi', 'garden'],
        phone: '+91 99000 33333',
        website: 'https://nest.example.com',
        source: 'mock',
        verified: true,
        last_updated: '2026-07-01T00:00:00Z',
        score_breakdown: { budget: 8, requirement: 18, distance: 12, rating: 22, quality: 14 },
      },
    ],
  },
]

export const payloadActionBlocks: Block[] = [
  {
    type: 'action',
    title: 'Quick actions',
    label: 'Save this stay',
    action_type: 'save_place',
    payload: { place_id: 'plc_001' },
  },
  {
    type: 'action',
    title: 'Quick actions',
    label: 'Get directions',
    action_type: 'directions',
    payload: { latitude: 12.9352, longitude: 77.6245 },
  },
  {
    type: 'action',
    title: 'Quick actions',
    label: 'Call the front desk',
    action_type: 'call',
    payload: { phone: '+91 99000 12345' },
  },
]
