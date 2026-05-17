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
      <div className="aspect-[3/4] bg-zinc-100 mb-1 overflow-hidden relative shadow-sm group-hover:shadow-2xl transition-all duration-700">
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
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
          {product.isNewArrival && (
            <div className="bg-white px-1.5 py-0.5 text-[7px] uppercase tracking-widest font-bold">New</div>
          )}
          {product.productCode && (
            <div className="bg-black/80 text-white px-1.5 py-0.5 text-[7px] uppercase tracking-widest font-bold">{product.productCode}</div>
          )}
        </div>

        {/* Wishlist Button */}
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleWishlist(product);
          }}
          className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all bg-white/80 backdrop-blur shadow-sm border border-zinc-100 opacity-100 md:opacity-0 md:group-hover:opacity-100 ${isInWishlist(product.id) ? 'text-black' : 'text-zinc-400 hover:text-black'}`}
        >
          <Heart size={14} fill={isInWishlist(product.id) ? "currentColor" : "none"} strokeWidth={1.5} />
        </button>
      </div>

      {/* Quick Actions (Size Chooser) - Visible on mobile below image */}
      <div className="px-2 pt-1 pb-1 md:absolute md:inset-x-0 md:bottom-16 md:p-4 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-500 z-20">
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
                className="w-full bg-black text-white md:bg-white md:text-black text-[9px] md:text-[10px] uppercase font-bold tracking-[0.2em] h-8 md:py-3.5 md:h-auto transition-all hover:bg-zinc-800 md:hover:bg-black md:hover:text-white flex items-center justify-center"
              >
                Quick Add
              </motion.button>
           ) : (
              <motion.div 
                key="size-selector"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="bg-white border border-zinc-200 p-2 flex flex-col gap-2"
              >
                <div className="flex justify-between items-center px-0.5">
                   <span className="text-[7px] uppercase tracking-widest font-bold text-zinc-400">Size</span>
                   <button onClick={(e) => { e.preventDefault(); setShowSizes(false);}} className="text-zinc-400 hover:text-black">
                     <X size={10} />
                   </button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {product.sizes.map((s) => (
                    <button 
                      key={`quick-size-${s}`}
                      onClick={(e) => {
                        e.preventDefault();
                        addToBag(product, s);
                        setShowSizes(false);
                      }}
                      className="flex-1 min-w-[24px] h-6 border border-zinc-200 text-[9px] flex items-center justify-center hover:bg-black hover:text-white transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
           )}
         </AnimatePresence>
      </div>
      
      <div className="flex flex-col gap-0 items-start px-2 md:px-0">
        <h3 className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-bold text-zinc-900 group-hover:text-black transition-colors">{product.name}</h3>
        <p className="text-zinc-500 text-[11px] font-sans font-medium tracking-tight opacity-70">{formatINR(product.price)}</p>
      </div>
    </motion.div>
  );
});

export default ProductCard;
