import React from 'react';
import { useSupabaseCategories } from '../hooks/useSupabaseData';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function Collections() {
  const { categories, loading } = useSupabaseCategories();

  return (
    <div className="pt-32 pb-24 min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <header className="mb-20 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="w-12 h-px bg-black"></div>
            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">Anthology</span>
            <div className="w-12 h-px bg-black"></div>
          </div>
          <h1 className="text-6xl md:text-9xl font-serif tracking-tight text-black mb-8">Collections</h1>
          <p className="text-zinc-500 max-w-xl mx-auto font-light leading-relaxed">
            Every collection tells a story of refined simplicity and meticulous craftsmanship.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {categories.map((cat, idx) => (
            <Link 
              key={`coll-cat-item-${cat.id}`} 
              to={`/category/${cat.id}`}
              className="group relative aspect-[16/9] overflow-hidden bg-zinc-100"
            >
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors z-10" />
              {/* Using a placeholder if no image, or we could add images to categories */}
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 transition-transform duration-700 group-hover:scale-105">
                <span className="text-[10px] text-white/70 uppercase tracking-[0.5em] mb-2 font-bold">Explore</span>
                <h2 className="text-4xl md:text-6xl text-white font-serif italic">{cat.name}</h2>
              </div>
              <div className="w-full h-full bg-zinc-800" /> 
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
