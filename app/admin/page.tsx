"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AdminPanel() {
    const [isAuthed, setIsAuthed] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [products, setProducts] = useState<any[]>([]);

    useEffect(() => {
        if (isAuthed) fetchProducts();
    }, [isAuthed]);

    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (data) setProducts(data);
    };

    const checkPassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === 'v0id2026') { // Tu contraseña
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
            let imageUrl = '';
            if (file && file.size > 0) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
                if (uploadError) throw uploadError;
                const { data: publicUrlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
                imageUrl = publicUrlData.publicUrl;
            }

            const { error: dbError } = await supabase
                .from('products')
                .insert([{ name, price: parseFloat(price), description, category, image_url: imageUrl, in_stock: true }]);

            if (dbError) throw dbError;

            setMessage('¡Producto publicado con éxito!');
            form.reset();
            fetchProducts();
        } catch (error: any) {
            setMessage(`Error al cargar: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Seguro que querés eliminar este producto definitivamente?')) return;
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (!error) fetchProducts();
    };

    const toggleStock = async (id: number, currentStock: boolean) => {
        const { error } = await supabase.from('products').update({ in_stock: !currentStock }).eq('id', id);
        if (!error) fetchProducts();
    };

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
            <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Formulario */}
                <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-100 h-fit">
                    <h2 className="text-xl font-black text-neutral-900 mb-6">Nuevo Producto</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nombre</label>
                            <input name="name" type="text" required className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 focus:ring-2 focus:ring-orange-500 outline-none" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Precio ($)</label>
                                <input name="price" type="number" required className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 focus:ring-2 focus:ring-orange-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Categoría</label>
                                <input name="category" type="text" className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Ej: Ropa" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Descripción</label>
                            <textarea name="description" rows={3} className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 focus:ring-2 focus:ring-orange-500 outline-none"></textarea>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Imagen</label>
                            <input name="image" type="file" accept="image/*" required className="w-full p-2 border border-neutral-200 rounded-lg text-neutral-900 text-sm file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200" />
                        </div>
                        <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white font-bold py-3 rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-400 mt-2">
                            {loading ? 'Subiendo...' : 'Publicar Producto'}
                        </button>
                        {message && <div className={`p-3 rounded-lg text-center text-sm font-bold ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{message}</div>}
                    </form>
                </div>

                {/* Listado / Gestión */}
                <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-100">
                    <h2 className="text-xl font-black text-neutral-900 mb-6">Inventario ({products.length})</h2>
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scroller-hidden">
                        {products.map(product => (
                            <div key={product.id} className={`flex items-center justify-between p-3 border rounded-xl transition-colors ${product.in_stock ? 'border-neutral-200 bg-white' : 'border-red-100 bg-red-50/30 opacity-75'}`}>
                                <div className="flex items-center gap-4 overflow-hidden">
                                    {product.image_url && <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded-lg bg-neutral-100 flex-shrink-0" />}
                                    <div className="min-w-0">
                                        <p className="font-bold text-neutral-900 text-sm truncate">{product.name}</p>
                                        <p className="text-neutral-500 text-xs">${product.price} {product.category && `• ${product.category}`}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                    <button onClick={() => toggleStock(product.id, product.in_stock)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${product.in_stock ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}>
                                        {product.in_stock ? 'Pausar' : 'Agotado'}
                                    </button>
                                    <button onClick={() => handleDelete(product.id)} className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
            <style jsx global>{`.scroller-hidden::-webkit-scrollbar { display: none; } .scroller-hidden { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </main>
    );
}