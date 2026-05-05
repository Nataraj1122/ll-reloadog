import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Product, Category } from '../types';

export function useSupabaseCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .order('name');
        
        if (error) throw error;
        
        setCategories(Array.from(new Map(data.map(cat => [cat.id, {
          id: cat.id,
          name: cat.name,
          image: cat.image_url
        }])).values()));
      } catch (error) {
        console.error("Error fetching Supabase categories:", error);
      } finally {
        setLoading(false);
      }
    }
    
    fetchCategories();

    // Set up real-time listener
    const channel = supabase
      .channel('public:categories')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => {
        fetchCategories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { categories, loading };
}

export function useSupabaseProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
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
      } catch (error) {
        console.error("Error fetching Supabase products:", error);
      } finally {
        setLoading(false);
      }
    }
    
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
  }, []);

  return { products, loading };
}
