"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Edit2, Trash2, X, Eye, EyeOff, Image as ImageIcon, Plus, ArrowLeft, Package } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function ProductsTab() {
    const [view, setView] = useState<'list' | 'form'>('list');
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
    }, [view]); // Recarga al cambiar de vista

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

    const handleCreateNew = () => {
        setEditingProduct(null);
        setIsCreatingCategoryInline(false);
        setView('form');
    };

    const handleEdit = (product: any) => {
        setEditingProduct(product);
        setIsCreatingCategoryInline(false);
        setView('form');
    };

    const handleCancelForm = () => {
        setEditingProduct(null);
        setIsCreatingCategoryInline(false);
        setView('list');
    };

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
                description, image_url: imageUrl, category_id: finalCategoryId, category: finalCategoryText
            };

            if (editingProduct) {
                const { error } = await supabase.from('products').update(productData).eq('id', editingProduct.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('products').insert([{ ...productData, in_stock: true, is_active: true }]);
                if (error) throw error;
            }

            form.reset();
            handleCancelForm(); // Vuelve a la lista tras guardar
        } catch (error: any) {
            setMessage(`Error al guardar: ${error.message}`);
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

    // --------------------------------------------------------------------------------
    // VISTA DE LISTADO DE PRODUCTOS (DEFAULT)
    // --------------------------------------------------------------------------------
    if (view === 'list') {
        return (
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header Superior: Título y Botón Crear */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                    <div>
                        <h2 className="text-2xl font-black text-neutral-900">Productos</h2>
                        <p className="text-neutral-500 font-medium mt-1">Gestioná el catálogo de tu tienda.</p>
                    </div>
                    <button
                        onClick={handleCreateNew}
                        className="w-full sm:w-auto bg-neutral-900 text-white font-bold py-3 px-6 rounded-xl hover:bg-neutral-800 transition-colors shadow-md flex items-center justify-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> Crear producto
                    </button>
                </div>

                {/* Filtros e Inventario */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-100">
                    <div className="flex flex-col mb-6 gap-4 border-b border-neutral-100 pb-6">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            {/* Buscador */}
                            <div className="relative w-full sm:w-96">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 h-5 w-5" />
                                <input
                                    type="text"
                                    placeholder="Buscar producto por nombre o categoría..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm text-neutral-900 outline-none focus:bg-white focus:ring-2 focus:ring-neutral-900 transition-all"
                                />
                            </div>
                        </div>

                        {/* Botones de Filtrado (Pills) */}
                        <div className="flex gap-2 overflow-x-auto scroller-hidden pt-2">
                            <button onClick={() => setQuickFilter('all')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${quickFilter === 'all' ? 'bg-neutral-900 text-white shadow-sm' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}`}>Todos</button>
                            <button onClick={() => setQuickFilter('on_sale')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${quickFilter === 'on_sale' ? 'bg-green-500 text-white shadow-sm' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}`}>Ofertas</button>
                            <button onClick={() => setQuickFilter('out_of_stock')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${quickFilter === 'out_of_stock' ? 'bg-red-500 text-white shadow-sm' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}`}>Agotados</button>
                            <button onClick={() => setQuickFilter('hidden')} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${quickFilter === 'hidden' ? 'bg-orange-500 text-white shadow-sm' : 'bg-neutral-50 text-neutral-600 hover:bg-neutral-100 border border-neutral-200'}`}>Ocultos</button>
                        </div>
                    </div>

                    {/* Tabla/Lista de Productos */}
                    <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 scroller-hidden">
                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-12">
                                <Package className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
                                <h3 className="text-lg font-bold text-neutral-900">No hay productos.</h3>
                                <p className="text-neutral-500 text-sm mt-1">Hacé clic en "Crear producto" para empezar.</p>
                            </div>
                        ) : filteredProducts.map(product => (
                            <div key={product.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-2xl transition-all hover:shadow-md ${!product.is_active ? 'opacity-50 border-dashed bg-neutral-50' : product.in_stock ? 'border-neutral-200 bg-white' : 'border-red-100 bg-red-50/50 grayscale-[0.2]'}`}>
                                <div className="flex items-center gap-4 overflow-hidden mb-4 sm:mb-0">
                                    {product.image_url ? <img src={product.image_url} className="w-16 h-16 object-cover rounded-xl bg-neutral-100 flex-shrink-0 border border-neutral-100" /> : <div className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center text-neutral-300 border border-neutral-200"><ImageIcon className="w-6 h-6" /></div>}
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-neutral-900 text-base truncate">{product.name}</p>
                                            {!product.is_active && <span className="bg-neutral-200 text-neutral-600 text-[10px] uppercase font-black px-1.5 py-0.5 rounded">Oculto</span>}
                                        </div>
                                        <div className="flex items-center gap-3 mt-1">
                                            <p className="text-neutral-900 font-black">${product.price.toLocaleString('es-AR')}</p>
                                            {product.compare_at_price && product.compare_at_price > product.price && (
                                                <p className="text-neutral-400 text-xs line-through font-bold">${product.compare_at_price.toLocaleString('es-AR')}</p>
                                            )}
                                            {product.category && <span className="text-neutral-500 text-xs bg-neutral-100 px-2 py-1 rounded-md font-medium border border-neutral-200">{product.category}</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 sm:flex-shrink-0">
                                    <button onClick={() => toggleVisibility(product.id, product.is_active)} className="p-2 text-neutral-400 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg transition-colors" title={product.is_active ? "Ocultar" : "Mostrar"}><Eye className="w-4 h-4" /></button>
                                    <button onClick={() => toggleStock(product.id, product.in_stock)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors border ${product.in_stock ? 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100' : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'}`}>
                                        {product.in_stock ? 'Con Stock' : 'Sin Stock'}
                                    </button>
                                    <button onClick={() => handleEdit(product)} className="p-2 text-neutral-400 hover:text-blue-600 bg-white border border-neutral-200 rounded-lg transition-colors" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(product.id, product.image_url)} className="p-2 text-neutral-400 hover:text-red-600 bg-white border border-neutral-200 rounded-lg transition-colors" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    // --------------------------------------------------------------------------------
    // VISTA DE FORMULARIO (CREACIÓN / EDICIÓN)
    // --------------------------------------------------------------------------------
    return (
        <div className="max-w-3xl mx-auto">
            <button onClick={handleCancelForm} className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 font-bold mb-6 transition-colors">
                <ArrowLeft className="w-5 h-5" /> Volver al listado
            </button>

            <div className="bg-white p-6 sm:p-10 rounded-3xl shadow-xl border border-neutral-100 relative overflow-hidden">
                <h2 className="text-2xl font-black text-neutral-900 mb-8">{editingProduct ? 'Editar Producto' : 'Crear Nuevo Producto'}</h2>

                <form key={editingProduct ? editingProduct.id : 'new'} onSubmit={handleProductSubmit} className="space-y-6 relative z-10">
                    <div>
                        <label className="block text-sm font-black text-neutral-700 uppercase mb-2">Nombre del producto</label>
                        <input name="name" type="text" defaultValue={editingProduct?.name || ''} required className="w-full p-3.5 border border-neutral-200 rounded-xl text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900 transition-all bg-neutral-50 focus:bg-white" placeholder="Ej: Remera Lisa Blanca" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-black text-neutral-700 uppercase mb-2">Precio de Venta ($)</label>
                            <input name="price" type="number" step="0.01" defaultValue={editingProduct?.price || ''} required className="w-full p-3.5 border border-neutral-200 rounded-xl text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900 transition-all bg-neutral-50 focus:bg-white" placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-sm font-black text-neutral-700 uppercase mb-2">Precio Original ($) <span className="text-neutral-400 font-medium normal-case text-xs">(Para mostrar en oferta)</span></label>
                            <input name="compare_at_price" type="number" step="0.01" defaultValue={editingProduct?.compare_at_price || ''} className="w-full p-3.5 border border-neutral-200 rounded-xl text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900 transition-all bg-neutral-50 focus:bg-white" placeholder="0.00 (Opcional)" />
                        </div>
                    </div>

                    <div className="p-5 rounded-2xl border border-neutral-200 bg-neutral-50/50">
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-black text-neutral-700 uppercase">Categoría</label>
                            <button type="button" onClick={() => setIsCreatingCategoryInline(!isCreatingCategoryInline)} className="text-sm text-blue-600 font-bold hover:underline">
                                {isCreatingCategoryInline ? 'Elegir del listado' : '+ Crear nueva categoría aquí'}
                            </button>
                        </div>

                        {isCreatingCategoryInline ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <input name="new_category_name" type="text" placeholder="Nombre de categoría..." className="w-full p-3 border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-neutral-900 bg-white" />
                                <select name="new_category_parent" className="w-full p-3 border border-neutral-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-neutral-900 bg-white">
                                    <option value="">Sin categoría principal</option>
                                    {flatCategories.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                                </select>
                            </div>
                        ) : (
                            <select name="category_id" defaultValue={editingProduct?.category_id || ''} className="w-full p-3.5 border border-neutral-200 rounded-xl text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900 transition-all bg-white">
                                <option value="">No asignar ninguna categoría</option>
                                {flatCategories.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                            </select>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-black text-neutral-700 uppercase mb-2">Descripción</label>
                        <textarea name="description" rows={4} defaultValue={editingProduct?.description || ''} className="w-full p-3.5 border border-neutral-200 rounded-xl text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900 transition-all bg-neutral-50 focus:bg-white" placeholder="Detalles, medidas, materiales..."></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-black text-neutral-700 uppercase mb-2">Imagen Principal {editingProduct && <span className="text-neutral-400 font-medium normal-case text-xs">(Opcional si ya tiene)</span>}</label>
                        <div className="flex items-center gap-4 p-4 border-2 border-dashed border-neutral-200 rounded-2xl bg-neutral-50 hover:bg-neutral-100 transition-colors">
                            {editingProduct?.image_url && (
                                <img src={editingProduct.image_url} alt="Actual" className="w-16 h-16 object-cover rounded-xl border border-neutral-200 shadow-sm" />
                            )}
                            <input name="image" type="file" accept="image/*" className="w-full text-sm text-neutral-500 file:mr-4 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-white file:text-neutral-900 file:shadow-sm hover:file:bg-neutral-50 cursor-pointer" />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-neutral-100 flex gap-4">
                        <button type="button" onClick={handleCancelForm} className="px-6 py-4 rounded-xl font-bold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading} className="flex-grow bg-neutral-900 text-white font-black py-4 rounded-xl hover:bg-neutral-800 transition-all active:scale-95 shadow-xl disabled:opacity-50">
                            {loading ? 'Guardando producto...' : editingProduct ? 'Guardar Cambios' : 'Publicar Producto'}
                        </button>
                    </div>

                    {message && <div className={`absolute top-4 right-4 p-4 rounded-xl text-sm font-bold shadow-2xl animate-bounce ${message.includes('Error') ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>{message}</div>}
                </form>
            </div>
        </div>
    );
}