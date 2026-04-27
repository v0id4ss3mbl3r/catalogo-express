"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Edit2, Trash2, Package, AlertCircle, Tags, X, Eye, EyeOff, Percent, LayoutDashboard, Settings, LogOut, Image as ImageIcon, Plus } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AdminPanel() {
    const [isAuthed, setIsAuthed] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'settings'>('products');

    const [products, setProducts] = useState<any[]>([]);
    const [storeSettings, setStoreSettings] = useState<any>(null);
    const [categories, setCategories] = useState<any[]>([]);

    const [searchTerm, setSearchTerm] = useState('');
    const [editingProduct, setEditingProduct] = useState<any | null>(null);
    const [quickFilter, setQuickFilter] = useState<'all' | 'out_of_stock' | 'on_sale' | 'hidden'>('all');

    // Estado para creación de categoría inline en el form de producto
    const [isCreatingCategoryInline, setIsCreatingCategoryInline] = useState(false);

    useEffect(() => {
        if (isAuthed) {
            fetchProducts();
            fetchSettings();
            fetchCategories();
        }
    }, [isAuthed]);

    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (data) setProducts(data);
    };

    const fetchSettings = async () => {
        const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single();
        if (data) setStoreSettings(data);
    };

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').order('name');
        if (data) setCategories(data);
    };

    // Función para construir el árbol visual de categorías (Guiones para subcategorías)
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

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'v0id2026') {
            setIsAuthed(true);
        } else {
            alert('Contraseña incorrecta');
            setPassword('');
        }
    };

    const handleLogout = () => {
        setIsAuthed(false);
        setPassword('');
    };

    // --- GUARDAR CATEGORÍA DESDE LA PESTAÑA ---
    const handleCategorySubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const name = formData.get('name') as string;
        const parentId = formData.get('parent_id') as string;

        try {
            const { error } = await supabase.from('categories').insert([{
                name,
                parent_id: parentId ? parseInt(parentId) : null
            }]);
            if (error) throw error;
            e.currentTarget.reset();
            fetchCategories();
        } catch (error: any) {
            alert(`Error al guardar categoría: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteCategory = async (id: number) => {
        if (!confirm('Eliminar esta categoría también eliminará sus subcategorías. ¿Continuar?')) return;
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (!error) fetchCategories();
    };

    // --- GUARDAR PRODUCTO ---
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
            // Gestión de la categoría (Creación Inline vs Selección)
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
                    fetchCategories(); // Refrescar lista global
                }
            } else if (finalCategoryId) {
                const cat = categories.find(c => c.id === finalCategoryId);
                if (cat) finalCategoryText = cat.name;
            }

            // Gestión de la imagen
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
                category: finalCategoryText // Mantenemos el string por retrocompatibilidad con la Home
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

    // --- GUARDAR CONFIGURACIÓN ---
    const handleSettingsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const formData = new FormData(e.currentTarget);
        const storeName = formData.get('store_name') as string;
        const themeColor = formData.get('theme_color') as string;
        const file = formData.get('logo') as File;

        try {
            let logoUrl = storeSettings?.logo_url || '';
            if (file && file.size > 0) {
                const fileExt = file.name.split('.').pop();
                const fileName = `logo-${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
                if (uploadError) throw uploadError;
                const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
                logoUrl = publicUrlData.publicUrl;
            }

            const { error } = await supabase.from('store_settings').update({ store_name: storeName, theme_color: themeColor, logo_url: logoUrl }).eq('id', 1);
            if (error) throw error;

            setMessage('¡Configuración guardada!');
            fetchSettings();
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
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

    if (!isAuthed) {
        return (
            <main className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
                <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full">
                    <h1 className="text-2xl font-black text-neutral-900 mb-6 text-center">Admin Access</h1>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña de acceso" className="w-full mb-4 p-3 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" required />
                    <button type="submit" className="w-full bg-neutral-900 text-white font-bold py-3 rounded-xl hover:bg-neutral-800 transition-colors">Ingresar</button>
                </form>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-neutral-50 flex flex-col md:flex-row">

            {/* SIDEBAR */}
            <aside className="w-full md:w-64 bg-white border-r border-neutral-200 flex flex-col md:min-h-screen sticky top-0 z-10">
                <div className="p-6 border-b border-neutral-200 flex items-center gap-3">
                    {storeSettings?.logo_url ? (
                        <img src={storeSettings.logo_url} alt="Logo" className="w-8 h-8 rounded object-cover" />
                    ) : (
                        <div className="w-8 h-8 bg-neutral-900 rounded flex items-center justify-center text-white font-bold">A</div>
                    )}
                    <h1 className="font-black text-neutral-900 truncate">{storeSettings?.store_name || 'Panel Admin'}</h1>
                </div>

                <nav className="flex-grow p-4 space-y-2 flex md:flex-col overflow-x-auto md:overflow-visible">
                    <button onClick={() => setActiveTab('products')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap w-full ${activeTab === 'products' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}>
                        <Package className="w-5 h-5" /> Productos
                    </button>
                    <button onClick={() => setActiveTab('categories')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap w-full ${activeTab === 'categories' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}>
                        <Tags className="w-5 h-5" /> Categorías
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-colors whitespace-nowrap w-full ${activeTab === 'settings' ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900'}`}>
                        <Settings className="w-5 h-5" /> Configuración
                    </button>
                </nav>

                <div className="p-4 border-t border-neutral-200">
                    <button onClick={handleLogout} className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm hover:bg-red-100 transition-colors">
                        <LogOut className="w-4 h-4" /> Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* CONTENIDO PRINCIPAL */}
            <div className="flex-grow p-6 sm:p-10 w-full overflow-hidden">

                {/* ---------------- PESTAÑA: PRODUCTOS ---------------- */}
                {activeTab === 'products' && (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 max-w-7xl mx-auto">
                        <div className="xl:col-span-4 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-100 h-fit sticky top-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-black text-neutral-900">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
                                {editingProduct && <button onClick={() => { setEditingProduct(null); setIsCreatingCategoryInline(false); }} className="text-neutral-400 hover:text-neutral-900 flex items-center gap-1 text-xs font-bold transition-colors"><X className="w-4 h-4" /> Cancelar</button>}
                            </div>

                            <form key={editingProduct ? editingProduct.id : 'new'} onSubmit={handleProductSubmit} className="space-y-4">
                                <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nombre</label><input name="name" type="text" defaultValue={editingProduct?.name || ''} required className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 outline-none" /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Precio Oferta</label><input name="price" type="number" step="0.01" defaultValue={editingProduct?.price || ''} required className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 outline-none" /></div>
                                    <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Precio Lista</label><input name="compare_at_price" type="number" step="0.01" defaultValue={editingProduct?.compare_at_price || ''} className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 bg-neutral-50 outline-none" placeholder="Opcional" /></div>
                                </div>

                                {/* SELECTOR DE CATEGORÍA AVANZADO */}
                                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-xs font-bold text-neutral-500 uppercase">Categoría</label>
                                        <button type="button" onClick={() => setIsCreatingCategoryInline(!isCreatingCategoryInline)} className="text-xs text-orange-500 font-bold hover:underline">
                                            {isCreatingCategoryInline ? 'Seleccionar existente' : '+ Crear Nueva'}
                                        </button>
                                    </div>

                                    {isCreatingCategoryInline ? (
                                        <div className="space-y-2">
                                            <input name="new_category_name" type="text" placeholder="Nombre de la nueva categoría" className="w-full p-2 border border-neutral-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-500" />
                                            <select name="new_category_parent" className="w-full p-2 border border-neutral-200 rounded-lg text-sm outline-none bg-white">
                                                <option value="">Sin categoría principal (Categoría Padre)</option>
                                                {flatCategories.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                                            </select>
                                        </div>
                                    ) : (
                                        <select name="category_id" defaultValue={editingProduct?.category_id || ''} className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 outline-none bg-white">
                                            <option value="">Sin categoría</option>
                                            {flatCategories.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                                        </select>
                                    )}
                                </div>

                                <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Descripción</label><textarea name="description" rows={3} defaultValue={editingProduct?.description || ''} className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 outline-none"></textarea></div>
                                <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Imagen (Opcional)</label><input name="image" type="file" accept="image/*" className="w-full p-2 border border-neutral-200 rounded-lg text-neutral-900 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200" /></div>
                                <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white font-bold py-3.5 rounded-lg hover:bg-neutral-800 disabled:bg-neutral-400 mt-4 shadow-md">
                                    {loading ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Publicar Producto'}
                                </button>
                                {message && <div className={`p-3 rounded-lg text-center text-sm font-bold ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{message}</div>}
                            </form>
                        </div>

                        <div className="xl:col-span-8 space-y-6">
                            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-100">
                                <div className="flex flex-col mb-6 gap-4">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <h2 className="text-xl font-black text-neutral-900">Inventario</h2>
                                        <div className="relative w-full sm:w-64">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 h-4 w-4" />
                                            <input type="text" placeholder="Buscar producto..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-900 outline-none" />
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
                                                <button onClick={() => toggleVisibility(product.id, product.is_active)} className="p-2 text-neutral-400 hover:text-orange-500 bg-white rounded-lg"><Eye className="w-4 h-4" /></button>
                                                <button onClick={() => toggleStock(product.id, product.in_stock)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-neutral-100 text-neutral-600">Stock</button>
                                                <button onClick={() => { setEditingProduct(product); setIsCreatingCategoryInline(false); }} className="p-2 text-neutral-400 hover:text-orange-500 bg-white rounded-lg"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(product.id, product.image_url)} className="p-2 text-neutral-400 hover:text-red-500 bg-white rounded-lg"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------------- PESTAÑA: CATEGORÍAS ---------------- */}
                {activeTab === 'categories' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-100 h-fit">
                            <h2 className="text-xl font-black text-neutral-900 mb-6">Crear Categoría</h2>
                            <form onSubmit={handleCategorySubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nombre de la Categoría</label>
                                    <input name="name" type="text" required className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Depende de (Categoría Padre)</label>
                                    <select name="parent_id" className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 bg-white outline-none">
                                        <option value="">Ninguna (Es categoría principal)</option>
                                        {flatCategories.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                                    </select>
                                </div>
                                <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white font-bold py-3.5 rounded-lg hover:bg-neutral-800 transition-colors">
                                    Guardar Categoría
                                </button>
                            </form>
                        </div>

                        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-100">
                            <h2 className="text-xl font-black text-neutral-900 mb-6">Árbol de Categorías</h2>
                            <div className="space-y-2">
                                {flatCategories.length === 0 ? (
                                    <p className="text-sm text-neutral-500 text-center py-4">No hay categorías creadas aún.</p>
                                ) : flatCategories.map(c => (
                                    <div key={c.id} className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-100 rounded-lg">
                                        <span className="font-semibold text-neutral-700 text-sm">{c.displayName}</span>
                                        <button onClick={() => handleDeleteCategory(c.id)} className="text-neutral-400 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------------- PESTAÑA: CONFIGURACIÓN ---------------- */}
                {activeTab === 'settings' && (
                    <div className="max-w-2xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-neutral-100">
                        <h2 className="text-2xl font-black text-neutral-900 mb-8">Personalizar Tienda</h2>
                        <form onSubmit={handleSettingsSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-neutral-700 mb-2">Nombre de la Tienda</label>
                                <input name="store_name" type="text" defaultValue={storeSettings?.store_name} required className="w-full p-3 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-neutral-700 mb-2">Color Principal (Tema)</label>
                                <div className="flex items-center gap-4">
                                    <input name="theme_color" type="color" defaultValue={storeSettings?.theme_color || '#f97316'} className="w-14 h-14 rounded cursor-pointer border-0 p-0" />
                                    <span className="text-sm text-neutral-500">Se aplicará a los botones y elementos destacados.</span>
                                </div>
                            </div>
                            <div className="pt-4 border-t border-neutral-100">
                                <label className="block text-sm font-bold text-neutral-700 mb-2">Logo de la Marca</label>
                                {storeSettings?.logo_url && (
                                    <div className="mb-4 relative inline-block">
                                        <img src={storeSettings.logo_url} alt="Logo actual" className="h-20 w-auto rounded-lg border border-neutral-200 p-2 bg-neutral-50" />
                                    </div>
                                )}
                                <input name="logo" type="file" accept="image/*" className="w-full p-2 border border-neutral-200 rounded-lg text-neutral-900 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200" />
                            </div>
                            <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white font-bold py-4 rounded-lg hover:bg-neutral-800 transition-colors mt-4">
                                {loading ? 'Guardando...' : 'Guardar Configuración'}
                            </button>
                            {message && <div className={`p-4 rounded-lg text-center text-sm font-bold ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{message}</div>}
                        </form>
                    </div>
                )}

            </div>
            <style jsx global>{`.scroller-hidden::-webkit-scrollbar { display: none; } .scroller-hidden { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </main>
    );
}