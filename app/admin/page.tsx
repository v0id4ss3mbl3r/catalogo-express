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

    // Cargar productos al iniciar
    useEffect(() => {
        if (isAuthed) {
            fetchProducts();
        }
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
                .insert([{ name, price: parseFloat(price), description, image_url: imageUrl }]);

            if (dbError) throw dbError;

            setMessage('¡Producto cargado impecable!');
            form.reset();
            fetchProducts(); // Refresca la lista al cargar uno nuevo
        } catch (error: any) {
            setMessage(`Error al cargar: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Seguro que querés eliminar este producto?')) return;

        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
            alert('Error al eliminar');
        } else {
            fetchProducts();
        }
    };

    if (!isAuthed) {
        return (
            <main className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
                <form onSubmit={checkPassword} className="bg-white p-8 rounded-xl shadow-sm border border-neutral-100 max-w-sm w-full">
                    <h1 className="text-2xl font-bold text-neutral-900 mb-6 text-center">Acceso Restringido</h1>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Contraseña"
                        className="w-full mb-4 p-3 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        required
                    />
                    <button type="submit" className="w-full bg-neutral-900 text-white font-semibold py-3 rounded-lg hover:bg-neutral-800 transition-colors">
                        Entrar
                    </button>
                </form>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-neutral-50 p-6 sm:p-10">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">

                {/* Formulario de Carga */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-neutral-100 h-fit">
                    <h2 className="text-2xl font-bold text-neutral-900 mb-6 tracking-tight">Cargar Nuevo Producto</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre</label>
                            <input name="name" type="text" required className="w-full p-3 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Precio</label>
                            <input name="price" type="number" required className="w-full p-3 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Descripción</label>
                            <textarea name="description" rows={3} className="w-full p-3 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900"></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-neutral-700 mb-1">Imagen</label>
                            <input name="image" type="file" accept="image/*" required className="w-full p-3 border border-neutral-200 rounded-lg text-neutral-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200" />
                        </div>

                        <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white font-bold py-3 rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-400">
                            {loading ? 'Subiendo...' : 'Publicar Producto'}
                        </button>

                        {message && (
                            <div className={`p-4 rounded-lg text-center text-sm font-medium ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                {message}
                            </div>
                        )}
                    </form>
                </div>

                {/* Gestor de Productos */}
                <div className="bg-white p-8 rounded-xl shadow-sm border border-neutral-100">
                    <h2 className="text-2xl font-bold text-neutral-900 mb-6 tracking-tight">Gestión de Catálogo</h2>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                        {products.length === 0 ? (
                            <p className="text-neutral-500 text-sm">No hay productos cargados todavía.</p>
                        ) : (
                            products.map(product => (
                                <div key={product.id} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        {product.image_url && (
                                            <img src={product.image_url} alt={product.name} className="w-12 h-12 object-cover rounded bg-neutral-100 flex-shrink-0" />
                                        )}
                                        <div className="min-w-0">
                                            <p className="font-semibold text-neutral-900 text-sm truncate">{product.name}</p>
                                            <p className="text-neutral-500 text-xs">${product.price}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className="ml-3 px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-semibold transition-colors flex-shrink-0"
                                    >
                                        Borrar
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </main>
    );
}