-- 1. Create Tables

CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  image_url TEXT,
  description TEXT,
  stock_quantity INT DEFAULT 0,
  sizes TEXT[] DEFAULT ARRAY['S', 'M', 'L', 'XL'],
  is_trending BOOLEAN DEFAULT FALSE,
  is_new_arrival BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar TEXT,
  role VARCHAR(50) DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cart (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cart_item_id VARCHAR(255) NOT NULL,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  image_url TEXT,
  size VARCHAR(50) NOT NULL,
  quantity INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, cart_item_id)
);

CREATE TABLE IF NOT EXISTS wishlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  order_number VARCHAR(50),
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50),
  shipping_address TEXT NOT NULL,
  zip_code VARCHAR(50),
  payment_method VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'Pending',
  total_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  quantity INT NOT NULL,
  size VARCHAR(50),
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  order_number VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(50),
  total_amount DECIMAL(10, 2) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  type VARCHAR(50) DEFAULT 'new_order',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies
DO $$
BEGIN
  DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
  DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
  
  DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  
  DROP POLICY IF EXISTS "Users can view own cart" ON cart;
  DROP POLICY IF EXISTS "Users can insert into own cart" ON cart;
  DROP POLICY IF EXISTS "Users can update own cart" ON cart;
  DROP POLICY IF EXISTS "Users can delete from own cart" ON cart;

  DROP POLICY IF EXISTS "Users can view own wishlist" ON wishlist;
  DROP POLICY IF EXISTS "Users can insert own wishlist" ON wishlist;
  DROP POLICY IF EXISTS "Users can delete own wishlist" ON wishlist;

  DROP POLICY IF EXISTS "Users can view own orders" ON orders;
  DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
  DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
  DROP POLICY IF EXISTS "Users can insert own order items" ON order_items;

  DROP POLICY IF EXISTS "Admins have full access to profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins have full access to categories" ON categories;
  DROP POLICY IF EXISTS "Admins have full access to products" ON products;
  DROP POLICY IF EXISTS "Admins have full access to orders" ON orders;
  DROP POLICY IF EXISTS "Admins have full access to order_items" ON order_items;
  DROP POLICY IF EXISTS "Admins have full access to notifications" ON notifications;
  DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
END $$;

-- 4. Re-create RLS Policies
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);
CREATE POLICY "Products are viewable by everyone" ON products FOR SELECT USING (true);

CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own cart" ON cart FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert into own cart" ON cart FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cart" ON cart FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete from own cart" ON cart FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own wishlist" ON wishlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own wishlist" ON wishlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own wishlist" ON wishlist FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Users can insert own order items" ON order_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);

-- 5. Admin unrestricted access
CREATE POLICY "Admins have full access to profiles" ON profiles FOR ALL USING (auth.jwt()->>'email' = 'varunrathodv@gmail.com');
CREATE POLICY "Admins have full access to categories" ON categories FOR ALL USING (auth.jwt()->>'email' = 'varunrathodv@gmail.com');
CREATE POLICY "Admins have full access to products" ON products FOR ALL USING (auth.jwt()->>'email' = 'varunrathodv@gmail.com');
CREATE POLICY "Admins have full access to orders" ON orders FOR ALL USING (auth.jwt()->>'email' = 'varunrathodv@gmail.com');
CREATE POLICY "Admins have full access to order_items" ON order_items FOR ALL USING (auth.jwt()->>'email' = 'varunrathodv@gmail.com');
CREATE POLICY "Admins have full access to notifications" ON notifications FOR ALL USING (auth.jwt()->>'email' = 'varunrathodv@gmail.com');

CREATE POLICY "Users can insert notifications" ON notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

