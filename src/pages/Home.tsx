import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Heart, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useSupabaseCategories, useSupabaseProducts } from '../hooks/useSupabaseData';
import { useAppContext } from '../context/AppContext';
import { formatINR } from '../lib/utils';
import { Product } from '../types';
import { FALLBACK_IMAGE } from '../lib/supabase';
import { ProductSkeleton, CategorySkeleton } from '../components/Skeleton';
import ProductCard from '../components/ProductCard';
import DataErrorState from '../components/DataErrorState';

const IMAGES = {
  hero: "https://i.pinimg.com/736x/6e/86/7e/6e867e71afaacb7e72c3749aff2651fb.jpg",
  autumn: "https://images.unsplash.com/photo-1516826435551-36a8a09e4544?q=80&w=2670&auto=format&fit=crop",
  dolenga: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?q=80&w=2574&auto=format&fit=crop",
  summer: "https://images.unsplash.com/photo-1490367532201-b9bc1dc483f6?q=80&w=2670&auto=format&fit=crop"
};

export default function Home() {
  const { categories, loading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useSupabaseCategories();
  const { products, loading: productsLoading, error: productsError, refetch: refetchProducts } = useSupabaseProducts(20);
  const { addToBag, toggleWishlist, isInWishlist } = useAppContext();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const heroImg = IMAGES.hero;

  useEffect(() => {
    const img = new Image();
    img.src = IMAGES.hero;
  }, []);

  useEffect(() => {
    if (hash) {
      const element = document.getElementById(hash.replace('#', ''));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, [hash]);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('M');

  const trendingProducts = products.filter(p => p.isTrending);
  const newArrivals = products.filter(p => p.isNewArrival);

  const trendingRef = useRef<HTMLDivElement>(null);

  const scrollTrending = (direction: 'left' | 'right') => {
    if (trendingRef.current) {
      const scrollAmount = window.innerWidth * 0.8;
      trendingRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="bg-brand-bone overflow-x-hidden">
      {/* Hero Section - Premium Luxury */}
      <section className="relative h-[100dvh] w-full bg-[#111] overflow-hidden flex items-center justify-center">
        <motion.div 
          style={{ scale: 1.1 }}
          className="absolute inset-0 w-full h-full"
        >
          <img 
            src={heroImg} 
            alt="Reload Premium Menswear"
            className="w-full h-full object-cover object-center contrast-[1.05] brightness-[1.05]"
          />
          {/* Subtle gradient overlay to keep it soft */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"></div>
        </motion.div>

        {/* HERO CONTENT */}
        <div className="relative z-10 flex flex-col items-center justify-end pb-24 h-full text-center px-6 w-full">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="flex flex-col items-center justify-center w-full max-w-3xl"
          >
            <p className="text-white text-sm md:text-lg uppercase tracking-[0.4em] mb-6 font-light">
              PREMIUM MENSWEAR
            </p>
            
            <button 
              onClick={() => document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-8 py-3 bg-white/10 backdrop-blur-sm text-white font-medium uppercase text-[10px] tracking-[0.3em] hover:bg-white hover:text-black border border-white/40 transition-all duration-500"
            >
              SHOP NOW
            </button>
          </motion.div>
        </div>

        {/* Subtle Fade-in on load */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2 }}
          className="absolute inset-0 bg-black/20 pointer-events-none"
        ></motion.div>
      </section>

      {/* Categories - Refined Round */}
      <section id="categories" className="py-8 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center text-center mb-6 md:mb-12">
             <h2 className="text-[10px] md:text-sm font-sans uppercase tracking-[0.4em] font-bold text-zinc-400 mb-2 md:mb-4">Curated Selections</h2>
             <div className="w-8 md:w-12 h-px bg-zinc-200"></div>
          </div>
          
          <div className="flex overflow-x-auto md:grid md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-12 pb-2 scrollbar-none snap-x snap-mandatory">
            {categoriesError ? (
              <div className="col-span-full">
                <DataErrorState message={categoriesError} onRetry={refetchCategories} />
              </div>
            ) : categoriesLoading ? (
               Array.from({ length: 6 }).map((_, i) => <CategorySkeleton key={`home-cat-sk-${i}`} />)
            ) : (
                categories.map((category, idx) => (
                  <motion.div
                    key={`home-cat-item-${category.id}-${idx}`}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="flex-none w-28 md:w-auto snap-center"
                  >
                    <Link to={`/category/${category.id}`} className="group flex flex-col items-center">
                      <div className="aspect-square w-full rounded-full bg-brand-sand mb-3 md:mb-6 relative overflow-hidden border border-zinc-50 group-hover:shadow-xl transition-shadow duration-500">
                        <img 
                          src={category.image || FALLBACK_IMAGE} 
                          alt={category.name} 
                          onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                      </div>
                      <h4 className="text-[9px] md:text-[11px] uppercase tracking-[0.2em] font-bold text-zinc-500 group-hover:text-black transition-colors text-center">{category.name}</h4>
                    </Link>
                  </motion.div>
                ))
            )}
          </div>
        </div>
      </section>

      {/* Trending Section - Horizontal Carousel */}
      <section id="trending" className="pt-2 pb-0 md:py-16 overflow-hidden bg-brand-bone border-y border-zinc-50">
        <div className="max-w-7xl mx-auto px-6 mb-6 md:mb-12 flex justify-between items-end">
          <div>
            <h2 className="text-xl md:text-5xl font-serif text-zinc-900 mb-1 md:mb-4 uppercase tracking-tight">Trending</h2>
            <p className="text-[8px] md:text-[11px] text-zinc-400 uppercase tracking-widest font-bold">Featured Pieces</p>
          </div>
          <div className="hidden md:flex gap-3">
            <button 
              onClick={() => scrollTrending('left')}
              className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm"
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              onClick={() => scrollTrending('right')}
              className="w-10 h-10 rounded-full border border-zinc-200 flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 relative">
          <div 
            ref={trendingRef}
            className="flex gap-4 md:gap-8 overflow-x-auto pb-4 md:pb-10 scrollbar-none snap-x snap-mandatory"
          >
            {productsError ? (
              <div className="w-full">
                <DataErrorState message={productsError} onRetry={refetchProducts} />
              </div>
            ) : productsLoading ? (
               Array.from({ length: 5 }).map((_, i) => (
                 <div key={`home-trend-sk-${i}`} className="flex-none w-[160px] md:w-[280px]">
                   <ProductSkeleton />
                 </div>
               ))
            ) : trendingProducts.length > 0 ? (
                trendingProducts.map((item, idx) => (
                  <div key={`home-trend-it-${item.id}-${idx}`} className="flex-none w-[160px] md:w-[280px] snap-center">
                    <ProductCard product={item} />
                  </div>
                ))
            ) : (
              <div className="w-full flex flex-col items-center justify-center py-20 text-zinc-400">
                <p className="text-[10px] uppercase tracking-widest font-bold">No products available</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Dolenga Modernity - Box with Image */}
      <section className="pt-0 pb-4 px-6 md:py-16">
        <div className="max-w-7xl mx-auto flex justify-center">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="w-full md:w-[90%] h-[60vh] md:h-[80vh] rounded-[2.5rem] relative overflow-hidden flex items-center justify-center text-center shadow-2xl"
          >
            {/* Background Image */}
            <div className="absolute inset-0">
               <img 
                src={IMAGES.dolenga} 
                alt="Modern Luxury"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center px-6">
              <motion.h2 
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: 0.3, duration: 1 }}
                 className="text-white text-4xl md:text-8xl font-serif mb-10 leading-[1.1] tracking-tight max-w-4xl"
              >
                Dolenga <br /> Modernity
              </motion.h2>
              
              <motion.button 
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: 0.6, duration: 1 }}
                 onClick={() => navigate('/shop')}
                 className="bg-white text-black px-12 py-4 rounded-full font-bold uppercase text-[11px] tracking-[0.3em] hover:bg-black hover:text-white transition-all duration-500 shadow-xl"
              >
                DISCOVER MORE
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* New Arrivals - Grid / Horizontal Mobile */}
      <section id="new-arrivals" className="py-8 md:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col items-center mb-8 md:mb-20">
             <h2 className="text-2xl md:text-6xl font-serif text-center uppercase mb-3 tracking-tighter">New Arrivals</h2>
             <div className="w-12 h-px bg-black"></div>
          </div>

          <div className="flex overflow-x-auto md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-x-8 md:gap-y-12 pb-6 md:pb-12 scrollbar-none snap-x snap-mandatory">
            {productsError ? (
              <div className="col-span-full w-full">
                <DataErrorState message={productsError} onRetry={refetchProducts} />
              </div>
            ) : productsLoading ? (
               Array.from({ length: 4 }).map((_, i) => <ProductSkeleton key={`home-new-sk-${i}`} />)
            ) : newArrivals.length > 0 ? (
                newArrivals.slice(0, 8).map((product, idx) => (
                  <div key={`home-arrival-it-${product.id}-${idx}`} className="flex-none w-[160px] md:w-auto snap-center">
                    <ProductCard product={product} />
                  </div>
                ))
            ) : (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-zinc-400 w-full">
                <p className="text-[10px] uppercase tracking-widest font-bold">No products available</p>
              </div>
            )}
          </div>

          <div className="mt-6 md:mt-20 flex justify-center">
             <Link to="/shop" className="btn-secondary px-8 py-3 text-[10px]">View All Items</Link>
          </div>
        </div>
      </section>

      {/* Detail Modal Overlay */}
      <AnimatePresence>
        {selectedProduct && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-[110] backdrop-blur-sm"
              onClick={() => setSelectedProduct(null)}
            />
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-4 md:inset-10 lg:inset-20 z-[111] bg-white shadow-2xl overflow-hidden flex flex-col md:flex-row"
            >
              {/* Reuse Detailed View Content from before or keep simplified as requested */}
              <div className="flex-1 bg-brand-sand overflow-y-auto scrollbar-none">
                 <div className="grid grid-cols-1 gap-1">
                    {selectedProduct.images.length > 0 ? selectedProduct.images.map((img, idx) => (
                      <img 
                        key={`home-modal-img-${selectedProduct.id}-${idx}`} 
                        src={img || FALLBACK_IMAGE} 
                        alt={`${selectedProduct.name}-${idx}`} 
                        onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                        className="w-full h-screen object-cover" 
                      />
                    )) : (
                      <img 
                        src={FALLBACK_IMAGE} 
                        alt={selectedProduct.name} 
                        className="w-full h-screen object-cover" 
                      />
                    )}
                 </div>
              </div>
              <div className="flex-1 p-8 md:p-16 lg:p-24 flex flex-col justify-center overflow-y-auto scrollbar-none bg-white">
                <button 
                  onClick={() => setSelectedProduct(null)}
                  className="absolute top-8 right-8 z-20 w-12 h-12 rounded-full border border-zinc-100 flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-sm"
                >
                  <X size={20} />
                </button>
                <div className="max-w-md mx-auto w-full">
                  <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-6 block">Premium Edition</span>
                  <h2 className="text-4xl md:text-6xl font-serif mb-6 leading-tight">{selectedProduct.name}</h2>
                  <p className="text-3xl font-serif text-zinc-400 mb-10">{formatINR(selectedProduct.price)}</p>
                  
                  <div className="mb-12">
                    <span className="text-[10px] uppercase tracking-widest font-bold mb-6 block border-b border-zinc-100 pb-2">Description</span>
                    <p className="text-zinc-500 leading-loose text-sm font-light">
                       {selectedProduct.description}
                    </p>
                  </div>

                  <div className="mb-12">
                    <span className="text-[10px] uppercase tracking-widest font-bold mb-6 block">Size Selection</span>
                    <div className="flex flex-wrap gap-4">
                      {['S', 'M', 'L', 'XL', '2XL'].map((s) => (
                        <button 
                          key={`home-size-opt-${s}`} 
                          onClick={() => setSelectedSize(s)}
                          className={`w-14 h-14 border flex items-center justify-center text-[11px] font-bold transition-all ${selectedSize === s ? 'border-black bg-black text-white' : 'border-zinc-200 hover:border-black'}`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button className="flex-1 btn-primary py-7" onClick={() => {
                          addToBag(selectedProduct, selectedSize);
                          setSelectedProduct(null);
                    }}>Add to Bag</button>
                    <button 
                      onClick={() => toggleWishlist(selectedProduct)}
                      className={`w-20 h-20 border shrink-0 flex items-center justify-center transition-all ${isInWishlist(selectedProduct.id) ? 'bg-black border-black text-white' : 'border-zinc-200 hover:border-black'}`}
                    >
                      <Heart size={24} fill={isInWishlist(selectedProduct.id) ? "currentColor" : "none"} strokeWidth={1} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
