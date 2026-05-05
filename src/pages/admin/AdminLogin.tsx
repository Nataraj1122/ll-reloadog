import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowRight, Mail } from 'lucide-react';

export default function AdminLogin() {
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const navigate = useNavigate();
  const { user, isAdmin, loading, loginWithGoogle, signInWithEmail, logout } = useAuth();

  useEffect(() => {
    if (!loading && user && isAdmin) {
      navigate('/admin');
    }
  }, [user, isAdmin, loading, navigate]);

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    setError('');

    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Login attempt failed:", err);
      if (err.message?.includes('provider is not enabled')) {
        setError("AUTHENTICATION ERROR: Google login is not enabled in your Supabase project. Enable it at Authentication > Providers > Google.");
      } else {
        setError(`Failed to login: ${err.message || 'Try opening in a new tab if you are using an iframe.'}`);
      }
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      await signInWithEmail(email, password);
    } catch (err: any) {
      console.error("Email login failed:", err);
      setError(err.message || 'Authentication failed');
      setIsSubmitting(false);
    }
  };

  if (loading || (user && isAdmin)) {
    return <div className="min-h-screen flex justify-center items-center font-serif text-lg text-zinc-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen pb-24 bg-zinc-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white p-12 border border-zinc-200 shadow-sm text-center">
        <h1 className="text-3xl font-serif mb-2 uppercase tracking-widest text-black">Admin Panel</h1>
        <p className="text-xs text-zinc-500 uppercase tracking-widest font-medium mb-8">Authorized Access Only</p>
        
        {user && !isAdmin && (
           <div className="mb-6 p-4 bg-red-50 text-red-600 text-[11px] uppercase tracking-widest font-bold border border-red-200">
             Your account does not have admin privileges. <br />
             <p className="text-[9px] mt-2 italic font-medium opacity-70 italic">If you are the developer, verify your email in constants.ts matches your login email.</p>
             <button onClick={() => logout()} className="underline mt-2">Sign out</button>
           </div>
        )}

        {authMethod === 'google' ? (
          <div className="flex flex-col gap-4">
            <button 
              onClick={handleGoogleLogin} 
              disabled={isSubmitting} 
              className="group flex items-center justify-center gap-3 w-full bg-black text-white px-4 py-4 text-sm font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Verifying...' : (
                 <>
                    <svg viewBox="0 0 24 24" className="w-5 h-5 bg-white p-[2px] rounded-sm" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                   </svg>
                   Continue with Google
                 </>
              )}
            </button>
            <button 
              onClick={() => setAuthMethod('email')}
              className="flex items-center justify-center gap-3 w-full border border-zinc-200 px-4 py-4 text-xs font-bold uppercase tracking-widest hover:border-black transition-all"
            >
              <Mail size={16} />
              Use Email & Password
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailLogin} className="flex flex-col gap-6 text-left">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Admin Email</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@example.com"
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
              disabled={isSubmitting}
              className="group flex items-center justify-center gap-2 bg-black text-white px-4 py-4 text-sm font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In as Admin'}
              {!isSubmitting && <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />}
            </button>
            <button 
              type="button" 
              onClick={() => setAuthMethod('google')}
              className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 hover:text-black transition-colors text-center"
            >
              Back to Google Login
            </button>
          </form>
        )}

        <div className="mt-8 pt-8 border-t border-zinc-100">
          <button 
            onClick={() => window.location.href = '/'} 
            className="group flex items-center justify-center gap-3 w-full bg-white text-black border border-black px-4 py-4 text-sm font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all font-sans"
          >
            Go to Customer Site
          </button>
        </div>
        
        {error && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest mt-6 bg-red-50 p-3 border border-red-100 text-center">{error}</p>}
        
        <div className="mt-8 text-center">
            <p className="text-[9px] text-zinc-400 italic uppercase tracking-wider leading-relaxed">
              Having trouble? If using a preview window, try opening in a new tab for better auth compatibility.
            </p>
        </div>
      </div>
    </div>
  );
}
