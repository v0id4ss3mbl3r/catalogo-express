"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function SettingsTab({ onSettingsUpdated }: { onSettingsUpdated: () => void }) {
    const [storeSettings, setStoreSettings] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data } = await supabase.from('store_settings').select('*').eq('id', 1).single();
        if (data) setStoreSettings(data);
    };

    const handleSettingsSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const formData = new FormData(e.currentTarget);
        const storeName = formData.get('store_name') as string;
        const themeColor = formData.get('theme_color') as string;
        const file = formData.get('logo') as File;

        // Nuevos campos del Home
        const heroActive = formData.get('hero_active') === 'on';
        const heroTitle = formData.get('hero_title') as string;
        const heroSubtitle = formData.get('hero_subtitle') as string;
        const badgesActive = formData.get('badges_active') === 'on';

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

            const { error } = await supabase.from('store_settings').update({
                store_name: storeName,
                theme_color: themeColor,
                logo_url: logoUrl,
                hero_active: heroActive,
                hero_title: heroTitle,
                hero_subtitle: heroSubtitle,
                badges_active: badgesActive
            }).eq('id', 1);

            if (error) throw error;

            setMessage('¡Configuración guardada!');
            fetchSettings();
            onSettingsUpdated(); // Le avisa al Layout que actualice el logo lateral
        } catch (error: any) {
            setMessage(`Error: ${error.message}`);
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    if (!storeSettings) return <div className="animate-pulse flex space-x-4"><div className="flex-1 space-y-6 py-1"><div className="h-2 bg-neutral-200 rounded"></div><div className="space-y-3"><div className="grid grid-cols-3 gap-4"><div className="h-2 bg-neutral-200 rounded col-span-2"></div><div className="h-2 bg-neutral-200 rounded col-span-1"></div></div><div className="h-2 bg-neutral-200 rounded"></div></div></div></div>;

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-black text-neutral-900 mb-8">Personalizar Tienda</h2>

            <form onSubmit={handleSettingsSubmit} className="space-y-8">

                {/* SECCIÓN 1: IDENTIDAD */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-100">
                    <h3 className="text-lg font-black text-neutral-900 mb-6 border-b border-neutral-100 pb-2">Identidad de la Marca</h3>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-neutral-700 mb-2">Nombre de la Tienda</label>
                            <input name="store_name" type="text" defaultValue={storeSettings.store_name} required className="w-full p-3 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-neutral-700 mb-2">Color Principal (Tema)</label>
                            <div className="flex items-center gap-4">
                                <input name="theme_color" type="color" defaultValue={storeSettings.theme_color || '#f97316'} className="w-14 h-14 rounded cursor-pointer border-0 p-0" />
                                <span className="text-sm text-neutral-500">Se aplicará a los botones y elementos destacados.</span>
                            </div>
                        </div>
                        <div className="pt-2">
                            <label className="block text-sm font-bold text-neutral-700 mb-2">Logo de la Marca</label>
                            {storeSettings.logo_url && (
                                <div className="mb-4 relative inline-block">
                                    <img src={storeSettings.logo_url} alt="Logo actual" className="h-16 w-auto rounded-lg border border-neutral-200 p-2 bg-neutral-50" />
                                </div>
                            )}
                            <input name="logo" type="file" accept="image/*" className="w-full p-2 border border-neutral-200 rounded-lg text-neutral-900 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-neutral-100 file:text-neutral-700 hover:file:bg-neutral-200" />
                        </div>
                    </div>
                </div>

                {/* SECCIÓN 2: PÁGINA DE INICIO (HOME) */}
                <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-neutral-100">
                    <h3 className="text-lg font-black text-neutral-900 mb-6 border-b border-neutral-100 pb-2">Secciones del Inicio (Home)</h3>
                    <div className="space-y-6">

                        <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-100">
                            <label className="flex items-center gap-3 cursor-pointer mb-4">
                                <input type="checkbox" name="hero_active" defaultChecked={storeSettings.hero_active} className="w-5 h-5 accent-neutral-900 rounded cursor-pointer" />
                                <span className="font-bold text-neutral-900">Mostrar Banner Principal (Hero)</span>
                            </label>
                            <div className="space-y-4 pl-8">
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Título del Banner</label>
                                    <input name="hero_title" type="text" defaultValue={storeSettings.hero_title} className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">Subtítulo del Banner</label>
                                    <textarea name="hero_subtitle" rows={2} defaultValue={storeSettings.hero_subtitle} className="w-full p-2.5 border border-neutral-200 rounded-lg text-neutral-900 outline-none focus:ring-2 focus:ring-neutral-900"></textarea>
                                </div>
                            </div>
                        </div>

                        <div className="bg-neutral-50 p-5 rounded-xl border border-neutral-100">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" name="badges_active" defaultChecked={storeSettings.badges_active} className="w-5 h-5 accent-neutral-900 rounded cursor-pointer" />
                                <div>
                                    <span className="font-bold text-neutral-900 block">Mostrar Beneficios de Confianza</span>
                                    <span className="text-sm text-neutral-500 block">La barra con los íconos de Envíos, Pagos y Seguridad.</span>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* BOTÓN GUARDAR */}
                <div className="sticky bottom-6 z-10">
                    <button type="submit" disabled={loading} className="w-full bg-neutral-900 text-white font-black py-4 rounded-xl hover:bg-neutral-800 transition-colors shadow-xl">
                        {loading ? 'Guardando...' : 'Guardar Configuración'}
                    </button>
                    {message && <div className={`absolute -top-12 left-0 right-0 p-3 rounded-lg text-center text-sm font-bold shadow-lg backdrop-blur-md ${message.includes('Error') ? 'bg-red-500/90 text-white' : 'bg-green-500/90 text-white'}`}>{message}</div>}
                </div>
            </form>
        </div>
    );
}