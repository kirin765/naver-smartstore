// Credit costs for each generation type
export const CREDIT_COSTS = {
  title: 1,
  description: 2,
  bullet: 1,
  tags: 1,
  full: 5,
} as const;

// Free tier limits
export const FREE_TIER_CREDITS = 10;
export const FREE_TIER_MONTHLY_RESET_DAY = 1;

// Tone options
export const TONE_OPTIONS = ['professional', 'friendly', 'expert'] as const;
export type Tone = typeof TONE_OPTIONS[number];

// Product categories (common Naver SmartStore categories)
export const CATEGORIES = [
  '패션의류',
  '패션잡화',
  '화장품/미용',
  '디지털가전',
  '가정용품',
  '육아',
  '식품',
  '스포츠',
  '도서',
  '여행',
  '기타',
] as const;

// Generation type
export const GENERATION_TYPES = ['title', 'description', 'bullet', 'tags', 'full'] as const;
export type GenerationType = typeof GENERATION_TYPES[number];

// Status
export const PRODUCT_STATUS = ['draft', 'published'] as const;
export type ProductStatus = typeof PRODUCT_STATUS[number];
