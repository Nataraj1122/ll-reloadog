import React, { useState } from 'react';
import { supabase, withTimeout, FALLBACK_IMAGE } from '../../lib/supabase';
import { useSupabaseCategories, useSupabaseProducts } from '../../hooks/useSupabaseData';
import { Product } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { Edit2, Trash2, Plus, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatINR } from '../../lib/utils';
import DataErrorState from '../../components/DataErrorState';

export default function AdminProducts() {
  const { products, loading: productsLoading, error: productsError, refetch: refetchProducts } = useSupabaseProducts();
  const { categories, error: categoriesError, refetch: refetchCategories } = useSupabaseCategories();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [images, setImages] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [stock, setStock] = useState('');
  const [description, setDescription] = useState('');
  const [sizes, setSizes] = useState('S, M, L, XL');
  const [isTrending, setIsTrending] = useState(false);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [productCode, setProductCode] = useState('');
  
  const [submitting, setSubmitting] = useState(false);

  const openAdd = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setCategoryId(categories.length > 0 ? categories[0].id : '');
    setImages('');
    setFile(null);
    setStock('10');
    setDescription('');
    setSizes('S, M, L, XL');
    setIsTrending(false);
    setIsNewArrival(false);
    setProductCode('');
    setIsModalOpen(true);
  };

  const openEdit = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(prod.price.toString());
    
    // Find the proper category UUID. prod.categoryId might be a text name if it's from legacy data.
    let resolvedCategoryId = prod.categoryId;
    // Check if it's actually a name
    const catByName = categories.find(c => c.name === prod.categoryId || c.name.toLowerCase() === prod.categoryId.toLowerCase());
    if (catByName) {
      resolvedCategoryId = catByName.id;
    } else {
      // If it's already an ID, verify it exists. If not, fallback to first category.
      const catById = categories.find(c => c.id === prod.categoryId);
      if (!catById && categories.length > 0) {
        resolvedCategoryId = categories[0].id;
      }
    }

    setCategoryId(resolvedCategoryId);
    setImages(prod.images.join('\n'));
    setFile(null);
    setStock(prod.stock.toString());
    setDescription(prod.description);
    setSizes(prod.sizes.join(', '));
    setIsTrending(prod.isTrending);
    setIsNewArrival(prod.isNewArrival);
    setProductCode(prod.productCode || '');
    setIsModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    setSubmitting(true);
    try {
       const { error } = await withTimeout(supabase
         .from('products')
         .delete()
         .eq('id', deletingProduct.id)) as any;
       
       if (error) throw error;
       setDeletingProduct(null);
       window.location.reload(); // Quick way to refresh for admin
    } catch (err: any) {
       console.error("Delete error:", err);
       alert(`Delete failed: ${err.message}`);
    } finally {
       setSubmitting(false);
    }
  };

  const uploadImage = async () => {
    if (!file) return null;
    
    console.log(`[AdminProducts] Attempting to upload image: ${file.name}`);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
    // User requested bucket path uses: products/
    // Since we use .from('products'), we just need the filename.
    const filePath = fileName;

    try {
      const { data, error } = await withTimeout(supabase.storage
        .from('products')
        .upload(filePath, file), 15000) as any;

      if (error) {
        console.error(`[AdminProducts] Storage upload error:`, error);
        throw error;
      }

      console.log(`[AdminProducts] Upload successful, file path: ${filePath}`);
      const { data: { publicUrl } } = supabase.storage
        .from('products')
        .getPublicUrl(filePath);

      console.log(`[AdminProducts] Generated public URL: ${publicUrl}`);
      return filePath; // Store the relative path instead of full URL for flexibility
    } catch (err: any) {
      console.error(`[AdminProducts] Upload operation failed:`, err.message);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId) {
        alert("Please select a category");
        return;
    }
    setSubmitting(true);
    setUploading(!!file);

    try {
      let finalImageUrl = images.split('\n')[0]?.trim() || '';

      if (file) {
        const uploadedPath = await uploadImage();
        if (uploadedPath) {
          finalImageUrl = uploadedPath;
        }
      }

      const categoryName = categories.find(c => c.id === categoryId)?.name || '';
      
      const productData = {
        name,
        price: Number(price),
        category_id: categoryId,
        category: categoryName,
        image_url: finalImageUrl,
        stock_quantity: Number(stock),
        description,
        sizes: Array.from(new Set(sizes.split(',').map(s => s.trim()).filter(Boolean))),
        is_trending: isTrending,
        is_new_arrival: isNewArrival,
        is_active: true,
        product_code: productCode,
      };

      if (editingProduct) {
        const { error } = await withTimeout(supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id), 15000) as any;
        if (error) throw error;
      } else {
        const { error } = await withTimeout(supabase
          .from('products')
          .insert([productData]), 15000) as any;
        if (error) throw error;
      }
      
      alert('Product saved successfully!');
      setIsModalOpen(false);
      refetchProducts();
    } catch (err: any) {
       console.error('Error saving product:', err);
       alert(`Error saving product: ${err.message}`);
    } finally {
       setSubmitting(false);
       setUploading(false);
    }
  };

  return (
    <div>
       <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-serif">Products</h1>
          <button onClick={openAdd} className="btn-primary py-3 px-6 flex items-center gap-2">
             <Plus size={16} /> Add Product
          </button>
       </div>

       {productsError || categoriesError ? (
          <DataErrorState 
             message={productsError || categoriesError || "Failed to load"} 
             onRetry={() => { refetchProducts(); refetchCategories(); }} 
          />
       ) : productsLoading ? (
         <p className="text-zinc-500">Loading products...</p>
       ) : (
         <div className="bg-white border border-zinc-200 overflow-x-auto">
           <table className="w-full text-left text-sm min-w-max">
             <thead className="bg-zinc-50 border-b border-zinc-200">
               <tr>
                 <th className="px-6 py-4 font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Image</th>
                 <th className="px-6 py-4 font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Name</th>
                 <th className="px-6 py-4 font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Price</th>
                 <th className="px-6 py-4 font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Category</th>
                 <th className="px-6 py-4 font-semibold text-zinc-500 uppercase tracking-widest text-[10px] text-right">Actions</th>
               </tr>
             </thead>
             <tbody>
               {products.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No products found.</td>
                  </tr>
               )}
               {products.map((prod) => {
                  let cat = categories.find(c => c.id === prod.categoryId);
                 if (!cat) {
                    cat = categories.find(c => c.name === prod.categoryId || c.name.toLowerCase() === prod.categoryId.toLowerCase());
                 }
                 const displayCategoryName = cat ? cat.name : (prod.categoryId !== 'all' && !prod.categoryId.includes('-') ? prod.categoryId : 'Unknown');
                 return (
                 <tr key={`admin-prod-${prod.id}`} className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50">
                   <td className="px-6 py-4">
                      <img src={prod.images[0] || ''} alt={prod.name} className="w-12 h-16 object-cover bg-zinc-100" />
                   </td>
                   <td className="px-6 py-4 font-medium">{prod.name}</td>
                   <td className="px-6 py-4">{formatINR(prod.price)}</td>
                   <td className="px-6 py-4 text-zinc-500">{displayCategoryName}</td>
                   <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                         <button onClick={() => openEdit(prod)} className="p-2 text-zinc-400 hover:text-black transition-colors" title="Edit">
                           <Edit2 size={16} />
                         </button>
                         <button onClick={() => setDeletingProduct(prod)} className="p-2 text-zinc-400 hover:text-red-500 transition-colors" title="Delete">
                           <Trash2 size={16} />
                         </button>
                      </div>
                   </td>
                 </tr>
                 );
               })}
             </tbody>
           </table>
         </div>
       )}

       {/* Delete Confirm Modal */}
       <AnimatePresence>
         {deletingProduct && (
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
                    You are about to delete <span className="text-black font-bold">"{deletingProduct.name}"</span>. This action cannot be undone.
                  </p>
                  <div className="flex gap-4">
                     <button 
                       onClick={() => setDeletingProduct(null)} 
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
             <div className="bg-white max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-none">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-zinc-400 hover:text-black z-10">
                   <X size={20} />
                </button>
                <h2 className="text-2xl font-serif mb-6">{editingProduct ? 'Edit Product' : 'Add Product'}</h2>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Product Name</label>
                      <input 
                        type="text" 
                        required 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        className="w-full border border-zinc-200 px-4 py-3 text-sm focus:border-black focus:outline-none"
                      />
                   </div>

                   <div className="md:col-span-2">
                       <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Product Code / SKU</label>
                       <input 
                         type="text" 
                         required 
                         value={productCode} 
                         onChange={e => setProductCode(e.target.value)} 
                         placeholder="e.g. RL101"
                         className="w-full border border-zinc-200 px-4 py-3 text-sm focus:border-black focus:outline-none"
                       />
                    </div>
                   
                   <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Price (INR)</label>
                      <input 
                        type="number" 
                        required 
                        min="0"
                        value={price} 
                        onChange={e => setPrice(e.target.value)} 
                        className="w-full border border-zinc-200 px-4 py-3 text-sm focus:border-black focus:outline-none"
                      />
                   </div>

                   <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Category</label>
                      <select
                        required
                        value={categoryId}
                        onChange={e => setCategoryId(e.target.value)}
                        className="w-full border border-zinc-200 px-4 py-3 text-sm focus:border-black focus:outline-none bg-white"
                      >
                         <option value="" disabled>Select Category</option>
                         {categories.map(c => (
                            <option key={`cat-opt-${c.id}`} value={c.id}>{c.name}</option>
                         ))}
                      </select>
                   </div>

                   <div className="md:col-span-2">
                       <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Product Image</label>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="border-2 border-dashed border-zinc-200 p-6 flex flex-col items-center justify-center text-center hover:border-black transition-colors cursor-pointer relative">
                             <input 
                               type="file" 
                               accept="image/*"
                               onChange={(e) => setFile(e.target.files?.[0] || null)}
                               className="absolute inset-0 opacity-0 cursor-pointer"
                             />
                             <Plus className="text-zinc-400 mb-2" size={24} />
                             <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                {file ? file.name : 'Upload New Image'}
                             </p>
                          </div>
                          
                          <div className="flex flex-col gap-2">
                             <label className="text-[9px] uppercase tracking-widest font-bold text-zinc-400">Or Image URL</label>
                             <input 
                               type="text" 
                               value={images} 
                               onChange={e => setImages(e.target.value)} 
                               placeholder="https://..."
                               className="w-full border border-zinc-200 px-4 py-3 text-sm focus:border-black focus:outline-none"
                             />
                             {(file || images) && (
                                <div className="mt-2 text-[9px] uppercase tracking-widest font-bold text-green-600 flex items-center gap-1">
                                   <CheckCircle size={10} /> Image selected
                                </div>
                             )}
                          </div>
                       </div>

                       {(file || images.split('\n')[0]) && (
                          <div className="mt-4 p-4 bg-zinc-50 border border-zinc-100 flex items-center gap-4">
                             <img 
                                src={file ? URL.createObjectURL(file) : (images.split('\n')[0]?.startsWith('http') ? images.split('\n')[0] : (images.split('\n')[0] ? supabase.storage.from('products').getPublicUrl(images.split('\n')[0]).data.publicUrl : FALLBACK_IMAGE))} 
                                alt="Preview" 
                                className="w-16 h-20 object-cover bg-white border border-zinc-200"
                                onError={(e) => { e.currentTarget.src = FALLBACK_IMAGE; }}
                             />
                             <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest">Preview</p>
                                <p className="text-[9px] text-zinc-500 uppercase tracking-widest mt-1">
                                   {file ? 'From local device' : 'From external URL'}
                                </p>
                             </div>
                          </div>
                       )}
                   </div>
                   
                   <div className="md:col-span-2">
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Description</label>
                      <textarea 
                        required 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                        rows={4}
                        className="w-full border border-zinc-200 px-4 py-3 text-sm focus:border-black focus:outline-none resize-none"
                      />
                   </div>

                   <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Stock Amount</label>
                      <input 
                        type="number" 
                        required 
                        min="0"
                        value={stock} 
                        onChange={e => setStock(e.target.value)} 
                        className="w-full border border-zinc-200 px-4 py-3 text-sm focus:border-black focus:outline-none"
                      />
                   </div>

                   <div>
                      <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Sizes (comma separated)</label>
                      <input 
                        type="text" 
                        required 
                        value={sizes} 
                        onChange={e => setSizes(e.target.value)} 
                        placeholder="S, M, L, XL"
                        className="w-full border border-zinc-200 px-4 py-3 text-sm focus:border-black focus:outline-none"
                      />
                   </div>

                   <div className="md:col-span-2 flex gap-8">
                       <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isTrending} 
                            onChange={e => setIsTrending(e.target.checked)} 
                            className="w-4 h-4 accent-black"
                          />
                          <span className="text-sm font-medium">Trending Product</span>
                       </label>
                       
                       <label className="flex items-center gap-3 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isNewArrival} 
                            onChange={e => setIsNewArrival(e.target.checked)} 
                            className="w-4 h-4 accent-black"
                          />
                          <span className="text-sm font-medium">New Arrival</span>
                       </label>
                   </div>

                   <div className="md:col-span-2 mt-4">
                       <button type="submit" disabled={submitting || uploading} className="w-full btn-primary py-4 disabled:opacity-50">
                          {uploading ? 'Uploading Image...' : submitting ? 'Saving...' : 'Save Product'}
                       </button>
                   </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
}
