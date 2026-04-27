"use client";

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicializamos el cliente de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AdminPanel() {
    const [isAuthed, setIsAuthed] = useState(false);
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Lógica de la contraseña
    const checkPassword = (e: React.FormEvent) => {
        e.preventDefault();
        // ACÁ CAMBIÁS TU CONTRASEÑA
        if (password === 'v0id2026') {
            setIsAuthed(true);
        } else {
            alert('Contraseña incorrecta');
            setPassword('');
        }
    };

    // Lógica de carga de producto
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

            // 1. Subir la imagen al Storage de Supabase
            if (file && file.size > 0) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                // Obtener la URL pública de la imagen que acabamos de subir
                const { data: publicUrlData } = supabase.storage
                    .from('product-images')
                    .getPublicUrl(fileName);

                imageUrl = publicUrlData.publicUrl;
            }

            // 2. Guardar los datos en la tabla products
            const { error: dbError } = await supabase
                .from('products')
                .insert([{
                    name,
                    price: parseFloat(price),
                    description,
                    image_url: imageUrl
                }]);

            if (dbError) throw dbError;

            setMessage('¡Producto cargado impecable!');
            form.reset();
        } catch (error: any) {
            console.error(error);
            setMessage(`Error al cargar: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Pantalla de Login
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
                        className="w-full mb-4 p-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900"
                        required
                    />
                    <button type="submit" className="w-full bg-neutral-900 text-white font-semibold py-3 rounded-lg hover:bg-neutral-800 transition-colors">
                        Entrar
                    </button>
                </form>
            </main>
        );
    }

    // Pantalla del Panel de Administración
    return (
        <main className="min-h-screen bg-neutral-50 p-6 sm:p-10">
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-neutral-100">
                <h1 className="text-3xl font-bold text-neutral-900 mb-8 tracking-tight">Cargar Nuevo Producto</h1>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre del producto</label>
                        <input name="name" type="text" required className="w-full p-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="Ej: Casco LS2" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Precio (en pesos)</label>
                        <input name="price" type="number" required className="w-full p-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="Ej: 150000" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Descripción (opcional)</label>
                        <textarea name="description" rows={3} className="w-full p-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-900" placeholder="Detalles del producto..."></textarea>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-700 mb-1">Imagen del producto</label>
                        <input name="image" type="file" accept="image/*" required className="w-full p-3 border border-neutral-200 rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200" />
                    </div>

                    <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white font-bold py-4 rounded-lg hover:bg-neutral-800 transition-colors disabled:bg-neutral-400">
                        {loading ? 'Subiendo producto...' : 'Publicar Producto'}
                    </button>

                    {message && (
                        <div className={`p-4 rounded-lg text-center font-medium ${message.includes('Error') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {message}
                        </div>
                    )}
                </form>
            </div>
        </main>
    );
}