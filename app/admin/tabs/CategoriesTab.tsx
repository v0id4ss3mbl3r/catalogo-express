"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Trash2 } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function CategoriesTab() {
    const [loading, setLoading] = useState(false);
    const [categories, setCategories] = useState<any[]>([]);

    useEffect(() => {
        fetchCategories();
    }, []);

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

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-100 h-fit">
                <h2 className="text-xl font-black text-neutral-900 mb-6">Crear Categoría</h2>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Nombre de la Categoría</label>
                        <input name="name" type="text" required className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Depende de (Categoría Padre)</label>
                        <select name="parent_id" className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 bg-white outline-none focus:ring-2 focus:ring-neutral-900">
                            <option value="">Ninguna (Es categoría principal)</option>
                            {flatCategories.map(c => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                        </select>
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white font-bold py-3.5 rounded-lg hover:bg-neutral-800 transition-colors shadow-md">
                        {loading ? 'Guardando...' : 'Guardar Categoría'}
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
    );
}