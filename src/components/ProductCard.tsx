import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X } from 'lucide-react';
import { formatINR } from '../lib/utils';
import { Product } from '../types';
import { useAppContext } from '../context/AppContext';
import { FALLBACK_IMAGE } from '../lib/supabase';

interface ProductCardProps {
  product: Product;
}

const ProductCard = React.memo(({ product }: ProductCardProps) => {
  const { toggleWishlist, isInWishlist, addToBag } = useAppContext();
  const [selectedSize, setSelectedSize] = useState('M');
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSizes, setShowSizes] = useState(false);

  const primaryImage = product.images && product.images.length > 0 && product.images[0] ? product.images[0] : FALLBACK_IMAGE;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="group relative"
    >
      <div className="aspect-[3/4] bg-zinc-100 mb-6 overflow-hidden relative shadow-sm group-hover:shadow-2xl transition-all duration-700">
        {!isLoaded && (
          <div className="absolute inset-0 bg-zinc-200 animate-pulse" />
        )}
        <motion.img 
          src={primaryImage} 
          alt={product.name} 
          loading="lazy"
          onLoad={() => setIsLoaded(true)}
          onError={(e) => {
             e.currentTarget.src = FALLBACK_IMAGE;
             setIsLoaded(true);
          }}
          className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {product.isNewArrival && (
            <div className="bg-white px-2 py-1 text-[8px] uppercase tracking-widest font-bold">New</div>
          )}
          {product.productCode && (
            <div className="bg-black/80 text-white px-2 py-1 text-[8px] uppercase tracking-widest font-bold">{product.productCode}</div>
          )}
        </div>

        {/* Wishlist Button */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white/80 backdrop-blur shadow-sm border border-zinc-100 opacity-100 md:opacity-0 md:group-hover:opacity-100 ${isInWishlist(product.id) ? 'text-black' : 'text-zinc-400 hover:text-black'}`}
        >
          <Heart size={16} fill={isInWishlist(product.id) ? "currentColor" : "none"} strokeWidth={1.5} />
        </button>
      </div>

      {/* Quick Actions (Size Chooser) - Visible on mobile below image */}
      <div className="p-4 md:absolute md:inset-x-0 md:bottom-16 md:p-4 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-500 z-20">
         <AnimatePresence mode="wait">
           {!showSizes ? (
              <motion.button 
                key="add-btn"
                onClick={(e) => {
                  e.preventDefault();
                  if (product.sizes && product.sizes.length > 1) {
                    setShowSizes(true);
                  } else {
                    addToBag(product, product.sizes[0] || 'M');
                  }
                }}
                className="w-full bg-black text-white md:bg-white md:text-black text-[10px] uppercase font-bold tracking-[0.2em] py-3.5 transition-all hover:bg-zinc-800 md:hover:bg-black md:hover:text-white"
              >
                Quick Add
              </motion.button>
           ) : (
              <motion.div 
                key="size-selector"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-white border border-zinc-100 p-3 flex flex-col gap-3"
              >
                <div className="flex justify-between items-center px-1">
                   <span className="text-[8px] uppercase tracking-widest font-bold text-zinc-400">Select Size</span>
                   <button onClick={(e) => { e.preventDefault(); setShowSizes(false);}} className="text-zinc-400 hover:text-black">
                     <X size={12} />
                   </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map((s) => (
                    <button 
                      key={`quick-size-${s}`}
                      onClick={(e) => {
                        e.preventDefault();
                        addToBag(product, s);
                        setShowSizes(false);
                      }}
                      className="flex-1 min-w-[30px] h-8 border border-zinc-100 text-[10px] flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
           )}
         </AnimatePresence>
      </div>
      
      <div className="flex flex-col gap-1 items-start px-4 md:px-0">
        <h3 className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-bold text-zinc-900 group-hover:text-black transition-colors">{product.name}</h3>
        <p className="text-zinc-500 text-[13px] font-sans font-medium tracking-tight opacity-70">{formatINR(product.price)}</p>
      </div>
    </motion.div>
  );
});

export default ProductCard;
