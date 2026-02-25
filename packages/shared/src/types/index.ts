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
  image_urls?: string[];
  image_analysis?: any;
  analysis_status?: 'pending' | 'done' | 'failed' | null;
  analysis_prompt_version?: string;
  status: 'draft' | 'published';
  created_at: string;
  updated_at: string;
}

export interface ImageAnalysisSuggestion {
  candidate_product_name?: string;
  category_guess?: string;
  brand?: string;
  materials?: string[];
  features?: string[];
  selling_points?: string[];
  search_tags?: string[];
  description_html?: string;
  price_guess?: number;
  confidence?: number;
  source?: 'image' | 'text' | 'combined';
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
  paddle_customer_id?: string | null;
  paddle_subscription_id?: string | null;
  subscription_status?: 'none' | 'active' | 'past_due' | 'canceled' | 'expired' | 'trial';
  plan_code?: string | null;
  subscription_expires_at?: string | null;
  subscription_next_billing_at?: string | null;
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
