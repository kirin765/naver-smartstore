// Product types
export interface Product {
  id: string;
  user_id: string;
  product_name: string;
  category?: string;
  brand?: string;
  price?: number;
  keywords?: string[];
  generated_title?: string;
  generated_description?: string;
  generated_bullet_specs?: string[];
  generated_tags?: string[];
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export interface ProductInput {
  product_name: string;
  category?: string;
  brand?: string;
  price?: number;
  keywords?: string[];
}

// Credit types
export interface UserCredits {
  id: string;
  user_id: string;
  balance: number;
  lifetime_usage: number;
  updated_at: string;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'purchase' | 'usage' | 'bonus' | 'refund';
  description?: string;
  created_at: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price_krw: number;
  is_active: boolean;
}

// Generation types
export interface GenerateInput {
  productName: string;
  category?: string;
  brand?: string;
  price?: number;
  keywords: string[];
  tone?: 'professional' | 'friendly' | 'expert';
}

export interface GenerateOutput {
  title?: string;
  alternatives?: string[];
  description?: string;
  highlights?: string[];
  bulletSpecs?: string[];
  tags?: string[];
  creditsUsed: number;
}

// User types
export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
}
