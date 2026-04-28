"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Edit2, Trash2, X, Eye, EyeOff, Image as ImageIcon } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ProductsTab() {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [quickFilter, setQuickFilter] = useState<'all' | 'out_of_stock' | 'on_sale' | 'hidden'>('all');
    const [isCreatingCategoryInline, setIsCreatingCategoryInline] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchCategories();
    }, []);

    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (data) setProducts(data);
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').order('name');
        if (data) setCategories(data);
    };

    const buildCategoryTree = (cats: any[], parentId: number | null = null, prefix = '') => {
        let result: any[] = [];
        const children = cats.filter(c => c.parent_id === parentId);
        children.forEach(c => {
            result.push({ ...c, displayName: prefix + c.name });
            result = result.concat(buildCategoryTree(cats, c.id, prefix + '— '));
        });
        return result;
    };
    const flatCategories = buildCategoryTree(categories);

    const handleProductSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const form = e.currentTarget;
        const formData = new FormData(form);

        const name = formData.get('name') as string;
        const price = formData.get('price') as string;
        const compareAtPrice = formData.get('compare_at_price') as string;
        const description = formData.get('description') as string;
        const file = formData.get('image') as File;

        try {
            let finalCategoryId = formData.get('category_id') ? parseInt(formData.get('category_id') as string) : null;
            let finalCategoryText = '';

            if (isCreatingCategoryInline) {
                const newCatName = formData.get('new_category_name') as string;
                const newCatParent = formData.get('new_category_parent') as string;
                if (newCatName) {
                    const { data: newCat, error: catError } = await supabase.from('categories').insert([{
                        name: newCatName,
                        parent_id: newCatParent ? parseInt(newCatParent) : null
                    }]).select().single();

                    if (catError) throw catError;
                    finalCategoryId = newCat.id;
                    finalCategoryText = newCat.name;
                    fetchCategories();
                }
            } else if (finalCategoryId) {
                const cat = categories.find(c => c.id === finalCategoryId);
                if (cat) finalCategoryText = cat.name;
            }

            let imageUrl = editingProduct ? editingProduct.image_url : '';
            if (file && file.size > 0) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
                if (editingProduct && editingProduct.image_url) {
                    const urlParts = editingProduct.image_url.split('/');
                    const oldFileName = urlParts[urlParts.length - 1];
                    await supabase.storage.from('product-images').remove([oldFileName]);
                }
                imageUrl = publicUrlData.publicUrl;
            }

            const productData = {
                name, price: parseFloat(price), compare_at_price: compareAtPrice ? parseFloat(compareAtPrice) : null,
                description, image_url: imageUrl,
                category_id: finalCategoryId,
                category: finalCategoryText
            };

            if (editingProduct) {
                const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
                if (error) throw error;
                setMessage('¡Producto actualizado!');
            } else {
                const { error } = await supabase.from('products').insert([{ ...productData, in_stock: true, is_active: true }]);
                if (error) throw error;
                setMessage('¡Producto publicado!');
            }

            form.reset();
            setEditingProduct(null);
            setIsCreatingCategoryInline(false);
            fetchProducts();
        } catch (error: any) {
            setMessage(`Error al guardar: ${error.message}`);
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleDelete = async (id: number, imageUrl: string) => {
        if (!confirm('¿Seguro que querés eliminar este producto?')) return;
        if (imageUrl) {
            const urlParts = imageUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            await supabase.storage.from('product-images').remove([fileName]);
        }
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) fetchProducts();
    };

    const toggleStock = async (id: number, currentStock: boolean) => {
        const { error } = await supabase.from('products').update({ in_stock: !currentStock }).eq('id', id);
        if (!error) fetchProducts();
    };

    const toggleVisibility = async (id: number, currentVisibility: boolean) => {
        const { error } = await supabase.from('products').update({ is_active: !currentVisibility }).eq('id', id);
        if (!error) fetchProducts();
    };

    const filteredProducts = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesQuickFilter =
            quickFilter === 'all' ? true :
                quickFilter === 'out_of_stock' ? !product.in_stock :
                    quickFilter === 'on_sale' ? (product.compare_at_price && product.compare_at_price > product.price) :
                        quickFilter === 'hidden' ? !product.is_active : true;
        return matchesSearch && matchesQuickFilter;
    });

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 max-w-7xl mx-auto">
            {/* FORMULARIO */}
            <div className="xl:col-span-4 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-100 h-fit sticky top-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-black text-neutral-900">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                    {editingProduct && <button onClick={() => { setEditingProduct(null); setIsCreatingCategoryInline(false); }} className="text-neutral-400 hover:text-neutral-900 flex items-center gap-1 text-xs font-bold transition-colors"><X className="w-4 h-4" /> Cancelar</button>}
                </div>

                <form key={editingProduct ? editingProduct.id : 'new'} onSubmit={handleProductSubmit} className="space-y-4">
                    <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nombre</label><input name="name" type="text" defaultValue={editingProduct?.name || ''} required className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Precio Oferta</label><input name="price" type="number" step="0.01" defaultValue={editingProduct?.price || ''} required className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900" /></div>
                        <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Precio Lista</label><input name="compare_at_price" type="number" step="0.01" defaultValue={editingProduct?.compare_at_price || ''} className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 bg-neutral-50 outline-none focus:ring-2 focus:ring-neutral-900" placeholder="Opcional" /></div>
                    </div>

                    <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-xs font-bold text-neutral-500 uppercase">Categoría</label>
                            <button type="button" onClick={() => setIsCreatingCategoryInline(!isCreatingCategoryInline)} className="text-xs text-neutral-900 font-bold hover:underline">
                                {isCreatingCategoryInline ? 'Seleccionar existente' : '+ Crear Nueva'}
                            </button>
                        </div>

                        {isCreatingCategoryInline ? (
                            <div className="space-y-2">
                                <input name="new_category_name" type="text" placeholder="Nombre de la nueva categoría" className="w-full p-2 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-neutral-900" />
                                <select name="new_category_parent" className="w-full p-2 border border-neutral-200 rounded-lg text-sm outline-none bg-white focus:ring-2 focus:ring-neutral-900">
                                    <option value="">Sin categoría principal</option>
                                    {flatCategories.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                                </select>
                            </div>
                        ) : (
                            <select name="category_id" defaultValue={editingProduct?.category_id || ''} className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 outline-none bg-white focus:ring-2 focus:ring-neutral-900">
                                <option value="">Sin categoría</option>
                                {flatCategories.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                            </select>
                        )}
                    </div>

                    <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Descripción</label><textarea name="description" rows={3} defaultValue={editingProduct?.description || ''} className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900"></textarea></div>
                    <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Imagen (Opcional)</label><input name="image" type="file" accept="image/*" className="w-full p-2 border border-neutral-200 rounded-lg text-neutral-900 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200" /></div>
                    <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white font-bold py-3.5 rounded-lg hover:bg-neutral-800 disabled:bg-neutral-400 mt-4 shadow-md">
                        {loading ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Publicar Producto'}
                    </button>
                    {message && <div className={`p-3 rounded-lg text-center text-sm font-bold ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{message}</div>}
                </form>
            </div>

            {/* INVENTARIO */}
            <div className="xl:col-span-8 space-y-6">
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-100">
                    <div className="flex flex-col mb-6 gap-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <h2 className="text-xl font-black text-neutral-900">Inventario</h2>
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 h-4 w-4" />
                                <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900" />
                            </div>
                        </div>
                        <div className="flex gap-2 overflow-x-auto scroller-hidden pb-1">
                            <button onClick={() => setQuickFilter('all')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${quickFilter === 'all' ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'}`}>Todos</button>
                            <button onClick={() => setQuickFilter('on_sale')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${quickFilter === 'on_sale' ? 'bg-green-500 text-white' : 'bg-neutral-100 text-neutral-600'}`}>Ofertas</button>
                            <button onClick={() => setQuickFilter('out_of_stock')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${quickFilter === 'out_of_stock' ? 'bg-red-500 text-white' : 'bg-neutral-100 text-neutral-600'}`}>Agotados</button>
                            <button onClick={() => setQuickFilter('hidden')} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${quickFilter === 'hidden' ? 'bg-orange-500 text-white' : 'bg-neutral-100 text-neutral-600'}`}>Ocultos</button>
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scroller-hidden">
                        {filteredProducts.map(product => (
                            <div key={product.id} className={`flex items-center justify-between p-3 border rounded-xl transition-all hover:shadow-sm ${!product.is_active ? 'opacity-50 border-dashed bg-neutral-50' : product.in_stock ? 'border-neutral-200 bg-white' : 'border-red-100 bg-red-50/50 grayscale-[0.2]'}`}>
                                <div className="flex items-center gap-4 overflow-hidden">
                                    {product.image_url ? <img src={product.image_url} className="w-12 h-12 object-cover rounded-lg bg-neutral-100 flex-shrink-0" /> : <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-300"><ImageIcon className="w-5 h-5" /></div>}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-neutral-900 text-sm truncate">{product.name}</p>
                                            {!product.is_active && <span className="bg-neutral-200 text-neutral-600 text-[10px] uppercase font-black px-1.5 py-0.5 rounded">Oculto</span>}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <p className="text-neutral-500 text-xs font-bold">${product.price.toLocaleString('es-AR')}</p>
                                            {product.category && <span className="text-neutral-400 text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded">{product.category}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                    <button onClick={() => toggleVisibility(product.id, product.is_active)} className="p-2 text-neutral-400 hover:text-neutral-900 bg-white rounded-lg"><Eye className="w-4 h-4" /></button>
                                    <button onClick={() => toggleStock(product.id, product.in_stock)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-100 text-neutral-600">Stock</button>
                                    <button onClick={() => { setEditingProduct(product); setIsCreatingCategoryInline(false); }} className="p-2 text-neutral-400 hover:text-neutral-900 bg-white rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(product.id, product.image_url)} className="p-2 text-neutral-400 hover:text-red-500 bg-white rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}