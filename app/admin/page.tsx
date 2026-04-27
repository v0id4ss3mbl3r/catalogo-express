"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, Edit2, Trash2, Package, AlertCircle, Tags, X } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AdminPanel() {
    const [isAuthed, setIsAuthed] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [products, setProducts] = useState<any[]>([]);

    // Nuevos estados para Buscador y Edición
    const [searchTerm, setSearchTerm] = useState('');
    const [editingProduct, setEditingProduct] = useState<any | null>(null);

    useEffect(() => {
        if (isAuthed) fetchProducts();
    }, [isAuthed]);

    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (data) setProducts(data);
    };

    const checkPassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'v0id2026') {
            setIsAuthed(true);
        } else {
            alert('Contraseña incorrecta');
            setPassword('');
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const form = e.currentTarget;
        const formData = new FormData(form);

        const name = formData.get('name') as string;
        const price = formData.get('price') as string;
        const description = formData.get('description') as string;
        const category = formData.get('category') as string;
        const file = formData.get('image') as File;

        try {
            // Si estamos editando, mantenemos la URL vieja por defecto
            let imageUrl = editingProduct ? editingProduct.image_url : '';

            // Si el usuario seleccionó un archivo nuevo
            if (file && file.size > 0) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
                if (uploadError) throw uploadError;

                const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(fileName);

                // BORRADO INTELIGENTE: Si estamos editando y subimos foto nueva, borramos la vieja
                if (editingProduct && editingProduct.image_url) {
                    const urlParts = editingProduct.image_url.split('/');
                    const oldFileName = urlParts[urlParts.length - 1];
                    await supabase.storage.from('product-images').remove([oldFileName]);
                }

                imageUrl = publicUrlData.publicUrl;
            }

            if (editingProduct) {
                // MODO EDICIÓN
                const { error: dbError } = await supabase
                    .from('products')
                    .update({ name, price: parseFloat(price), description, category, image_url: imageUrl })
                    .eq('id', editingProduct.id);
                if (dbError) throw dbError;
                setMessage('¡Producto actualizado con éxito!');
            } else {
                // MODO CREACIÓN
                const { error: dbError } = await supabase
                    .from('products')
                    .insert([{ name, price: parseFloat(price), description, category, image_url: imageUrl, in_stock: true }]);
                if (dbError) throw dbError;
                setMessage('¡Producto publicado con éxito!');
            }

            form.reset();
            setEditingProduct(null); // Salimos del modo edición
            fetchProducts();
        } catch (error: any) {
            setMessage(`Error al guardar: ${error.message}`);
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleDelete = async (id: number, imageUrl: string) => {
        if (!confirm('¿Seguro que querés eliminar este producto definitivamente?')) return;

        // BORRADO INTELIGENTE: Eliminar archivo del Storage
        if (imageUrl) {
            const urlParts = imageUrl.split('/');
            const fileName = urlParts[urlParts.length - 1];
            await supabase.storage.from('product-images').remove([fileName]);
        }

        // Eliminar de la Base de Datos
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) fetchProducts();
    };

    const toggleStock = async (id: number, currentStock: boolean) => {
        const { error } = await supabase.from('products').update({ in_stock: !currentStock }).eq('id', id);
        if (!error) fetchProducts();
    };

    // Cálculos para el Mini-Dashboard
    const totalProducts = products.length;
    const outOfStock = products.filter(p => !p.in_stock).length;
    const uniqueCategories = new Set(products.map(p => p.category).filter(Boolean)).size;

    // Buscador
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.category && product.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (!isAuthed) {
        return (
            <main className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
                <form onSubmit={checkPassword} className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full">
                    <h1 className="text-2xl font-black text-neutral-900 mb-6 text-center">Admin Access</h1>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña de acceso" className="w-full mb-4 p-3 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500" required />
                    <button type="submit" className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl hover:bg-orange-600 transition-colors">Ingresar</button>
                </form>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-neutral-50 p-6 sm:p-10">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* COLUMNA IZQUIERDA: Formulario */}
                <div className="lg:col-span-4 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-100 h-fit sticky top-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-black text-neutral-900">
                            {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
                        </h2>
                        {editingProduct && (
                            <button onClick={() => setEditingProduct(null)} className="text-neutral-400 hover:text-neutral-900 flex items-center gap-1 text-xs font-bold transition-colors">
                                <X className="w-4 h-4" /> Cancelar
                            </button>
                        )}
                    </div>

                    {/* Usamos 'key' para forzar el reseteo del form cuando cambia el modo edición */}
                    <form key={editingProduct ? editingProduct.id : 'new'} onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nombre</label>
                            <input name="name" type="text" defaultValue={editingProduct?.name || ''} required className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 focus:ring-2 focus:ring-orange-500 outline-none transition-shadow" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Precio ($)</label>
                                <input name="price" type="number" defaultValue={editingProduct?.price || ''} required className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 focus:ring-2 focus:ring-orange-500 outline-none transition-shadow" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Categoría</label>
                                <input name="category" type="text" defaultValue={editingProduct?.category || ''} className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 focus:ring-2 focus:ring-orange-500 outline-none transition-shadow" placeholder="Ej: Ropa" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Descripción</label>
                            <textarea name="description" rows={3} defaultValue={editingProduct?.description || ''} className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 focus:ring-2 focus:ring-orange-500 outline-none transition-shadow"></textarea>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Imagen {editingProduct && '(Opcional)'}</label>
                            {/* En modo edición la imagen no es requerida */}
                            <input name="image" type="file" accept="image/*" required={!editingProduct} className="w-full p-2 border border-neutral-200 rounded-lg text-neutral-900 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200 transition-colors" />
                            {editingProduct && editingProduct.image_url && (
                                <p className="text-xs text-neutral-400 mt-2">Mantener vacío para conservar la foto actual.</p>
                            )}
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white font-bold py-3.5 rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-400 mt-4 shadow-md">
                            {loading ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Publicar Producto'}
                        </button>
                        {message && <div className={`p-3 rounded-lg text-center text-sm font-bold ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{message}</div>}
                    </form>
                </div>

                {/* COLUMNA DERECHA: Dashboard e Inventario */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Mini Dashboard */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex items-center gap-4">
                            <div className="p-3 bg-neutral-100 rounded-xl text-neutral-700"><Package className="w-6 h-6" /></div>
                            <div><p className="text-sm font-bold text-neutral-500">Total Productos</p><p className="text-2xl font-black text-neutral-900">{totalProducts}</p></div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex items-center gap-4">
                            <div className="p-3 bg-red-50 rounded-xl text-red-500"><AlertCircle className="w-6 h-6" /></div>
                            <div><p className="text-sm font-bold text-neutral-500">Sin Stock</p><p className="text-2xl font-black text-neutral-900">{outOfStock}</p></div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm border border-neutral-100 flex items-center gap-4">
                            <div className="p-3 bg-orange-50 rounded-xl text-orange-500"><Tags className="w-6 h-6" /></div>
                            <div><p className="text-sm font-bold text-neutral-500">Categorías</p><p className="text-2xl font-black text-neutral-900">{uniqueCategories}</p></div>
                        </div>
                    </div>

                    {/* Gestor de Inventario */}
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-100">
                        <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                            <h2 className="text-xl font-black text-neutral-900">Inventario</h2>

                            {/* Buscador */}
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-lg text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scroller-hidden">
                            {filteredProducts.length === 0 ? (
                                <p className="text-center text-neutral-500 py-10 text-sm font-medium">No se encontraron productos.</p>
                            ) : filteredProducts.map(product => (
                                <div key={product.id} className={`flex items-center justify-between p-3 border rounded-xl transition-all hover:shadow-sm ${product.in_stock ? 'border-neutral-200 bg-white' : 'border-red-100 bg-red-50/50 grayscale-[0.2]'}`}>
                                    <div className="flex items-center gap-4 overflow-hidden">
                                        {product.image_url && <img src={product.image_url} alt={product.name} className="w-14 h-14 object-cover rounded-lg bg-neutral-100 flex-shrink-0" />}
                                        <div className="min-w-0">
                                            <p className="font-bold text-neutral-900 text-sm truncate">{product.name}</p>
                                            <p className="text-neutral-500 text-xs mt-0.5">${product.price.toLocaleString('es-AR')} {product.category && `• ${product.category}`}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                        <button onClick={() => toggleStock(product.id, product.in_stock)} className={`px-3 py-2 rounded-lg text-xs font-bold transition-colors ${product.in_stock ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                                            {product.in_stock ? 'Pausar' : 'Agotado'}
                                        </button>
                                        <button onClick={() => setEditingProduct(product)} className="p-2 text-neutral-400 hover:text-orange-500 transition-colors bg-white hover:bg-orange-50 rounded-lg" title="Editar">
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(product.id, product.image_url)} className="p-2 text-neutral-400 hover:text-red-500 transition-colors bg-white hover:bg-red-50 rounded-lg" title="Eliminar">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
            <style jsx global>{`.scroller-hidden::-webkit-scrollbar { display: none; } .scroller-hidden { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </main>
    );
}