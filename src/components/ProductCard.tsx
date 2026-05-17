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

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
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
          className={`absolute top-4 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all bg-white/80 backdrop-blur shadow-sm border border-zinc-100 opacity-0 group-hover:opacity-100 ${isInWishlist(product.id) ? 'text-black opacity-100' : 'text-zinc-400 hover:text-black'}`}
        >
          <Heart size={16} fill={isInWishlist(product.id) ? "currentColor" : "none"} strokeWidth={1.5} />
        </button>

        {/* Quick Actions (Size Chooser) */}
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 z-20">
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
                  className="w-full bg-white text-black text-[9px] uppercase font-bold tracking-[0.2em] py-3.5 transition-all hover:bg-black hover:text-white"
                >
                  Quick Add
                </motion.button>
             ) : (
                <motion.div 
                  key="size-selector"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-white p-3 flex flex-col gap-3"
                >
                  <div className="flex justify-between items-center px-1">
                     <span className="text-[8px] uppercase tracking-widest font-bold text-zinc-400">Select Size</span>
                     <button onClick={() => setShowSizes(false)} className="text-zinc-400 hover:text-black">
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
      </div>
      
      <div className="flex flex-col gap-1 items-start">
        <h3 className="text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-bold text-zinc-900 group-hover:text-black transition-colors">{product.name}</h3>
        <p className="text-zinc-500 text-[13px] font-sans font-medium tracking-tight opacity-70">{formatINR(product.price)}</p>
      </div>
    </motion.div>
  );
};

export default ProductCard;
