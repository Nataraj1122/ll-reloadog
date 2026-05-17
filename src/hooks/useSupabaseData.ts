import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Category } from '../types';
import { CategoryTable, ProductTable } from '../supabase-types';

export function useSupabaseCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching categories from Supabase...");
      const { data, error: sbError } = await supabase
        .from('categories')
        .select('*')
        .order('name') as { data: CategoryTable[] | null, error: any };
      
      if (sbError) {
        console.error("Supabase categories query failed:", sbError);
        throw sbError;
      }
      
      console.log(`Successfully fetched ${data?.length || 0} categories`);
      
      if (!data || data.length === 0) {
        console.warn("No categories found in the database table 'categories'");
        setCategories([]);
        return;
      }
      
      const mappedCategories = Array.from(new Map(data.map((cat: CategoryTable) => [cat.id, {
        id: cat.id,
        name: cat.name || 'Uncategorized',
        image: cat.image_url || ''
      }])).values());
      
      setCategories(mappedCategories);
    } catch (err: any) {
      console.error("Critical error in useSupabaseCategories:", err);
      const message = err?.message || err?.error?.message || err?.error || String(err);
      setError(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();

    const authListener = supabase.auth.onAuthStateChange(() => {
       fetchCategories();
    });

    // Set up real-time listener
    const channel = supabase
      .channel('public:categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchCategories();
      })
      .subscribe();

    return () => {
      authListener.data.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [fetchCategories]);

  return { categories, loading, error, refetch: fetchCategories };
}

const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo-1',
    name: 'Essential White Tee',
    price: 2490,
    categoryId: 't-shirts',
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=2080&auto=format&fit=crop'],
    description: 'A premium heavy-weight cotton t-shirt designed for daily wear.',
    stock: 50,
    sizes: ['S', 'M', 'L', 'XL'],
    isTrending: true,
    isNewArrival: true,
    isActive: true,
    productCode: 'RL-TS-01'
  },
  {
    id: 'demo-2',
    name: 'Oversized Linen Shirt',
    price: 4990,
    categoryId: 'shirts',
    images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=2176&auto=format&fit=crop'],
    description: 'Breathable linen shirt with a modern relaxed silhouette.',
    stock: 30,
    sizes: ['M', 'L', 'XL'],
    isTrending: true,
    isNewArrival: true,
    isActive: true,
    productCode: 'RL-SH-02'
  },
  {
    id: 'demo-3',
    name: 'Raw Denim Jeans',
    price: 7990,
    categoryId: 'bottoms',
    images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?q=80&w=2176&auto=format&fit=crop'],
    description: 'Japanese selvedge denim that ages beautifully with time.',
    stock: 20,
    sizes: ['30', '32', '34'],
    isTrending: true,
    isNewArrival: false,
    isActive: true,
    productCode: 'RL-BT-03'
  }
];

export function useSupabaseProducts(limit = 20, page = 1) {
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const cached = sessionStorage.getItem('cached_products');
      return cached ? JSON.parse(cached) : DEMO_PRODUCTS;
    } catch (e) {
      return DEMO_PRODUCTS;
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log(`[useSupabaseProducts] Fetching... limit: ${limit}, page: ${page}`);
    
    const fetchTimeout = setTimeout(() => {
      if (loading) {
        console.warn("[useSupabaseProducts] Fetch is taking > 15s. Check network or Supabase status.");
      }
    }, 15000);

    const processProducts = (data: any[]) => {
      if (!data || data.length === 0) {
        console.warn("[useSupabaseProducts] Zero products returned from DB.");
        if (products.length <= 3) { // If we only have demo data
           setProducts(DEMO_PRODUCTS);
        }
        return;
      }

      try {
        const mappedProducts = data.map((p: any) => {
          const imageUrl = p.image_url || p.image || p.imageUrl || (p.images && p.images[0]) || '';
          const catId = p.category_id || p.categoryId || p.category || 'all';
          const active = p.is_active ?? p.isActive ?? p.active ?? true;
          const trending = p.is_trending ?? p.isTrending ?? p.trending ?? false;
          const newArr = p.is_new_arrival ?? p.isNewArrival ?? p.newArrival ?? true;

          return {
            id: p.id,
            name: p.name || 'Untitled Product',
            price: Number(p.price) || 0,
            categoryId: catId,
            images: Array.isArray(imageUrl) ? imageUrl : [imageUrl].filter(Boolean),
            description: p.description || '',
            stock: p.stock_quantity || p.stock || 0,
            sizes: Array.isArray(p.sizes) ? p.sizes : (typeof p.sizes === 'string' ? p.sizes.split(',').map((s:string)=>s.trim()) : ['S', 'M', 'L', 'XL']),
            isTrending: trending,
            isNewArrival: newArr,
            isActive: active,
            productCode: p.product_code || p.productCode || p.sku || ''
          };
        });
        
        console.log(`[useSupabaseProducts] Successfully mapped ${mappedProducts.length} items.`);
        setProducts(mappedProducts);
        sessionStorage.setItem('cached_products', JSON.stringify(mappedProducts));
      } catch (mapErr) {
        console.error("[useSupabaseProducts] Mapping failed:", mapErr);
      }
    };

    try {
      // Logic for range
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      // Step 1: Optimized query
      const { data, error: sbError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (sbError) {
        console.warn("[useSupabaseProducts] Main query failed, trying minimal select...", sbError.message);
        const { data: minData, error: minError } = await supabase.from('products').select('*').limit(limit);
        if (minError) throw minError;
        if (minData) processProducts(minData);
      } else if (data) {
        processProducts(data);
      }
    } catch (err: any) {
      console.error("[useSupabaseProducts] Fetch error:", err);
      setError(`Storage Error: ${err.message || 'Unknown issue'}`);
      // Fallback is already in state
    } finally {
      clearTimeout(fetchTimeout);
      setLoading(false);
    }
  }, [limit, page]);

  useEffect(() => {
    fetchProducts();

    // Set up real-time listener
    const channel = supabase
      .channel('public:products')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
}
