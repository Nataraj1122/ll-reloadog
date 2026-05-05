import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, WishlistItem } from '../types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

interface AppContextType {
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  cartItems: CartItem[];
  wishlistItems: WishlistItem[];
  addToBag: (product: Product, size: string) => void;
  updateQuantity: (cartItemId: string, change: number) => void;
  removeFromBag: (cartItemId: string) => void;
  clearCart: () => Promise<void>;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  cartTotalCount: number;
  cartSubtotal: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cartItems');
    return saved ? JSON.parse(saved) : [];
  });
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>(() => {
    const saved = localStorage.getItem('wishlistItems');
    return saved ? JSON.parse(saved) : [];
  });

  // Sync Cart with Supabase
  useEffect(() => {
    if (!user) {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
      return;
    }

    const fetchCart = async () => {
      const { data, error } = await supabase
        .from('cart')
        .select('*')
        .eq('user_id', user.id);
      
      if (!error && data) {
        setCartItems(Array.from(new Map(data.map(item => [item.cart_item_id, {
          id: item.product_id,
          cartItemId: item.cart_item_id,
          name: item.name,
          price: item.price,
          image: item.image_url,
          size: item.size,
          quantity: item.quantity
        }])).values()));
      }
    };

    fetchCart();

    const channel = supabase
      .channel(`user_cart_${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'cart', 
        filter: `user_id=eq.${user.id}` 
      }, () => fetchCart())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Sync Wishlist with Supabase
  useEffect(() => {
    if (!user) {
      localStorage.setItem('wishlistItems', JSON.stringify(wishlistItems));
      return;
    }

    const fetchWishlist = async () => {
      const { data, error } = await supabase
        .from('wishlist')
        .select('*, products(*)')
        .eq('user_id', user.id);
      
      if (!error && data) {
        setWishlistItems(Array.from(new Map(data.map(item => [item.products.id, {
          id: item.products.id,
          name: item.products.name,
          price: item.products.price,
          image: item.products.image_url
        }])).values()));
      }
    };

    fetchWishlist();

    const channel = supabase
      .channel(`user_wishlist_${user.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'wishlist', 
        filter: `user_id=eq.${user.id}` 
      }, () => fetchWishlist())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const addToBag = async (product: Product, size: string) => {
    const cartItemId = `${product.id}-${size}`;
    const existing = cartItems.find((item) => item.cartItemId === cartItemId);
    
    const quantity = existing ? existing.quantity + 1 : 1;
    const newItem: CartItem = { 
          id: product.id, 
          cartItemId, 
          name: product.name, 
          price: product.price, 
          image: product.images[0], 
          size, 
          quantity
        };

    if (user) {
      const { error } = await supabase
        .from('cart')
        .upsert({
          user_id: user.id,
          cart_item_id: cartItemId,
          product_id: product.id,
          name: product.name,
          price: product.price,
          image_url: product.images[0],
          size,
          quantity
        }, { onConflict: 'user_id, cart_item_id' });
      
      if (error) console.error("Error adding to cart:", error);
    } else {
      setCartItems(prev => {
        if (existing) {
          return prev.map(item => item.cartItemId === cartItemId ? newItem : item);
        }
        return [...prev, newItem];
      });
    }
    setCartOpen(true);
  };

  const updateQuantity = async (cartItemId: string, change: number) => {
    const item = cartItems.find(i => i.cartItemId === cartItemId);
    if (!item) return;

    const newQuantity = item.quantity + change;
    if (newQuantity <= 0) return;

    if (user) {
      const { error } = await supabase
        .from('cart')
        .update({ quantity: newQuantity })
        .eq('user_id', user.id)
        .eq('cart_item_id', cartItemId);
      
      if (error) console.error("Error updating quantity:", error);
    } else {
      setCartItems(prev => prev.map(i => i.cartItemId === cartItemId ? { ...i, quantity: newQuantity } : i));
    }
  };

  const removeFromBag = async (cartItemId: string) => {
    if (user) {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id)
        .eq('cart_item_id', cartItemId);
      
      if (error) console.error("Error removing from cart:", error);
    } else {
      setCartItems((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
    }
  };

  const clearCart = async () => {
    if (user) {
      const { error } = await supabase
        .from('cart')
        .delete()
        .eq('user_id', user.id);
      
      if (error) console.error("Error clearing cart:", error);
    } else {
      setCartItems([]);
      localStorage.removeItem('cartItems');
    }
  };

  const toggleWishlist = async (product: Product) => {
    const existing = wishlistItems.find(item => item.id === product.id);
    
    if (user) {
      if (existing) {
        await supabase
          .from('wishlist')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', product.id);
      } else {
        await supabase
          .from('wishlist')
          .insert({
            user_id: user.id,
            product_id: product.id
          });
      }
    } else {
      setWishlistItems(prev => {
        if (existing) {
          return prev.filter(item => item.id !== product.id);
        }
        return [...prev, {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.images[0]
        }];
      });
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlistItems.some(item => item.id === productId);
  };

  const cartSubtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const cartTotalCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <AppContext.Provider
      value={{
        cartOpen,
        setCartOpen,
        searchOpen,
        setSearchOpen,
        cartItems,
        wishlistItems,
        addToBag,
        updateQuantity,
        removeFromBag,
        clearCart,
        toggleWishlist,
        isInWishlist,
        cartTotalCount,
        cartSubtotal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
