import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, ShoppingBag, Trash2, X, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { formatINR } from '../lib/utils';
import { WishlistItem, Product } from '../types';

export default function Wishlist() {
  const { wishlistItems, toggleWishlist, addToBag } = useAppContext();

  const handleRemove = (item: WishlistItem) => {
    // We create a partial product object that satisfies what toggleWishlist needs to find and remove
    toggleWishlist({ id: item.id } as Product);
  };

  const handleAddToCart = (item: WishlistItem) => {
    // Defaulting to size M as it's a quick add
    addToBag({ 
      id: item.id, 
      name: item.name, 
      price: item.price, 
      images: [item.image] 
    } as Product, 'M');
  };

  return (
    <div className="pt-32 pb-24 min-h-[80vh] bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <header className="mb-20 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-12 h-px bg-zinc-900"></div>
            <span className="text-[10px] uppercase tracking-[0.4em] font-semibold">Curation</span>
            <div className="w-12 h-px bg-zinc-900"></div>
          </div>
          <h1 className="text-5xl md:text-8xl font-serif tracking-tight mb-4">Wishlist</h1>
          <p className="text-zinc-400 text-sm uppercase tracking-widest">{wishlistItems.length} items saved</p>
        </header>

        {wishlistItems.length === 0 ? (
          <div className="py-24 text-center border-t border-zinc-100">
            <div className="relative inline-block mb-8">
              <Heart size={64} className="text-zinc-100 stroke-1" />
              <Plus size={20} className="absolute -bottom-1 -right-1 text-zinc-300" />
            </div>
            <p className="text-zinc-500 mb-10 max-w-sm mx-auto font-light leading-relaxed">
              Your wishlist is currently empty. Discover our collection and save those essential pieces you've been eyeing.
            </p>
            <Link to="/" className="btn-primary inline-block px-12 py-5">Discover Collection</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-16">
            <AnimatePresence mode='popLayout'>
              {wishlistItems.map((item) => (
                <motion.div 
                  layout
                  key={`wishlist-item-${item.id}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                  className="group relative"
                >
                  <div className="aspect-[3/4] bg-zinc-100 mb-6 relative overflow-hidden group">
                    <img 
                      src={item.image} 
                      alt={item.name} 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                    
                    {/* Hover Actions Overlay */}
                    <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    
                    <button 
                      onClick={() => handleRemove(item)}
                      className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-md flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-white shadow-sm"
                      title="Remove from wishlist"
                    >
                      <X size={18} className="text-zinc-400 hover:text-black transition-colors" />
                    </button>

                    <div className="absolute inset-x-4 bottom-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                      <button 
                        onClick={() => handleAddToCart(item)}
                        className="w-full bg-black text-white text-[10px] uppercase font-bold tracking-[0.2em] py-4 hover:bg-zinc-800 transition-colors shadow-xl"
                      >
                        Add to Bag
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <h3 className="text-[11px] uppercase tracking-widest font-bold">{item.name}</h3>
                    <p className="text-zinc-500 text-sm font-serif italic opacity-70">{formatINR(item.price)}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
