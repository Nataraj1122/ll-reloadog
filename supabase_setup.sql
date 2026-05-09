-- ==========================================
-- RELOAD E-COMMERCE SUPABASE SETUP (FIXED)
-- ==========================================

-- IMPORTANT: IF YOU GET "column 'id' does not exist", RUN THESE FIRST TO RESET YOUR TABLES:
-- DROP TABLE IF EXISTS cart CASCADE;
-- DROP TABLE IF EXISTS wishlist CASCADE;
-- DROP TABLE IF EXISTS orders CASCADE;
-- DROP TABLE IF EXISTS profiles CASCADE;
-- DROP TABLE IF EXISTS products CASCADE;
-- DROP TABLE IF EXISTS categories CASCADE;
-- DROP TABLE IF EXISTS newsletter CASCADE;

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL,
  image_url TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
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
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by TEXT,
  cancellation_reason TEXT
);

-- 6. WISHLIST TABLE
CREATE TABLE IF NOT EXISTS wishlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- 7. NEWSLETTER TABLE
CREATE TABLE IF NOT EXISTS newsletter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. CART TABLE
CREATE TABLE IF NOT EXISTS cart (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
DROP POLICY IF EXISTS "Public Products Read" ON products;
CREATE POLICY "Public Products Read" ON products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Public Categories Read" ON categories;
CREATE POLICY "Public Categories Read" ON categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow Newsletter Signup" ON newsletter;
CREATE POLICY "Allow Newsletter Signup" ON newsletter FOR INSERT WITH CHECK (true);

-- ADMIN ACCESS
DROP POLICY IF EXISTS "Admins manage categories" ON categories;
CREATE POLICY "Admins manage categories" ON categories FOR ALL TO authenticated USING (auth.jwt() ->> 'email' = 'varunrathodv@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'varunrathodv@gmail.com');
DROP POLICY IF EXISTS "Admins manage products" ON products;
CREATE POLICY "Admins manage products" ON products FOR ALL TO authenticated USING (auth.jwt() ->> 'email' = 'varunrathodv@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'varunrathodv@gmail.com');
DROP POLICY IF EXISTS "Admins manage orders" ON orders;
CREATE POLICY "Admins manage orders" ON orders FOR ALL TO authenticated USING (auth.jwt() ->> 'email' = 'varunrathodv@gmail.com') WITH CHECK (auth.jwt() ->> 'email' = 'varunrathodv@gmail.com');

-- AUTHENTICATED ACCESS (Explicit Casting for UUID vs Text)
DROP POLICY IF EXISTS "Users can view own profiles" ON profiles;
CREATE POLICY "Users can view own profiles" ON profiles FOR SELECT USING (id::text = auth.uid()::text);
DROP POLICY IF EXISTS "Users can update own profiles" ON profiles;
CREATE POLICY "Users can update own profiles" ON profiles FOR UPDATE USING (id::text = auth.uid()::text);
DROP POLICY IF EXISTS "Users can insert own profiles" ON profiles;
CREATE POLICY "Users can insert own profiles" ON profiles FOR INSERT WITH CHECK (id::text = auth.uid()::text);
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
CREATE POLICY "Users can manage own orders" ON orders FOR ALL USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can manage own wishlist" ON wishlist;
CREATE POLICY "Users can manage own wishlist" ON wishlist FOR ALL USING (user_id::text = auth.uid()::text);
DROP POLICY IF EXISTS "Users can manage own cart" ON cart;
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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'cart') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE cart;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'wishlist') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wishlist;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'products') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE products;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'categories') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE categories;
  END IF;
END $$;

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
ON CONFLICT (name) DO NOTHING;

-- Sample products using the 'category' text column for simplicity in initial setup
INSERT INTO products (name, description, price, image_url, category, is_trending, is_new_arrival)
VALUES
  ('Double Breasted Overcoat', 'A classic Italian wool overcoat with a sharp silhouette.', 1250, 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?q=80&w=1000', 'Outerwear', true, false),
  ('Cashmere Crewneck', 'Ultra-soft 100% cashmere sweater for ultimate comfort.', 450, 'https://images.unsplash.com/photo-1614676471928-2ed0ad1061a4?q=80&w=1000', 'Knitwear', true, true),
  ('Slim-Fit Flannel Trousers', 'Premium wool flannel trousers with a modern slim cut.', 320, 'https://images.unsplash.com/photo-1594932224828-b4b05a832fe3?q=80&w=1000', 'Tailoring', false, true),
  ('Silk Patterned Tie', 'Hand-stitched Italian silk tie with a subtle geometric print.', 145, 'https://images.unsplash.com/photo-1614164185128-e4ec99c436d7?q=80&w=1000', 'Accessories', false, true)
ON CONFLICT (name) DO NOTHING;

-- PROMOTE USER TO ADMIN (Run this after logging in)
-- UPDATE profiles SET role = 'admin' WHERE email = 'varunrathodv@gmail.com';
