import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Heart, ShoppingBag, User, Menu, X, Minus, Plus, Trash2, ArrowRight, Package, MapPin, Instagram, Phone, MessageCircle } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { formatINR } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import CustomerAuthModal from './CustomerAuthModal';

export default function Layout() {
  const { cartOpen, setCartOpen, searchOpen, setSearchOpen, cartItems, updateQuantity, removeFromBag, cartTotalCount, cartSubtotal, wishlistItems } = useAppContext();
  const { user, logout, isAdmin, loading: authLoading } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const isTransparent = isHome && !isScrolled;

  useEffect(() => {
    if (!authLoading && user && isAdmin && !location.pathname.startsWith('/admin')) {
      navigate('/admin');
    }
  }, [user, isAdmin, authLoading, location.pathname, navigate]);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Shop', path: '/shop' },
    { name: 'Collections', path: '/collections' },
    { name: 'New Arrivals', path: '/new-arrivals' },
    { name: 'Sale', path: '/sale' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('newsletter')
        .insert([{ email }]);
      
      if (error) throw error;
      setSubscribed(true);
      setEmail('');
    } catch (error) {
      console.error('Error subscribing:', error);
      alert('Failed to subscribe. Please try again.');
    } finally {
        setSubmitting(false);
    }
  };

  const handleScrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    if (location.pathname !== '/') {
      navigate('/' + sectionId);
      return;
    }
    const element = document.getElementById(sectionId.replace('#', ''));
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const performSearch = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Priority search: Try exact product code match first
        const { data: exactData, error: exactError } = await supabase
          .from('products')
          .select('*')
          .ilike('product_code', searchQuery)
          .eq('is_active', true)
          .limit(1);

        if (exactError) throw exactError;

        if (exactData && exactData.length > 0) {
          setSearchResults(exactData);
          setIsSearching(false);
          return;
        }

        // Fallback: Partial match on name, code, description, category
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .or(`name.ilike.%${searchQuery}%,product_code.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
          .eq('is_active', true)
          .limit(8);

        if (error) throw error;
        setSearchResults(data || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(performSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (searchOpen) {
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [searchOpen]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 border-b ${
          isScrolled 
            ? 'bg-white/90 backdrop-blur-md py-4 border-zinc-200 shadow-sm' 
            : (isTransparent ? 'bg-transparent py-6 border-transparent' : 'bg-white py-6 border-zinc-100')
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
          <div className="flex items-center gap-12">
            <Link 
              to="/" 
              className={`text-2xl font-bold tracking-[0.2em] font-serif uppercase transition-all duration-500 ${isTransparent ? 'invisible pointer-events-none' : 'text-black visible'}`}
            >
              RELOAD
            </Link>

            <div className="hidden md:flex gap-8 items-center list-none">
              {navItems.map((item) => (
                <li key={`nav-desktop-${item.name.replace(/\s+/g, '-').toLowerCase()}`}>
                  <Link 
                    to={item.path} 
                    className={`text-[11px] uppercase tracking-[0.2em] font-medium transition-all hover:scale-105 ${
                      location.pathname === item.path 
                        ? (isTransparent ? 'text-white border-b border-white pb-0.5' : 'text-black border-b border-black pb-0.5') 
                        : (isTransparent ? 'text-zinc-300 hover:text-white' : 'text-zinc-600 hover:text-black')
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </div>
          </div>

          <div className="flex gap-4 md:gap-6 items-center">
            <button 
              className={`hover:opacity-70 transition-opacity ${isTransparent ? 'text-white' : 'text-black'}`}
              onClick={() => setSearchOpen(true)}
            >
              <Search size={22} strokeWidth={1.5} />
            </button>
            <Link 
              to="/wishlist" 
              className={`transition-colors relative ${location.pathname === '/wishlist' ? (isTransparent ? 'text-white' : 'text-black') : (isTransparent ? 'text-zinc-200 hover:text-white' : 'text-black hover:opacity-70')}`}
            >
              <Heart size={22} strokeWidth={1.5} fill={isTransparent ? "rgba(255,255,255,0.1)" : "none"} />
              {wishlistItems.length > 0 && (
                <span className={`absolute -top-1 -right-1 text-[8px] w-4 h-4 flex items-center justify-center rounded-full font-bold ${isTransparent ? 'bg-white text-black' : 'bg-black text-white'}`}>
                  {wishlistItems.length}
                </span>
              )}
            </Link>
            {user ? (
               <div className="relative">
                 <button 
                  className={`hover:opacity-70 transition-opacity flex items-center ${isTransparent ? 'text-white' : 'text-black'}`}
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                 >
                   <User size={20} strokeWidth={1.5} />
                 </button>
                 
                 <AnimatePresence>
                   {userDropdownOpen && (
                     <>
                       <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setUserDropdownOpen(false)}
                       />
                       <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-4 w-48 bg-white border border-zinc-200 shadow-xl z-50 py-2"
                       >
                         <div className="px-4 py-2 border-b border-zinc-100 mb-2">
                           <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400">Account</p>
                           <p className="text-xs font-semibold truncate text-black">{(user.user_metadata as any)?.full_name || user.email}</p>
                         </div>
                         <Link 
                           to="/my-orders" 
                           onClick={() => setUserDropdownOpen(false)}
                           className="flex items-center gap-3 w-full text-left px-4 py-3 text-xs uppercase tracking-widest font-bold text-zinc-600 hover:bg-zinc-50 hover:text-black transition-colors"
                         >
                           <Package size={14} />
                           My Orders
                         </Link>
                         <button 
                          onClick={() => {
                            logout();
                            setUserDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 text-xs uppercase tracking-widest font-bold text-zinc-600 hover:bg-zinc-50 hover:text-black transition-colors"
                         >
                           Logout
                         </button>
                       </motion.div>
                     </>
                   )}
                 </AnimatePresence>
               </div>
             ) : (
               <button 
                 className={`flex items-center gap-1.5 transition-colors text-[10px] uppercase tracking-widest font-bold ${isTransparent ? 'text-zinc-300 hover:text-white' : 'text-zinc-600 hover:text-black'}`} 
                 onClick={() => setIsAuthModalOpen(true)}
               >
                  <User size={20} strokeWidth={1.5} />
                  <span className="hidden md:inline">Sign In</span>
               </button>
            )}
            <button 
              className={`hover:opacity-70 transition-opacity relative ${isTransparent ? 'text-white' : 'text-black'}`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {cartTotalCount > 0 && (
                <span className={`absolute -top-1 -right-1 text-[8px] w-4 h-4 flex items-center justify-center rounded-full font-bold ${isTransparent ? 'bg-white text-black' : 'bg-black text-white'}`}>
                  {cartTotalCount}
                </span>
              )}
            </button>
            <button 
              className={`md:hidden ml-2 ${isTransparent ? 'text-white' : 'text-zinc-600'}`}
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={20} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed inset-0 z-[60] bg-brand-bone p-8 flex flex-col"
          >
            <div className="flex justify-between items-center mb-12">
              <span className="text-2xl font-bold font-serif uppercase">reload</span>
              <button onClick={() => setMobileMenuOpen(false)}><X size={24} /></button>
            </div>
            <div className="flex flex-col gap-8">
              {navItems.map((item) => (
                <Link 
                  key={`mobile-nav-${item.name.replace(/\s+/g, '-').toLowerCase()}`} 
                  to={item.path} 
                  onClick={() => setMobileMenuOpen(false)} 
                  className={`font-serif text-5xl tracking-tighter transition-all ${
                    location.pathname === item.path ? 'text-black italic pl-4' : 'text-zinc-400'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              <Link to="/wishlist" onClick={() => setMobileMenuOpen(false)} className={`font-serif text-5xl tracking-tighter flex items-center gap-4 ${location.pathname === '/wishlist' ? 'text-black italic pl-4' : 'text-zinc-400'}`}>
                Wishlist
                {wishlistItems.length > 0 && <span className="text-xl bg-black text-white px-3 py-1 rounded-full font-sans not-italic">{wishlistItems.length}</span>}
              </Link>
              <button 
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (user) {
                    logout();
                  } else {
                    setIsAuthModalOpen(true);
                  }
                }} 
                className="font-serif text-3xl text-zinc-400 text-left flex items-center gap-4"
              >
                {user ? 'Sign Out' : 'Sign In'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      <CustomerAuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
      />

      {/* Search Overlay */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-brand-bone flex flex-col"
          >
            <div className="max-w-7xl mx-auto w-full px-6 md:px-12 py-8 flex justify-between items-center">
              <span className="text-2xl font-bold font-serif uppercase">reload</span>
              <button 
                onClick={() => setSearchOpen(false)}
                className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-zinc-100"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="max-w-4xl mx-auto w-full px-6 flex-1 flex flex-col justify-start pt-12 pb-32 overflow-y-auto scrollbar-none">
              <div className="relative mb-16">
                <input 
                  autoFocus
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products or code..." 
                  className="w-full bg-transparent border-b-2 border-zinc-200 py-6 text-2xl md:text-5xl font-serif text-black placeholder:text-zinc-200 focus:outline-none focus:border-black transition-colors"
                />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-4">
                  {isSearching && (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-6 h-6 border-2 border-zinc-200 border-t-black rounded-full"
                    />
                  )}
                  <Search size={32} className="text-zinc-300" />
                </div>
              </div>
              
              {searchQuery.trim().length >= 2 && (
                <div className="mb-12">
                  <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-400 mb-8">
                    {isSearching ? 'Searching...' : searchResults.length > 0 ? `Results (${searchResults.length})` : 'No products found'}
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {searchResults.map((product) => (
                      <motion.div
                        key={`search-result-${product.id}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="group"
                      >
                        <Link 
                          to={`/category/${product.category_id}`} // Link to its category page
                          onClick={() => {
                            setSearchOpen(false);
                          }}
                          className="block"
                        >
                          <div className="aspect-[3/4] bg-zinc-100 mb-3 overflow-hidden relative">
                            <img 
                              src={product.image_url} 
                              alt={product.name} 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                            />
                            {product.product_code && (
                              <div className="absolute top-2 left-2 bg-black/80 text-white text-[8px] px-2 py-1 uppercase tracking-widest font-bold">
                                {product.product_code}
                              </div>
                            )}
                          </div>
                          <h5 className="text-[10px] uppercase tracking-widest font-bold mb-1 truncate">{product.name}</h5>
                          <p className="text-xs text-zinc-500">{formatINR(product.price)}</p>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div>
                  <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-400 mb-6">Trending Searches</h4>
                  <ul className="flex flex-col gap-4">
                    {[
                      { name: 'Summer Linen', id: 'trend-1', path: '/shop' },
                      { name: 'Technical Shells', id: 'trend-2', path: '/shop' },
                      { name: 'Leather Accessories', id: 'trend-3', path: '/shop' },
                      { name: 'Minimalist Tees', id: 'trend-4', path: '/shop' }
                    ].map(s => (
                      <li key={`trending-search-${s.id}`}>
                        <Link 
                          to={s.path} 
                          onClick={() => setSearchOpen(false)}
                          className="text-2xl font-serif hover:italic hover:pl-2 transition-all"
                        >
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase tracking-[0.3em] font-bold text-zinc-400 mb-6">Recent Collections</h4>
                  <ul className="flex flex-col gap-4">
                    {[
                      { name: 'Autumn 24', id: 'coll-1', path: '/collections' },
                      { name: 'Essential Staples', id: 'coll-2', path: '/collections' },
                      { name: 'Archive Series', id: 'coll-3', path: '/collections' }
                    ].map(s => (
                      <li key={`recent-search-${s.id}`}>
                        <Link 
                          to={s.path} 
                          onClick={() => setSearchOpen(false)}
                          className="text-2xl font-serif hover:italic hover:pl-2 transition-all"
                        >
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart Drawer */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-sm"
              onClick={() => setCartOpen(false)}
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-brand-bone z-[101] shadow-2xl p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-2xl font-serif">Your Bag ({cartTotalCount})</h2>
                <button onClick={() => setCartOpen(false)} className="p-2 hover:bg-zinc-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400">
                    <ShoppingBag size={48} className="mb-4 opacity-30" />
                    <p className="text-sm uppercase tracking-widest font-semibold">Your bag is empty</p>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div key={`cart-drawer-item-${item.cartItemId}`} className="flex gap-6 mb-8 pb-8 border-b border-zinc-100">
                      <div className="w-24 aspect-[3/4] bg-zinc-100 shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <h3 className="text-sm font-semibold uppercase tracking-wider pr-4">{item.name}</h3>
                          <button onClick={() => removeFromBag(item.cartItemId)} className="text-zinc-400 hover:text-red-500 transition-colors p-2 -mr-2">
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <p className="text-zinc-500 text-xs mb-4">Size: {item.size}</p>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2 text-xs font-medium border border-zinc-200">
                            <button className="p-3 hover:bg-zinc-50 active:bg-zinc-100" onClick={() => updateQuantity(item.cartItemId, -1)}><Minus size={14} /></button>
                            <span className="w-6 text-center font-bold">{item.quantity}</span>
                            <button className="p-3 hover:bg-zinc-50 active:bg-zinc-100" onClick={() => updateQuantity(item.cartItemId, 1)}><Plus size={14} /></button>
                          </div>
                          <span className="text-sm font-medium">{formatINR(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-8 border-t border-zinc-100">
                <div className="flex justify-between items-center mb-6">
                  <span className="text-zinc-500 text-sm">Subtotal</span>
                  <span className="text-lg font-serif">{formatINR(cartSubtotal)}</span>
                </div>
                <Link 
                  to="/checkout"
                  onClick={() => setCartOpen(false)}
                  className={`flex items-center justify-center w-full py-6 font-bold uppercase tracking-[0.2em] text-[10px] transition-all ${cartItems.length === 0 ? 'bg-zinc-300 text-zinc-500 cursor-not-allowed pointer-events-none' : 'btn-primary'}`} 
                >
                  Proceed to Checkout
                </Link>
                <button className="w-full text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-400 py-2 mt-4 hover:text-black transition-colors" onClick={() => setCartOpen(false)}>Continue Shopping</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="bg-black text-white py-12 mt-auto border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center">
          {/* TOP SECTION: CONTACT BUTTONS + SOCIAL */}
          <div className="flex flex-col items-center gap-6 mb-10 text-center">
            <div className="flex flex-wrap justify-center gap-6 md:gap-10">
              <a 
                href="https://maps.app.goo.gl/JM4cXo9Cse9ncpbM9" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white hover:text-zinc-400 transition-all text-[11px] uppercase tracking-[0.2em] font-bold"
              >
                <MapPin size={14} />
                Directions
              </a>
              <a 
                href="tel:9866936088" 
                className="flex items-center gap-2 text-white hover:text-zinc-400 transition-all text-[11px] uppercase tracking-[0.2em] font-bold"
              >
                <Phone size={14} />
                Call
              </a>
              <a 
                href="https://wa.me/919866936088" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-white hover:text-zinc-400 transition-all text-[11px] uppercase tracking-[0.2em] font-bold"
              >
                <MessageCircle size={14} />
                WhatsApp
              </a>
            </div>
            <a 
              href="https://www.instagram.com/re_lo_ad_fash_ion?igsh=MTd2bGNrZjdyNHl0bA==" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white hover:text-zinc-400 transition-all transform hover:scale-110 active:scale-95"
              aria-label="Instagram"
            >
              <Instagram size={20} strokeWidth={1.5} />
            </a>
          </div>

          {/* MAIN LINKS: SHOP + INFO */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-10 w-full max-w-sm mx-auto mb-12">
            <div className="flex flex-col items-start md:items-center">
              <h4 className="text-[10px] font-bold tracking-[0.2em] mb-4 text-white uppercase">SHOP</h4>
              <ul className="flex flex-col gap-2.5 items-start md:items-center">
                {['New Arrivals', 'Best Sellers', 'Collections', 'All Products'].map(item => (
                  <li key={`footer-shop-${item.replace(/\s+/g, '-').toLowerCase()}`}><Link to="/shop" className="text-zinc-500 hover:text-white transition-colors text-[11px] whitespace-nowrap">{item}</Link></li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col items-start md:items-center">
              <h4 className="text-[10px] font-bold tracking-[0.2em] mb-4 text-white uppercase">INFO</h4>
              <ul className="flex flex-col gap-2.5 items-start md:items-center">
                {['About Us', 'Sustainability', 'Careers'].map(item => (
                  <li key={`footer-info-${item.replace(/\s+/g, '-').toLowerCase()}`}><button className="text-zinc-500 hover:text-white transition-colors text-[11px] whitespace-nowrap">{item}</button></li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center gap-6 pt-10 border-t border-zinc-900 w-full max-w-xs">
            <p className="text-zinc-600 text-[10px] tracking-[0.2em] uppercase text-center">
              © 2026 RELOAD. ALL RIGHTS RESERVED.
            </p>
            <Link to="/admin/login" className="text-zinc-800 hover:text-zinc-500 transition-colors text-[9px] uppercase tracking-widest">Admin</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
