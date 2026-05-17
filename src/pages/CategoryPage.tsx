import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X } from 'lucide-react';
import { useSupabaseProducts, useSupabaseCategories } from '../hooks/useSupabaseData';
import { useAppContext } from '../context/AppContext';
import { formatINR } from '../lib/utils';
import { Product } from '../types';
import { FALLBACK_IMAGE } from '../lib/supabase';
import DataErrorState from '../components/DataErrorState';
import ProductCard from '../components/ProductCard';

export default function CategoryPage() {
  const { id } = useParams<{ id: string }>();
  const { products, loading: productsLoading, error: productsError, refetch: refetchProducts } = useSupabaseProducts();
  const { categories, loading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useSupabaseCategories();
  const { addToBag, toggleWishlist, isInWishlist } = useAppContext();
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('M');

  const category = categories.find(c => c.id === id);
  const categoryProducts = products.filter(p => p.categoryId === id);

  // Log errors but don't block rendering if possible
  if ((categoriesError || productsError) && categories.length === 0 && products.length === 0) {
    return (
      <div className="min-h-screen pt-32 pb-24 flex items-center justify-center">
         <DataErrorState message={categoriesError || productsError || "An error occurred"} onRetry={() => {
           refetchCategories();
           refetchProducts();
         }} />
      </div>
    );
  }

  if (categoriesLoading || productsLoading) {
    return <div className="min-h-screen pt-32 pb-24 flex items-center justify-center font-serif text-2xl text-zinc-400">Loading...</div>;
  }

  if (!category) {
    return <div className="min-h-screen pt-32 pb-24 flex items-center justify-center font-serif text-2xl text-zinc-400">Category not found</div>;
  }

  return (
    <div className="min-h-screen pt-24 md:pt-32 pb-12 md:pb-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="flex items-center gap-4 md:gap-8 mb-10 md:mb-16">
          <span className="flex-1 h-px bg-zinc-200"></span>
          <h1 className="text-xl md:text-5xl font-serif text-center uppercase tracking-[0.2em] md:tracking-widest">{category.name}</h1>
          <span className="flex-1 h-px bg-zinc-200"></span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {categoryProducts.length === 0 ? (
             <div className="col-span-full py-12 text-center text-zinc-500 text-sm font-semibold">No products found in this category.</div>
          ) : (
            categoryProducts.map((item, idx) => (
              <ProductCard key={`cat-prod-${item.id}-${idx}`} product={item} />
            ))
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[110] backdrop-blur-md"
              onClick={() => setSelectedProduct(null)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed inset-4 md:inset-20 z-[111] bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="absolute top-6 right-6 z-10 w-10 h-10 bg-white/80 backdrop-blur flex items-center justify-center rounded-full"
              >
                <X size={20} />
              </button>

              <div className="flex-1 bg-brand-sand overflow-y-auto">
                 {selectedProduct.images.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 h-full content-start">
                        {selectedProduct.images.map((img, idx) => (
                           <div key={`cat-modal-img-${selectedProduct.id}-${idx}`} className={idx === 0 ? "col-span-1 md:col-span-2 aspect-[4/5]" : "aspect-[3/4]"}>
                              <img 
                                src={img || FALLBACK_IMAGE} 
                                alt={`${selectedProduct.name} ${idx + 1}`} 
                                onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                                className="w-full h-full object-cover" 
                              />
                           </div>
                        ))}
                    </div>
                 ) : (
                     <div className="h-full w-full flex items-center justify-center bg-zinc-100">
                        <span className="text-sm font-semibold text-zinc-400">No images</span>
                    </div>
                 )}
              </div>

              <div className="flex-1 p-8 md:p-16 flex flex-col justify-center overflow-y-auto">
                <span className="text-[10px] uppercase tracking-[0.4em] text-zinc-400 mb-4 inline-block">
                    {category.name}
                </span>
                <h2 className="text-4xl md:text-5xl font-serif mb-6">{selectedProduct.name}</h2>
                <p className="text-2xl font-serif text-zinc-400 mb-8">{formatINR(selectedProduct.price)}</p>
                <div className="text-zinc-600 mb-12 leading-relaxed whitespace-pre-wrap">
                  {selectedProduct.description}
                </div>

                <div className="mb-12">
                  <span className="text-[10px] uppercase tracking-widest font-bold mb-4 block">Select Size</span>
                  <div className="flex flex-wrap gap-4">
                    {(selectedProduct.sizes && selectedProduct.sizes.length > 0 ? selectedProduct.sizes : ['S', 'M', 'L', 'XL']).map((s, i) => (
                      <button 
                        key={`cat-size-opt-${selectedProduct.id}-${s}-${i}`} 
                        onClick={() => setSelectedSize(s)}
                        className={`w-12 h-12 border flex items-center justify-center text-xs transition-colors ${selectedSize === s ? 'border-black bg-black text-white' : 'border-zinc-200 hover:border-black'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <button className="flex-1 btn-primary py-6" onClick={() => {
                        addToBag(selectedProduct, selectedSize);
                        setSelectedProduct(null);
                  }}>Add to Bag</button>
                  <button 
                    onClick={() => toggleWishlist(selectedProduct)}
                    className={`w-16 h-16 border shrink-0 flex items-center justify-center transition-colors ${isInWishlist(selectedProduct.id) ? 'bg-black border-black text-white' : 'border-zinc-200 hover:border-black'}`}
                  >
                    <Heart size={20} fill={isInWishlist(selectedProduct.id) ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
