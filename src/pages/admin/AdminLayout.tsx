import React, { useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Settings, Tag, ShoppingBag, ShoppingCart, Users, BarChart3, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, loading, logout } = useAuth();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/admin/login');
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
     return <div className="min-h-screen flex justify-center items-center font-serif text-lg text-zinc-500">Loading Admin...</div>;
  }

  if (!user || !isAdmin) {
      return null;
  }

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: <Settings size={18} /> },
    { name: 'Products', path: '/admin/products', icon: <ShoppingBag size={18} /> },
    { name: 'Categories', path: '/admin/categories', icon: <Tag size={18} /> },
    { name: 'Orders', path: '/admin/orders', icon: <ShoppingCart size={18} /> },
    { name: 'Customers', path: '/admin/customers', icon: <Users size={18} /> },
    { name: 'Analytics', path: '/admin/analytics', icon: <BarChart3 size={18} /> }
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex">
      <aside className="w-64 bg-white border-r border-zinc-200 hidden md:block shrink-0 h-screen sticky top-0">
        <div className="p-8 h-full flex flex-col">
          <div className="mb-8">
             <h2 className="text-xs uppercase tracking-[0.2em] font-bold text-zinc-400">Admin Panel</h2>
             <p className="text-[10px] text-zinc-400 mt-1 truncate">{user.email}</p>
          </div>
          <nav className="flex flex-col gap-2 flex-1">
            {navItems.map(item => (
              <Link 
                key={`admin-nav-desktop-${item.name.toLowerCase()}`}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${
                  location.pathname === item.path ? 'bg-black text-white' : 'text-zinc-600 hover:bg-zinc-100 hover:text-black'
                }`}
              >
                {item.icon}
                {item.name}
              </Link>
            ))}
          </nav>
          <button onClick={logout} className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors mt-auto">
             <LogOut size={18} />
             Logout
          </button>
        </div>
      </aside>
      
      {/* Mobile nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-200 flex justify-around p-4 z-50 overflow-x-auto">
         {navItems.map(item => (
            <Link 
            key={`admin-nav-mobile-${item.name.toLowerCase()}`}
            to={item.path}
            className={`flex flex-col items-center shrink-0 gap-1 px-4 text-[10px] uppercase font-bold tracking-widest ${
                location.pathname === item.path ? 'text-black' : 'text-zinc-400'
            }`}
            >
            {item.icon}
            {item.name}
            </Link>
        ))}
        <button onClick={logout} className="flex flex-col items-center shrink-0 gap-1 px-4 text-[10px] uppercase font-bold tracking-widest text-red-500">
            <LogOut size={18} />
            Logout
        </button>
      </div>

      <main className="flex-1 p-6 md:p-12 overflow-x-hidden pb-32 md:pb-12 h-screen overflow-y-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
