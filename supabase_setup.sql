-- ==========================================
-- RELOAD E-COMMERCE SUPABASE SETUP (FIXED)
-- ==========================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  category_id UUID REFERENCES categories(id),
  category TEXT, -- Fallback text field
  stock_quantity INTEGER DEFAULT 10,
  sizes TEXT[] DEFAULT ARRAY['S', 'M', 'L', 'XL'],
  is_trending BOOLEAN DEFAULT false,
  is_new_arrival BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. USERS (PROFILES) TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  role TEXT DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  customer_name TEXT,
  customer_email TEXT,
  phone_number TEXT,
  shipping_address TEXT,
  zip_code TEXT,
  payment_method TEXT DEFAULT 'COD',
  total_price NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- 6. WISHLIST TABLE
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 7. NEWSLETTER TABLE
CREATE TABLE IF NOT EXISTS newsletter (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. CART TABLE
CREATE TABLE IF NOT EXISTS cart (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cart_item_id TEXT NOT NULL, 
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  image_url TEXT,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, cart_item_id)
);

-- ==========================================
-- RLS POLICIES (DATABASE)
-- ==========================================

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;

-- PUBLIC READ ACCESS
CREATE POLICY "Public Products Read" ON products FOR SELECT USING (true);
CREATE POLICY "Public Categories Read" ON categories FOR SELECT USING (true);
CREATE POLICY "Allow Newsletter Signup" ON newsletter FOR INSERT WITH CHECK (true);

-- AUTHENTICATED ACCESS (Explicit Casting for UUID vs Text)
CREATE POLICY "Users can view own profiles" ON profiles FOR SELECT USING (id::text = auth.uid()::text);
CREATE POLICY "Users can update own profiles" ON profiles FOR UPDATE USING (id::text = auth.uid()::text);
CREATE POLICY "Users can insert own profiles" ON profiles FOR INSERT WITH CHECK (id::text = auth.uid()::text);
CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT WITH CHECK (user_id::text = auth.uid()::text);
CREATE POLICY "Users can manage own wishlist" ON wishlist FOR ALL USING (user_id::text = auth.uid()::text);
CREATE POLICY "Users can manage own cart" ON cart FOR ALL USING (user_id::text = auth.uid()::text);

-- ==========================================
-- REAL-TIME CONFIGURATION
-- ==========================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE cart;
ALTER PUBLICATION supabase_realtime ADD TABLE wishlist;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;

-- ==========================================
-- INITIAL DATA
-- ==========================================

-- Insert sample categories
INSERT INTO categories (name, image_url)
VALUES 
  ('Outerwear', 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1000'),
  ('Knitwear', 'https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?q=80&w=1000'),
  ('Tailoring', 'https://images.unsplash.com/photo-1594932224828-b4b05a832fe3?q=80&w=1000'),
  ('Accessories', 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?q=80&w=1000')
ON CONFLICT DO NOTHING;

-- Sample products using the 'category' text column for simplicity in initial setup
INSERT INTO products (name, description, price, image_url, category, is_trending, is_new_arrival)
VALUES
  ('Double Breasted Overcoat', 'A classic Italian wool overcoat with a sharp silhouette.', 1250, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1000', 'Outerwear', true, false),
  ('Cashmere Crewneck', 'Ultra-soft 100% cashmere sweater for ultimate comfort.', 450, 'https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?q=80&w=1000', 'Knitwear', true, true),
  ('Slim-Fit Flannel Trousers', 'Premium wool flannel trousers with a modern slim cut.', 320, 'https://images.unsplash.com/photo-1594932224828-b4b05a832fe3?q=80&w=1000', 'Tailoring', false, true),
  ('Silk Patterned Tie', 'Hand-stitched Italian silk tie with a subtle geometric print.', 145, 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?q=80&w=1000', 'Accessories', false, true)
ON CONFLICT DO NOTHING;

-- PROMOTE USER TO ADMIN (Run this after logging in)
-- UPDATE profiles SET role = 'admin' WHERE email = 'varunrathodv@gmail.com';
