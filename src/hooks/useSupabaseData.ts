import { useState, useEffect, useCallback } from 'react';
import { supabase, withTimeout, FALLBACK_IMAGE } from '../lib/supabase';
import { Product, Category } from '../types';
import { CategoryTable, ProductTable } from '../supabase-types';

export function useSupabaseCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (categories.length === 0) {
      setLoading(true);
    }
    setError(null);
    
    const fetchTimeout = setTimeout(() => {
      setLoading(currentLoading => {
        if (currentLoading) {
          console.warn("[useSupabaseCategories] Fetch timeout reached (15s). Forcing loading to false.");
          return false;
        }
        return currentLoading;
      });
    }, 15000);

    try {
      console.log("Fetching categories from Supabase...");
      const { data, error: sbError } = await withTimeout(supabase
        .from('categories')
        .select('*')
        .order('name'), 12000, { data: categories.length > 0 ? null : [], error: null } as any) as any;
      
      if (sbError) {
        console.error("Supabase categories query failed:", sbError);
        // Don't throw if we have some categories already
        if (categories.length === 0) throw sbError;
        return;
      }
      
      console.log(`Successfully fetched ${data?.length || 0} categories`);
      
      if (data && data.length > 0) {
        const mappedCategories = data.map((cat: CategoryTable) => {
          let imageUrl = cat.image_url || '';
          if (imageUrl && !imageUrl.startsWith('http')) {
            console.log(`[useSupabaseCategories] Constructing URL for relative path: ${imageUrl}`);
            imageUrl = supabase.storage.from('products').getPublicUrl(imageUrl).data.publicUrl;
          }
          if (!imageUrl) {
            console.warn(`[useSupabaseCategories] Category ${cat.name} missing image, using fallback.`);
            imageUrl = FALLBACK_IMAGE;
          }
          return {
            id: cat.id,
            name: cat.name || 'Uncategorized',
            image: imageUrl
          };
        }) as Category[];
        
        setCategories(mappedCategories);
      }
    } catch (err: any) {
      console.error("Critical error in useSupabaseCategories:", err);
      const message = err?.message || err?.error?.message || err?.error || String(err);
      setError(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
      clearTimeout(fetchTimeout);
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
  const [loading, setLoading] = useState(() => {
    // Start with loading true only if no cache to show skeletons once, then favor speed
    return !sessionStorage.getItem('cached_products');
  });
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    // Only show loading skeletons if we have no products yet
    if (products.length === 0) {
      setLoading(true);
    }
    setError(null);
    console.log(`[useSupabaseProducts] Fetching... limit: ${limit}, page: ${page}`);
    
    const fetchTimeout = setTimeout(() => {
      // Use the functional update to check if still loading
      setLoading(currentLoading => {
        if (currentLoading) {
          console.warn("[useSupabaseProducts] Fetch timeout reached (15s). Forcing loading to false.");
          return false;
        }
        return currentLoading;
      });
    }, 15000);

    const processProducts = (data: any[]) => {
      if (!data || data.length === 0) {
        console.warn("[useSupabaseProducts] Zero products returned from DB.");
        if (products.length <= 3) {
           setProducts(DEMO_PRODUCTS);
        }
        return;
      }

      try {
        const mappedProducts = data.map((p: any) => {
          let imageUrls: string[] = [];
          
          const rawImages = p.image_url || p.image || p.imageUrl || p.images;
          
          if (Array.isArray(rawImages)) {
            imageUrls = rawImages.filter(Boolean);
          } else if (typeof rawImages === 'string' && rawImages) {
            imageUrls = [rawImages];
          }

          // Transform relative paths to full Supabase URLs
          const transformedImages = imageUrls.map(url => {
            if (url && !url.startsWith('http')) {
              // If it's just a filename, assume it's in 'products' bucket
              console.log(`[useSupabaseProducts] Constructing URL for relative path: ${url}`);
              return supabase.storage.from('products').getPublicUrl(url).data.publicUrl;
            }
            if (!url) {
               console.warn(`[useSupabaseProducts] Product ${p.name} has an empty image slot.`);
               return FALLBACK_IMAGE;
            }
            return url;
          });

          if (transformedImages.length === 0) {
            console.warn(`[useSupabaseProducts] Product ${p.name} has no images, using fallback.`);
            transformedImages.push(FALLBACK_IMAGE);
          }

          const catId = p.category_id || p.categoryId || p.category || 'all';
          const active = p.is_active ?? p.isActive ?? p.active ?? true;
          const trending = p.is_trending ?? p.isTrending ?? p.trending ?? false;
          const newArr = p.is_new_arrival ?? p.isNewArrival ?? p.newArrival ?? true;

          return {
            id: p.id,
            name: p.name || 'Untitled Product',
            price: Number(p.price) || 0,
            categoryId: catId,
            images: transformedImages,
            description: p.description || '',
            stock: p.stock_quantity || p.stock || 0,
            sizes: Array.from(new Set((Array.isArray(p.sizes) ? p.sizes : (typeof p.sizes === 'string' ? p.sizes.split(',').map((s:string)=>s.trim()) : ['S', 'M', 'L', 'XL'])).filter(Boolean))),
            isTrending: trending,
            isNewArrival: newArr,
            isActive: active,
            productCode: p.product_code || p.productCode || p.sku || ''
          };
        });
        
        // Deduplicate products based on ID
        const uniqueProductsMap = new Map();
        mappedProducts.forEach(p => {
          if (!uniqueProductsMap.has(p.id)) {
            uniqueProductsMap.set(p.id, p);
          }
        });
        const uniqueProducts = Array.from(uniqueProductsMap.values());
        
        console.log(`[useSupabaseProducts] Successfully mapped ${uniqueProducts.length} items.`);
        setProducts(uniqueProducts);
        sessionStorage.setItem('cached_products', JSON.stringify(uniqueProducts));
      } catch (mapErr) {
        console.error("[useSupabaseProducts] Mapping failed:", mapErr);
      }
    };

      try {
        // Logic for range
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        
        // Step 1: Optimized query with larger timeout
        const { data, error: sbError } = await withTimeout(supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false })
          .range(from, to), 12000, { data: products.length > 0 ? null : [], error: null } as any) as any;
        
        if (sbError) {
          console.warn("[useSupabaseProducts] Main query failed, trying minimal select...", sbError.message);
          const { data: minData, error: minError } = await withTimeout(supabase.from('products').select('*').limit(limit), 8000, { data: products.length > 0 ? null : [], error: null } as any) as any;
          if (minError) {
            // If we have some products, don't crash the UI with error
            if (products.length > 0) return;
            throw minError;
          }
          if (minData) processProducts(minData);
        } else if (data) {
          processProducts(data);
        }
      } catch (err: any) {
      console.error("[useSupabaseProducts] Fetch error:", err);
      // Only set error if we have literally no products (not even demo ones)
      if (products.length === 0) {
        setError(`Data Fetch Error: ${err.message || 'Unknown issue'}`);
      }
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
