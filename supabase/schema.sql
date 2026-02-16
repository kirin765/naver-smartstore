-- =====================================================
-- Naver SmartStore AI - Database Schema
-- =====================================================

-- =====================================================
-- USERS & AUTH
-- =====================================================

-- profiles: Extended user data (synced with auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PRODUCTS
-- =====================================================

-- products: User's product listings
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Input fields
    product_name TEXT NOT NULL,
    category TEXT,
    brand TEXT,
    price INTEGER,
    keywords TEXT[],  -- Array of search keywords
    
    -- Generated output
    generated_title TEXT,
    generated_description TEXT,
    generated_bullet_specs TEXT[],
    generated_tags TEXT[],
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CREDIT SYSTEM
-- =====================================================

-- credits: User credit balance
CREATE TABLE user_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    balance INTEGER NOT NULL DEFAULT 0,
    lifetime_usage INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- credit_transactions: Credit history
CREATE TABLE credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,  -- Positive = credit, Negative = debit
    type TEXT NOT NULL,       -- 'purchase', 'usage', 'bonus', 'refund'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- credit_packages: Available credit packages (for purchase UI)
CREATE TABLE credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    credits INTEGER NOT NULL,
    price_krw INTEGER NOT NULL,  -- Price in KRW (0 for free tier)
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0
);

-- =====================================================
-- USAGE ANALYTICS
-- =====================================================

-- generation_logs: AI generation history
CREATE TABLE generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    generation_type TEXT NOT NULL,  -- 'title', 'description', 'bullet', 'tags', 'full'
    input_tokens INTEGER,
    output_tokens INTEGER,
    credits_used INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- RLS POLICIES (Row Level Security)
-- =====================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE generation_logs ENABLE ROW LEVEL SECURITY;

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can manage own products" ON products
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own credits" ON user_credits
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own logs" ON generation_logs
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    
    -- Give new user 10 free credits
    INSERT INTO public.user_credits (user_id, balance, lifetime_usage)
    VALUES (NEW.id, 10, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile and credits on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
