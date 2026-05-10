import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Category } from '../types';

export function useSupabaseCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: sbError } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (sbError) throw sbError;
      
      if (data) {
        setCategories(Array.from(new Map(data.map(cat => [cat.id, {
          id: cat.id,
          name: cat.name,
          image: cat.image_url
        }])).values()));
      }
    } catch (err: any) {
      console.error("Error fetching Supabase data:", err);
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

export function useSupabaseProducts(limit = 20, page = 1) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;
      
      const { data, error: sbError } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);
      
      if (sbError) throw sbError;
      
      console.log('Products fetched:', data);
      
      if (data) {
        setProducts(Array.from(new Map(data.map(p => [p.id, {
          id: p.id,
          name: p.name || 'Untitled Product',
          price: p.price || 0,
          categoryId: p.category_id || p.category || 'all',
          images: p.image_url ? [p.image_url] : [],
          description: p.description || '',
          stock: p.stock_quantity || 0,
          sizes: p.sizes || ['S', 'M', 'L', 'XL'],
          isTrending: p.is_trending || false,
          isNewArrival: p.is_new_arrival ?? true
        }])).values()));
      }
    } catch (err: any) {
      console.error("Error fetching Supabase products:", err);
      const message = err?.message || err?.error?.message || err?.error || String(err);
      setError(typeof message === 'string' ? message : JSON.stringify(message));
    } finally {
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
