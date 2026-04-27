"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, ShoppingCart, Trash2, X } from 'lucide-react'; // Necesitamos instalar lucide-react

// Inicializar cliente de Supabase (igual que antes)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// CONFIGURACIÓN: Pone acá tu número con código de país (ej: 54911...)
const NUMERO_WHATSAPP = "5491100000000";

export default function CatalogoEmpretiendaStyle() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para Filtros y Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Estado del Carrito: { id: { ...product, quantity: 1 } }
  const [cart, setCart] = useState<{ [key: string]: any }>({});
  const [isCartOpen, setIsCartOpen] = useState(false); // Para mostrar/ocultar el panel lateral

  // 1. Cargar productos y categorías al iniciar
  useEffect(() => {
    fetchInitialData();
    // Cargar carrito del localStorage si existe
    const savedCart = localStorage.getItem('mi_catalogo_cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  // Guardar carrito en localStorage cada vez que cambie
  useEffect(() => {
    localStorage.setItem('mi_catalogo_cart', JSON.stringify(cart));
  }, [cart]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Traer productos ordenados por novedad
      const { data: prods } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (prods) setProducts(prods);

      // Traer categorías únicas (obviando nulos/vacíos)
      const { data: cats } = await supabase.from('products').select('category').not('category', 'is', null).not('category', 'eq', '');
      if (cats) {
        const uniqueCats = [...new Set(cats.map(item => item.category))] as string[];
        setCategories(uniqueCats);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Funciones del Carrito
  const addToCart = (product: any) => {
    setCart(prev => ({
      ...prev,
      [product.id]: prev[product.id]
        ? { ...prev[product.id], quantity: prev[product.id].quantity + 1 }
        : { ...product, quantity: 1 }
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(prev => {
      const newCart = { ...prev };
      delete newCart[id];
      return newCart;
    });
  };

  const updateQuantity = (id: number, change: number) => {
    setCart(prev => {
      const newQuantity = (prev[id].quantity || 1) + change;
      if (newQuantity <= 0) return { ...prev, [id]: undefined }; // Eliminar si llega a 0
      return {
        ...prev,
        [id]: { ...prev[id], quantity: newQuantity }
      };
    });
  };

  const cartItemsCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // 3. Generar enlace de WhatsApp para Checkout
  const generateWhatsAppUrl = () => {
    if (cartItemsCount === 0) return;

    let mensaje = `Hola! Quisiera realizar el siguiente pedido:\n\n`;
    Object.values(cart).forEach((item, index) => {
      mensaje += `${index + 1}. *${item.name}* x ${item.quantity} - $${(item.price * item.quantity).toLocaleString('es-AR')}\n`;
    });
    mensaje += `\n*TOTAL: $${cartTotal.toLocaleString('es-AR')}*`;

    return `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
  };

  // 4. Lógica de Filtrado combinada (Búsqueda + Categoría)
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery === '' || product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === null || product.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-neutral-50 pb-16 relative">

      {/* 5. HEADER (Lupita, Logo centrado, Carrito) */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 sm:h-20 flex items-center justify-between">

          {/* Lupita de Búsqueda (Input interactivo) */}
          <div className="relative flex-grow max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 sm:py-2.5 border border-neutral-200 rounded-lg text-neutral-900 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white text-sm"
            />
          </div>

          {/* Logo (Usamos texto simple por ahora) */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 uppercase tracking-tighter mx-4 text-center">
            Mi Proyecto
          </h1>

          {/* Botón Carrito con contador */}
          <button
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="relative flex items-center gap-2.5 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="font-semibold text-sm hidden sm:inline">Carrito</span>
            {cartItemsCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[11px] font-bold h-5 w-5 flex items-center justify-center rounded-full">
                {cartItemsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 6. NAV DE CATEGORÍAS (Botonera debajo del header) */}
      {categories.length > 0 && (
        <nav className="bg-white border-b border-neutral-100 sticky top-16 sm:top-20 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 overflow-x-auto scroller-hidden">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === null ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Título de Sección */}
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-6">
        <h2 className="text-3xl font-bold text-neutral-950 tracking-tight text-center">
          {activeCategory ? `Productos: ${activeCategory}` : 'Novedades'}
        </h2>
        {searchQuery && (
          <p className="text-center text-neutral-500 mt-1">Resultados para "{searchQuery}"</p>
        )}
      </div>

      {/* 7. GRILLA DE PRODUCTOS (Estilo image_1.png) */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {loading ? (
          // Skeleton simple de carga
          [...Array(10)].map((_, i) => <div key={i} className="aspect-[3/4] bg-neutral-100 rounded-xl animate-pulse"></div>)
        ) : filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-20 text-neutral-500 border border-neutral-100 rounded-xl bg-white">No encontramos productos.</div>
        ) : filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col transition-all hover:shadow-md hover:-translate-y-1 group"
          >
            {/* Imagen centrada y prolija */}
            <div className="aspect-square bg-neutral-50 w-full relative overflow-hidden flex items-center justify-center p-2">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-contain mix-blend-multiply" // Ajusta imagen si es con fondo transparente
                />
              ) : (
                <div className="text-neutral-300 text-xs text-center p-4">Sin imagen</div>
              )}
            </div>

            {/* Info centrada */}
            <div className="p-3 sm:p-4 text-center flex flex-col flex-grow">
              <h3 className="text-sm font-semibold text-neutral-800 line-clamp-2 min-h-[40px]">
                {product.name}
              </h3>
              <p className="text-lg font-bold text-neutral-950 mt-1 mb-3">
                ${product.price.toLocaleString('es-AR')}
              </p>

              {/* Botón Sumar al carrito */}
              <button
                onClick={() => addToCart(product)}
                className="mt-auto w-full text-center bg-neutral-900 text-white text-xs font-semibold py-2.5 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                Sumar al carrito
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 8. PANEL LATERAL DEL CARRITO (Desplegable) */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        {/* Overlay oscuro para cerrar */}
        <div className="absolute inset-0 bg-black/50" onClick={() => setIsCartOpen(false)}></div>

        {/* Contenido del panel */}
        <div className={`absolute right-0 top-0 h-full w-full max-w-sm sm:max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>

          {/* Header Carrito */}
          <div className="p-5 border-b border-neutral-200 flex items-center justify-between">
            <h3 className="text-lg font-bold text-neutral-900">Tu Pedido</h3>
            <button onClick={() => setIsCartOpen(false)} className="text-neutral-500 hover:text-neutral-900">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Listado productos en carrito (con scroll) */}
          <div className="flex-grow p-5 space-y-4 overflow-y-auto scroller-hidden">
            {cartItemsCount === 0 ? (
              <p className="text-center text-neutral-500 pt-10">Tu carrito está vacío.</p>
            ) : Object.values(cart).filter(Boolean).map(item => (
              <div key={item.id} className="flex items-center gap-4 p-3 border border-neutral-100 rounded-lg bg-neutral-50">
                {item.image_url && <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded bg-white flex-shrink-0" />}
                <div className="flex-grow min-w-0">
                  <p className="font-semibold text-neutral-900 text-sm truncate">{item.name}</p>
                  <p className="text-neutral-950 font-bold text-sm">${(item.price * item.quantity).toLocaleString('es-AR')}</p>

                  {/* Controles de cantidad */}
                  <div className="flex items-center gap-2.5 mt-1.5">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 flex items-center justify-center border border-neutral-300 rounded text-neutral-700 bg-white hover:bg-neutral-100">-</button>
                    <span className="text-sm font-bold text-neutral-900 min-w-[20px] text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 flex items-center justify-center border border-neutral-300 rounded text-neutral-700 bg-white hover:bg-neutral-100">+</button>
                  </div>
                </div>
                <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 flex-shrink-0 p-1">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Resumen y Botón WhatsApp Checkout */}
          {cartItemsCount > 0 && (
            <div className="p-5 border-t border-neutral-200 bg-white mt-auto space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">Total:</span>
                <span className="text-2xl font-black text-neutral-950">${cartTotal.toLocaleString('es-AR')}</span>
              </div>
              <a
                href={generateWhatsAppUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-orange-500 text-white font-bold py-4 rounded-xl hover:bg-orange-600 transition-colors text-base"
              >
                Hacer Pedido por WhatsApp
              </a>
              <p className="text-center text-xs text-neutral-400">Te enviaremos a WhatsApp para confirmar los detalles.</p>
            </div>
          )}
        </div>
      </div>

      {/* 9. FOOTER BÁSICO */}
      <footer className="mt-20 border-t border-neutral-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-10 text-center text-neutral-500 text-sm">
          <p className="font-bold text-neutral-900 mb-2 uppercase tracking-wide text-xs">Mi Proyecto Catálogo</p>
          <p>© 2026 - Todos los derechos reservados.</p>
          <p className="mt-1">Expreso rápido por WhatsApp.</p>
        </div>
      </footer>

      {/* ESTILOS CSS EXTRA (Para ocultar scrollbars) */}
      <style jsx global>{`
        .scroller-hidden::-webkit-scrollbar { display: none; }
        .scroller-hidden { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

    </main>
  );
}