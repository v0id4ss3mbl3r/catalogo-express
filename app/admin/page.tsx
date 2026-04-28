"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Package, Tags, Settings, LogOut } from 'lucide-react';

// Importamos las pestañas modulares (Crearemos las de productos y categorías en el próximo paso)
import SettingsTab from './tabs/SettingsTab';
import ProductsTab from './tabs/ProductsTab';
import CategoriesTab from './tabs/CategoriesTab';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export default function AdminLayout() {
    const [isAuthed, setIsAuthed] = useState(false);
    const [password, setPassword] = useState('');
    const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'settings'>('settings'); // Temporalmente arranca en settings
    const [storeSettings, setStoreSettings] = useState<any>(null);

    useEffect(() => {
        if (isAuthed) fetchHeaderSettings();
    }, [isAuthed]);

    const fetchHeaderSettings = async () => {
        const { data } = await supabase.from('store_settings').select('store_name, logo_url').eq('id', 1).single();
        if (data) setStoreSettings(data);
    };

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

            {/* SIDEBAR MODULAR */}
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

            {/* CONTENEDOR DINÁMICO */}
            <div className="flex-grow p-6 sm:p-10 w-full overflow-hidden">
                {activeTab === 'settings' && <SettingsTab onSettingsUpdated={fetchHeaderSettings} />}
                {activeTab === 'products' && <ProductsTab />}
                {activeTab === 'categories' && <CategoriesTab />}
            </div>

            <style jsx global>{`.scroller-hidden::-webkit-scrollbar { display: none; } .scroller-hidden { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </main>
    );
}