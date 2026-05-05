import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Filter, SlidersHorizontal, X } from 'lucide-react';
import { useSupabaseProducts, useSupabaseCategories } from '../hooks/useSupabaseData';
import { useAppContext } from '../context/AppContext';
import { Product } from '../types';
import { formatINR } from '../lib/utils';
import ProductCard from '../components/ProductCard';

export default function Shop() {
  const { products, loading: productsLoading } = useSupabaseProducts();
  const { categories } = useSupabaseCategories();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('featured');
  const [showFilters, setShowFilters] = useState(false);

  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    if (selectedCategory !== 'all') {
      result = result.filter(p => p.categoryId === selectedCategory);
    }
    
    if (sortBy === 'price-low') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-high') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === 'newest') {
      result.sort((a, b) => (b.isNewArrival ? 1 : -1));
    }
    
    return result;
  }, [products, selectedCategory, sortBy]);

  return (
    <div className="pt-24 md:pt-32 pb-12 md:pb-24 min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <header className="mb-10 md:mb-16 border-b border-zinc-100 pb-8 md:pb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="max-w-2xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-px bg-black"></div>
                <span className="text-[10px] uppercase tracking-[0.4em] font-bold">Catalogue</span>
              </div>
              <h1 className="text-4xl md:text-8xl font-serif tracking-tight mb-4 text-black">Shop All</h1>
              <p className="text-zinc-500 font-light text-base md:text-lg leading-relaxed">
                Explore our curated collection of premium essentials, crafted for those who appreciate the intersection of minimalism and quality.
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-6 py-3 border border-zinc-200 hover:border-black transition-colors uppercase text-[10px] tracking-widest font-bold"
              >
                {showFilters ? <X size={14} /> : <SlidersHorizontal size={14} />}
                {showFilters ? 'Close' : 'Filter & Sort'}
              </button>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-12"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-zinc-50 p-8 border border-zinc-100">
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold mb-6 text-zinc-400">Categories</h3>
                  <div className="flex flex-wrap gap-3">
                    <button 
                      onClick={() => setSelectedCategory('all')}
                      className={`px-5 py-2 text-[11px] uppercase tracking-wider transition-all border ${selectedCategory === 'all' ? 'bg-black text-white border-black' : 'bg-white border-zinc-200 hover:border-black'}`}
                    >
                      All Collections
                    </button>
                    {categories.map((cat) => (
                      <button 
                        key={`shop-filter-btn-${cat.id}`}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-5 py-2 text-[11px] uppercase tracking-wider transition-all border ${selectedCategory === cat.id ? 'bg-black text-white border-black' : 'bg-white border-zinc-200 hover:border-black'}`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest font-bold mb-6 text-zinc-400">Sort By</h3>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { id: 'featured', label: 'Featured' },
                      { id: 'newest', label: 'Newest' },
                      { id: 'price-low', label: 'Price: Low to High' },
                      { id: 'price-high', label: 'Price: High to Low' }
                    ].map((option) => (
                      <button 
                        key={option.id}
                        onClick={() => setSortBy(option.id)}
                        className={`px-5 py-2 text-[11px] uppercase tracking-wider transition-all border ${sortBy === option.id ? 'bg-black text-white border-black' : 'bg-white border-zinc-200 hover:border-black'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {productsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-10 md:gap-y-16">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={`shop-sk-${i}`} className="animate-pulse">
                <div className="aspect-[3/4] bg-zinc-100 mb-6"></div>
                <div className="h-4 bg-zinc-100 w-3/4 mb-2"></div>
                <div className="h-4 bg-zinc-100 w-1/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-10 md:gap-y-16">
             {filteredProducts.map((product) => (
               <ProductCard key={`shop-prod-${product.id}`} product={product} />
             ))}
          </div>
        )}
        
        {!productsLoading && filteredProducts.length === 0 && (
          <div className="py-32 text-center">
            <p className="text-zinc-400 uppercase tracking-widest text-sm">No products found in this selection.</p>
            <button onClick={() => setSelectedCategory('all')} className="mt-4 text-black underline underline-offset-4 uppercase text-[10px] tracking-widest font-bold">Clear Filters</button>
          </div>
        )}
      </div>
    </div>
  );
}
