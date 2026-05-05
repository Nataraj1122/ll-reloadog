import React from 'react';
import { useSupabaseProducts } from '../hooks/useSupabaseData';
import ProductCard from '../components/ProductCard';

export default function Sale() {
  const { products, loading } = useSupabaseProducts();
  // For demo, we'll just show products with price < 4000 as "Sale"
  const saleProducts = products.filter(p => p.price < 4000);

  return (
    <div className="pt-24 md:pt-32 pb-12 md:pb-24 min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <header className="mb-12 md:mb-20 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-8 md:w-12 h-px bg-black"></div>
            <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-red-500">End of Season</span>
            <div className="w-8 md:w-12 h-px bg-black"></div>
          </div>
          <h1 className="text-4xl md:text-9xl font-serif tracking-tight text-black">The Sale</h1>
          <p className="text-zinc-500 mt-4 md:mt-8 max-w-lg mx-auto font-light text-sm md:text-base">Exclusive offers on timeless pieces from previous seasons.</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-10 md:gap-y-16">
          {saleProducts.map((product, idx) => (
            <ProductCard key={`sale-item-${product.id}-${idx}`} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
}
