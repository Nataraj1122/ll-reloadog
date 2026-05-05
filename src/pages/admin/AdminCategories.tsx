import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSupabaseCategories } from '../../hooks/useSupabaseData';
import { Category } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2, Plus, X, AlertTriangle } from 'lucide-react';

export default function AdminCategories() {
  const { categories, loading } = useSupabaseCategories();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [name, setName] = useState('');
  const [image, setImage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Custom confirm state
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  const openAdd = () => {
    setEditingCategory(null);
    setName('');
    setImage('');
    setIsModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setImage(cat.image);
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    setSubmitting(true);
    try {
       const { error } = await supabase
         .from('categories')
         .delete()
         .eq('id', deletingCategory.id);
       
       if (error) throw error;
       setDeletingCategory(null);
       window.location.reload();
    } catch (err: any) {
       console.error("Delete error:", err);
       alert(`Delete failed: ${err.message}`);
    } finally {
       setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const catData = {
        name,
        image_url: image, // Adjusted to match schema
      };

      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update(catData)
          .eq('id', editingCategory.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('categories')
          .insert([catData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      window.location.reload();
    } catch (err: any) {
       console.error('Error saving category:', err);
       alert(`Error saving category: ${err.message}`);
    } finally {
       setSubmitting(false);
    }
  };

  return (
    <div>
       <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-serif">Categories</h1>
          <button onClick={openAdd} className="btn-primary py-3 px-6 flex items-center gap-2">
             <Plus size={16} /> Add Category
          </button>
       </div>

       {loading ? (
         <p className="text-zinc-500">Loading categories...</p>
       ) : (
         <div className="bg-white border border-zinc-200">
           <table className="w-full text-left text-sm">
             <thead className="bg-zinc-50 border-b border-zinc-200">
               <tr>
                 <th className="px-6 py-4 font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Image</th>
                 <th className="px-6 py-4 font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Name</th>
                 <th className="px-6 py-4 font-semibold text-zinc-500 uppercase tracking-widest text-[10px] text-right">Actions</th>
               </tr>
             </thead>
             <tbody>
               {categories.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-8 text-center text-zinc-500">No categories found.</td>
                  </tr>
               )}
               {categories.map((cat) => (
                 <tr key={`admin-category-tbl-${cat.id}`} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                   <td className="px-6 py-4">
                      <img src={cat.image} alt={cat.name} className="w-16 h-16 object-cover bg-zinc-100" />
                   </td>
                   <td className="px-6 py-4 font-medium">{cat.name}</td>
                   <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                         <button onClick={() => openEdit(cat)} className="p-2 text-zinc-400 hover:text-black transition-colors" title="Edit">
                           <Edit2 size={16} />
                         </button>
                         <button onClick={() => setDeletingCategory(cat)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors" title="Delete">
                           <Trash2 size={16} />
                         </button>
                      </div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       )}

       {/* Delete Confirm Modal */}
       <AnimatePresence>
         {deletingCategory && (
            <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.9, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.9, y: 20 }}
                 className="bg-white max-w-sm w-full p-8 shadow-2xl relative text-center"
               >
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                     <AlertTriangle size={32} />
                  </div>
                  <h2 className="text-xl font-serif mb-2">Are you sure?</h2>
                  <p className="text-xs text-zinc-500 mb-8 uppercase tracking-widest font-medium leading-relaxed">
                    You are about to delete <span className="text-black font-bold">"{deletingCategory.name}"</span>. This action cannot be undone.
                  </p>
                  <div className="flex gap-4">
                     <button 
                       onClick={() => setDeletingCategory(null)} 
                       disabled={submitting}
                       className="flex-1 py-3 text-[10px] uppercase tracking-[0.2em] font-bold border border-zinc-200 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                     >
                       Cancel
                     </button>
                     <button 
                       onClick={handleDelete} 
                       disabled={submitting}
                       className="flex-1 py-3 text-[10px] uppercase tracking-[0.2em] font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50"
                     >
                       {submitting ? 'Deleting...' : 'Delete'}
                     </button>
                  </div>
               </motion.div>
            </div>
         )}
       </AnimatePresence>

       {/* Modal */}
       {isModalOpen && (
          <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4">
             <div className="bg-white max-w-md w-full p-8 shadow-2xl relative">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-zinc-400 hover:text-black">
                   <X size={20} />
                </button>
                <h2 className="text-2xl font-serif mb-6">{editingCategory ? 'Edit Category' : 'Add Category'}</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                   <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Category Name</label>
                      <input 
                        type="text" 
                        required 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="w-full border border-zinc-200 px-4 py-3 text-sm focus:border-black focus:outline-none"
                      />
                   </div>
                   <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Image URL</label>
                      <input 
                        type="url" 
                        required 
                        value={image} 
                        onChange={e => setImage(e.target.value)} 
                        className="w-full border border-zinc-200 px-4 py-3 text-sm focus:border-black focus:outline-none"
                      />
                   </div>
                   <button type="submit" disabled={submitting} className="btn-primary py-4 mt-4 disabled:opacity-50">
                      {submitting ? 'Saving...' : 'Save Category'}
                   </button>
                </form>
             </div>
          </div>
       )}
    </div>
  );
}
