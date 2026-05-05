import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ADMIN_EMAIL } from '../constants';
import { supabase } from '../lib/supabase';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CustomerAuthModal({ isOpen, onClose }: CustomerAuthModalProps) {
  const navigate = useNavigate();
  const { loginWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authType, setAuthType] = useState<'login' | 'signup'>('login');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
       setAuthMethod('google');
       setEmail('');
       setPassword('');
       setAuthType('login');
       setError('');
       setLoading(false);
    }
  }, [isOpen]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError('');
      console.log("Initiating Google Login...");
      
      // Add a small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await loginWithGoogle();
      // Note: Redirect happens automatically for OAuth
    } catch (err: any) {
      console.error("Google Login Error:", err);
      let message = err.message || 'Authentication failed.';
      
      if (message.includes('provider is not enabled')) {
        message = "GOOGLE AUTH NOT ENABLED: You must enable Google as an auth provider in your Supabase Dashboard (Authentication > Providers > Google).";
      } else if (message.includes('redirect_uri_mismatch')) {
        message = "REDIRECT URI MISMATCH: Ensure your Supabase Site URL or Redirect URIs include this preview URL.";
      } else {
        message = `Auth Issue: ${message}. Google Login often fails inside an iframe. Click the 'Open in New Tab' button below.`;
      }
      
      setError(message);
    } finally {
       setLoading(false);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (authType === 'signup') {
        console.log("Attempting Sign Up for:", email);
        await signUpWithEmail(email, password);
        alert('Verification email sent! Please check your inbox to confirm your account before logging in.');
        setAuthType('login');
      } else {
        console.log("Attempting Sign In for:", email);
        await signInWithEmail(email, password);
        onClose();
        if (email === ADMIN_EMAIL) navigate('/admin');
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-[200] backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white z-[201] shadow-2xl p-8 md:p-12 border border-zinc-100"
      >
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 text-zinc-400 hover:text-black transition-colors"
        >
          <X size={20} />
        </button>

        <h2 className="text-2xl font-serif mb-2 text-center uppercase tracking-widest">
          Sign In
        </h2>
        <p className="text-xs text-zinc-500 text-center mb-8 uppercase tracking-widest font-medium">
          Access your account
        </p>

        {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 border border-red-100 text-[11px] uppercase tracking-widest font-bold text-center leading-relaxed">
              <p className="mb-3">{error}</p>
              {error.includes('iframe') || error.includes('new tab') ? (
                <button 
                  onClick={openInNewTab}
                  className="px-4 py-2 bg-black text-white text-[10px] hover:bg-zinc-800 transition-colors"
                >
                  Open in New Tab to Sign In
                </button>
              ) : null}
            </div>
        )}

        {authMethod === 'google' && (
          <div className="flex flex-col gap-4">
             <button
               onClick={handleGoogleLogin}
               disabled={loading}
               className="group flex items-center justify-center gap-3 w-full border border-black px-4 py-4 text-sm font-bold uppercase tracking-widest hover:bg-black hover:text-white transition-all disabled:opacity-50"
             >
               <svg viewBox="0 0 24 24" className="w-5 h-5" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
               </svg>
               Continue with Google
             </button>

             <div className="flex items-center my-4">
                <div className="flex-1 border-t border-zinc-200"></div>
                <span className="px-4 text-[10px] uppercase font-bold tracking-widest text-zinc-400">or</span>
                <div className="flex-1 border-t border-zinc-200"></div>
             </div>

             <button 
               onClick={() => setAuthMethod('email')}
               className="group flex items-center justify-center gap-3 w-full border border-zinc-200 px-4 py-4 text-sm font-bold uppercase tracking-widest hover:border-black transition-all"
             >
               <Mail size={18} />
               Continue with Email
             </button>
          </div>
        )}

        {authMethod === 'email' && (
           <div className="flex flex-col gap-6">
              <form onSubmit={handleEmailAuth} className="flex flex-col gap-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full border border-zinc-200 px-4 py-4 text-sm focus:border-black focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Password</label>
                  <input 
                    type="password" 
                    required 
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full border border-zinc-200 px-4 py-4 text-sm focus:border-black focus:outline-none transition-colors"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={loading}
                  className="group flex items-center justify-center gap-2 bg-black text-white px-4 py-4 text-sm font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : (authType === 'login' ? 'Sign In' : 'Sign Up')}
                  {!loading && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
                </button>
              </form>

              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setAuthType(authType === 'login' ? 'signup' : 'login')}
                  className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 hover:text-black underline transition-colors"
                >
                  {authType === 'login' ? 'Need an account?' : 'Already have an account?'}
                </button>
                <button 
                   onClick={() => setAuthMethod('google')}
                   className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-black transition-colors"
                >
                   Back to Google
                </button>
              </div>
              <div className="mt-8 text-center pt-4 border-t border-zinc-50">
                <p className="text-[9px] text-zinc-400 italic uppercase tracking-wider leading-relaxed">
                  Trouble logging in? If you're in a preview window, try opening the app in a new tab for better compatibility.
                </p>
              </div>
           </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
