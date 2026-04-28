"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, ShoppingCart, Trash2, X, CheckCircle2, ChevronDown, Truck, CreditCard, ShieldCheck, Instagram, Facebook } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const WHATSAPP_NUMBERS = [
  { id: '1', label: 'Ventas - Línea 1', phone: '5492235922077' },
  { id: '2', label: 'Ventas - Línea 2', phone: '5492932500926' }
];

export default function CatalogoEmpretiendaStyle() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  const [cart, setCart] = useState<{ [key: string]: any }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form' | 'processing' | 'success'>('cart');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState({
    name: '', phone: '', notes: '', selectedSeller: WHATSAPP_NUMBERS[0].phone
  });

  useEffect(() => {
    fetchInitialData();
    const savedCart = localStorage.getItem('mi_catalogo_cart');
    if (savedCart) setCart(JSON.parse(savedCart));
  }, []);

  useEffect(() => {
    localStorage.setItem('mi_catalogo_cart', JSON.stringify(cart));
  }, [cart]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: settings } = await supabase.from('store_settings').select('*').eq('id', 1).single();
      if (settings) setStoreSettings(settings);

      const { data: prods } = await supabase.from('products').select('*').eq('is_active', true);
      if (prods) setProducts(prods);

      const { data: cats } = await supabase.from('categories').select('*').order('name');
      if (cats) setCategories(cats);
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const themeColor = storeSettings?.theme_color || '#171717';

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addToCart = (product: any) => {
    setCart(prev => ({
      ...prev,
      [product.id]: prev[product.id] ? { ...prev[product.id], quantity: prev[product.id].quantity + 1 } : { ...product, quantity: 1 }
    }));
    showToast(`¡${product.name} agregado!`);
  };

  const removeFromCart = (id: number) => {
    setCart(prev => { const newCart = { ...prev }; delete newCart[id]; return newCart; });
  };

  const updateQuantity = (id: number, change: number) => {
    setCart(prev => {
      const newQuantity = (prev[id].quantity || 1) + change;
      if (newQuantity <= 0) { const newCart = { ...prev }; delete newCart[id]; return newCart; }
      return { ...prev, [id]: { ...prev[id], quantity: newQuantity } };
    });
  };

  const cartItemsCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutStep('processing');
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerData, cart: Object.values(cart), cartTotal })
      });
      if (!response.ok) throw new Error('Error de red');
      setCart({});
      setCheckoutStep('success');
    } catch (error) {
      alert("Hubo un error al enviar el pedido. Revisá tu conexión e intentá de nuevo.");
      setCheckoutStep('form');
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery === '' || product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === null || product.category_id === activeCategory;
    return matchesSearch && matchesCategory;
  }).sort((a, b) => {
    if (sortBy === 'price_asc') return a.price - b.price;
    if (sortBy === 'price_desc') return b.price - a.price;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <main className="min-h-screen bg-neutral-50 font-sans text-neutral-900 flex flex-col">

      <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 text-white px-6 py-3 rounded-full shadow-xl font-bold text-sm transition-all duration-300 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`} style={{ backgroundColor: themeColor }}>
        {toastMessage}
      </div>

      {/* HEADER */}
      <header className="bg-white border-b border-neutral-100 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 grid grid-cols-3 items-center">
          <div className="relative w-full max-w-xs group hidden sm:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 h-5 w-5 transition-colors group-focus-within:text-neutral-900" />
            <input type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-neutral-100 border-transparent rounded-xl text-sm outline-none transition-all focus:bg-white focus:border-neutral-300 focus:ring-4 focus:ring-neutral-100" />
          </div>

          <div className="flex justify-start sm:justify-center items-center cursor-pointer col-span-2 sm:col-span-1" onClick={() => { setActiveCategory(null); setSearchQuery(''); }}>
            {storeSettings?.logo_url ? (
              <img src={storeSettings.logo_url} alt={storeSettings.store_name} className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm transition-transform hover:scale-105" />
            ) : (
              <h1 className="text-2xl font-black tracking-tight uppercase">{storeSettings?.store_name || 'Mi Tienda'}</h1>
            )}
          </div>

          <div className="flex justify-end">
            <button onClick={() => { setIsCartOpen(true); setCheckoutStep('cart'); }} className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all hover:bg-neutral-100 active:scale-95 group">
              <ShoppingCart className="h-6 w-6 text-neutral-700 group-hover:text-neutral-900" />
              <span className="font-bold text-sm hidden lg:block text-neutral-700 group-hover:text-neutral-900">Mi Carrito</span>
              {cartItemsCount > 0 && <span className="absolute -top-1 -right-1 text-white text-[10px] font-black h-5 w-5 flex items-center justify-center rounded-full shadow-md animate-bounce" style={{ backgroundColor: themeColor }}>{cartItemsCount}</span>}
            </button>
          </div>
        </div>

        {/* NAVEGACIÓN */}
        {categories.length > 0 && (
          <nav className="border-t border-neutral-100 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
              <ul className="flex items-center gap-6 overflow-x-auto scroller-hidden h-14">
                <li>
                  <button onClick={() => setActiveCategory(null)} className={`whitespace-nowrap text-sm font-bold transition-colors relative h-14 flex items-center ${activeCategory === null ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}>
                    Todos los productos
                    {activeCategory === null && <span className="absolute bottom-0 left-0 w-full h-1 rounded-t-md" style={{ backgroundColor: themeColor }}></span>}
                  </button>
                </li>
                {categories.map(cat => (
                  <li key={cat.id}>
                    <button onClick={() => setActiveCategory(cat.id)} className={`whitespace-nowrap text-sm font-bold transition-colors relative h-14 flex items-center ${activeCategory === cat.id ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}>
                      {cat.name}
                      {activeCategory === cat.id && <span className="absolute bottom-0 left-0 w-full h-1 rounded-t-md" style={{ backgroundColor: themeColor }}></span>}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        )}
      </header>

      <div className="flex-grow">
        {/* HERO BANNER (Se oculta si se está buscando algo o filtrando por categoría) */}
        {!searchQuery && activeCategory === null && (
          <>
            <section className="relative bg-neutral-900 text-white overflow-hidden">
              {/* Overlay sutil usando el color principal */}
              <div className="absolute inset-0 opacity-20" style={{ backgroundColor: themeColor }}></div>
              <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-10">
                <div className="max-w-2xl">
                  <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 leading-tight">La mejor selección en un solo lugar.</h2>
                  <p className="text-lg text-neutral-300 mb-8 font-medium">Explorá nuestro catálogo con las últimas novedades y ofertas exclusivas pensadas para vos.</p>
                  <button
                    onClick={() => window.scrollTo({ top: 600, behavior: 'smooth' })}
                    className="text-neutral-900 bg-white px-8 py-3.5 rounded-xl font-black hover:bg-neutral-100 transition-all active:scale-95 shadow-xl inline-flex items-center gap-2"
                  >
                    Ver Catálogo <ChevronDown className="w-5 h-5" />
                  </button>
                </div>
                {/* Elemento decorativo visual */}
                <div className="hidden sm:flex w-72 h-72 rounded-full border-8 border-white/10 items-center justify-center relative shadow-2xl">
                  <div className="absolute w-56 h-56 rounded-full blur-2xl opacity-50" style={{ backgroundColor: themeColor }}></div>
                  <ShoppingCart className="w-32 h-32 text-white relative z-10 opacity-90" />
                </div>
              </div>
            </section>

            {/* TRUST BADGES */}
            <section className="bg-white border-b border-neutral-100">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10 divide-y sm:divide-y-0 sm:divide-x divide-neutral-100">
                <div className="flex flex-col items-center text-center pt-4 sm:pt-0">
                  <Truck className="w-8 h-8 mb-3" style={{ color: themeColor }} />
                  <h4 className="font-black text-neutral-900 text-sm uppercase tracking-wide">Envíos a todo el país</h4>
                  <p className="text-sm text-neutral-500 mt-1">Llegamos directo a tu puerta.</p>
                </div>
                <div className="flex flex-col items-center text-center pt-6 sm:pt-0">
                  <CreditCard className="w-8 h-8 mb-3" style={{ color: themeColor }} />
                  <h4 className="font-black text-neutral-900 text-sm uppercase tracking-wide">Múltiples medios de pago</h4>
                  <p className="text-sm text-neutral-500 mt-1">Efectivo, transferencia y tarjetas.</p>
                </div>
                <div className="flex flex-col items-center text-center pt-6 sm:pt-0">
                  <ShieldCheck className="w-8 h-8 mb-3" style={{ color: themeColor }} />
                  <h4 className="font-black text-neutral-900 text-sm uppercase tracking-wide">Compra 100% Segura</h4>
                  <p className="text-sm text-neutral-500 mt-1">Protegemos todos tus datos.</p>
                </div>
              </div>
            </section>
          </>
        )}

        {/* BARRA DE CONTROL (Filtros y Ordenamiento) */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-neutral-900">
              {searchQuery ? `Resultados para "${searchQuery}"` : activeCategory ? categories.find(c => c.id === activeCategory)?.name : 'Catálogo Completo'}
            </h2>
            <p className="text-neutral-500 text-sm mt-1 font-medium">{filteredProducts.length} productos disponibles</p>
          </div>

          <div className="relative w-full sm:w-auto">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="w-full sm:w-auto appearance-none bg-white border border-neutral-200 text-neutral-700 font-bold text-sm py-2.5 pl-4 pr-10 rounded-xl outline-none cursor-pointer hover:border-neutral-300 transition-colors focus:ring-4 focus:ring-neutral-100">
              <option value="newest">Más Recientes</option>
              <option value="price_asc">Menor Precio</option>
              <option value="price_desc">Mayor Precio</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          </div>
        </div>

        {/* GRILLA DE PRODUCTOS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-20 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
          {loading ? (
            [...Array(10)].map((_, i) => <div key={i} className="aspect-[3/4] bg-neutral-200 rounded-2xl animate-pulse"></div>)
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full py-20 text-center">
              <ShoppingCart className="w-16 h-16 text-neutral-200 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-neutral-900">No hay productos para mostrar.</h3>
              <p className="text-neutral-500 mt-2">Intentá con otra búsqueda o categoría.</p>
            </div>
          ) : filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group ${!product.in_stock ? 'opacity-75' : 'cursor-pointer'}`}
              onClick={() => product.in_stock && setSelectedProduct(product)}
            >
              <div className="aspect-square bg-white w-full relative overflow-hidden flex items-center justify-center p-4">
                {!product.in_stock && (
                  <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center backdrop-blur-[2px]">
                    <span className="bg-neutral-900 text-white font-black text-xs tracking-widest uppercase px-4 py-1.5 rounded-full shadow-lg">Agotado</span>
                  </div>
                )}
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <span className="absolute top-3 left-3 z-10 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md shadow-sm" style={{ backgroundColor: themeColor }}>
                    {Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)}% OFF
                  </span>
                )}
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="text-neutral-300 text-xs font-bold bg-neutral-50 w-full h-full flex items-center justify-center rounded-xl">Sin imagen</div>
                )}
              </div>

              <div className="p-4 text-center flex flex-col flex-grow bg-neutral-50/50 z-10 border-t border-neutral-50">
                <h3 className="text-sm font-bold text-neutral-800 line-clamp-2 min-h-[40px] leading-tight transition-colors">
                  {product.name}
                </h3>

                <div className="mt-2 mb-4 flex flex-col items-center justify-center">
                  <p className="text-lg font-black text-neutral-900">
                    ${product.price.toLocaleString('es-AR')}
                  </p>
                  {product.compare_at_price && product.compare_at_price > product.price ? (
                    <p className="text-xs text-neutral-400 line-through font-bold mt-0.5">
                      ${product.compare_at_price.toLocaleString('es-AR')}
                    </p>
                  ) : <div className="h-4"></div>}
                </div>

                <button
                  disabled={!product.in_stock}
                  onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                  className={`mt-auto w-full text-center text-white text-xs font-black py-3 rounded-xl transition-all active:scale-95 ${!product.in_stock ? 'bg-neutral-200 text-neutral-400 hover:scale-100 cursor-not-allowed' : 'hover:opacity-90 shadow-md'}`}
                  style={product.in_stock ? { backgroundColor: themeColor } : {}}
                >
                  {product.in_stock ? 'Agregar al carrito' : 'Sin Stock'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER PROFESIONAL */}
      <footer className="bg-white border-t border-neutral-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            {storeSettings?.logo_url ? (
              <img src={storeSettings.logo_url} alt="Logo" className="h-10 w-auto object-contain mb-4 filter grayscale opacity-80" />
            ) : (
              <h2 className="text-2xl font-black uppercase tracking-tight text-neutral-800 mb-4">{storeSettings?.store_name || 'Mi Tienda'}</h2>
            )}
            <p className="text-neutral-500 text-sm leading-relaxed max-w-sm">
              La mejor plataforma de compras ágiles. Seleccioná lo que buscás y completá tu pedido directamente de forma segura.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="#" className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"><Facebook className="w-5 h-5" /></a>
            </div>
          </div>

          <div>
            <h4 className="font-black text-neutral-900 mb-4 uppercase text-sm tracking-wide">Navegación</h4>
            <ul className="space-y-3 text-sm text-neutral-500 font-medium">
              <li><a href="#" className="hover:text-neutral-900 transition-colors">Inicio</a></li>
              <li><a href="#" className="hover:text-neutral-900 transition-colors">Todos los productos</a></li>
              <li><a href="#" className="hover:text-neutral-900 transition-colors">Preguntas Frecuentes</a></li>
              <li><a href="#" className="hover:text-neutral-900 transition-colors">Contacto</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-neutral-900 mb-4 uppercase text-sm tracking-wide">Contacto</h4>
            <ul className="space-y-3 text-sm text-neutral-500 font-medium">
              <li>Ventas: {WHATSAPP_NUMBERS[0].phone}</li>
              <li>Soporte: {WHATSAPP_NUMBERS[1].phone}</li>
              <li>Lunes a Viernes de 9 a 18hs.</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-neutral-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-neutral-400 text-xs font-bold">
              © {new Date().getFullYear()} {storeSettings?.store_name || 'Mi Tienda'}. Todos los derechos reservados.
            </p>
            <p className="text-neutral-400 text-xs font-bold">
              Checkout rápido vía WhatsApp.
            </p>
          </div>
        </div>
      </footer>

      {/* MODAL DETALLE DE PRODUCTO */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 opacity-100 transition-opacity">
          <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}></div>

          <div className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row transform transition-transform scale-100 max-h-[90vh]">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur p-2 rounded-full text-neutral-500 hover:text-neutral-900 transition-colors shadow-sm">
              <X className="h-5 w-5" />
            </button>

            <div className="w-full md:w-1/2 bg-white p-6 sm:p-10 flex items-center justify-center min-h-[300px]">
              {selectedProduct.image_url ? (
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-contain mix-blend-multiply" />
              ) : (
                <div className="text-neutral-400 font-bold bg-neutral-50 w-full h-full flex items-center justify-center rounded-2xl">Sin imagen</div>
              )}
            </div>

            <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col overflow-y-auto scroller-hidden bg-neutral-50/50">
              <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 leading-tight mb-2">{selectedProduct.name}</h2>

              <div className="flex items-end gap-3 mb-6">
                <p className="text-4xl font-black text-neutral-900">${selectedProduct.price.toLocaleString('es-AR')}</p>
                {selectedProduct.compare_at_price && selectedProduct.compare_at_price > selectedProduct.price && (
                  <p className="text-lg text-neutral-400 line-through font-bold mb-1">${selectedProduct.compare_at_price.toLocaleString('es-AR')}</p>
                )}
              </div>

              <div className="prose prose-sm text-neutral-600 mb-8 whitespace-pre-wrap flex-grow font-medium leading-relaxed">
                {selectedProduct.description ? selectedProduct.description : 'Este producto no tiene descripción adicional.'}
              </div>

              <div className="mt-auto pt-6 border-t border-neutral-200">
                <button
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); setIsCartOpen(true); }}
                  className="w-full text-white font-black py-4 rounded-xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 hover:opacity-90"
                  style={{ backgroundColor: themeColor }}
                >
                  <ShoppingCart className="h-5 w-5" />
                  Agregar al Carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CARRITO / CHECKOUT MODAL */}
      <div className={`fixed inset-0 z-[70] transition-opacity duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-neutral-900/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>

        <div className={`absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6 border-b border-neutral-100 flex items-center justify-between bg-white">
            <h3 className="text-xl font-black text-neutral-900">
              {checkoutStep === 'cart' ? 'Tu Pedido' : checkoutStep === 'form' ? 'Datos de Envío' : checkoutStep === 'processing' ? 'Procesando...' : '¡Listo!'}
            </h3>
            <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-neutral-900 transition-colors p-1 bg-neutral-100 rounded-full">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto scroller-hidden bg-neutral-50/30">
            {checkoutStep === 'cart' && (
              <div className="p-6 space-y-4">
                {cartItemsCount === 0 ? (
                  <div className="flex flex-col items-center justify-center pt-20 text-neutral-400">
                    <ShoppingCart className="h-16 w-16 mb-4 opacity-50" />
                    <p className="font-bold">Tu carrito está vacío.</p>
                  </div>
                ) : Object.values(cart).map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-3 border border-neutral-100 rounded-2xl bg-white shadow-sm">
                    {item.image_url ? <img src={item.image_url} alt={item.name} className="w-16 h-16 object-contain rounded-xl bg-neutral-50 p-1" /> : <div className="w-16 h-16 bg-neutral-100 rounded-xl flex items-center justify-center text-[10px] text-neutral-400 font-bold">Sin foto</div>}
                    <div className="flex-grow min-w-0">
                      <p className="font-bold text-neutral-900 text-sm truncate">{item.name}</p>
                      <p className="font-black text-sm" style={{ color: themeColor }}>${(item.price * item.quantity).toLocaleString('es-AR')}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200 font-black text-neutral-600 transition-colors">-</button>
                        <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center rounded-lg bg-neutral-100 hover:bg-neutral-200 font-black text-neutral-600 transition-colors">+</button>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-neutral-300 hover:text-red-500 p-2 transition-colors">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {checkoutStep === 'form' && (
              <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Tu Nombre</label>
                  <input type="text" required value={customerData.name} onChange={e => setCustomerData({ ...customerData, name: e.target.value })} className="w-full p-3.5 border border-neutral-200 rounded-xl text-neutral-900 outline-none transition-all focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100" placeholder="Ej: Juan Pérez" />
                </div>
                <div>
                  <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Tu Teléfono</label>
                  <input type="tel" required value={customerData.phone} onChange={e => setCustomerData({ ...customerData, phone: e.target.value })} className="w-full p-3.5 border border-neutral-200 rounded-xl text-neutral-900 outline-none transition-all focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100" placeholder="Ej: 549223..." />
                </div>
                <div>
                  <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Enviar pedido a:</label>
                  <select value={customerData.selectedSeller} onChange={e => setCustomerData({ ...customerData, selectedSeller: e.target.value })} className="w-full p-3.5 border border-neutral-200 rounded-xl text-neutral-900 bg-white outline-none font-bold">
                    {WHATSAPP_NUMBERS.map(opt => (
                      <option key={opt.id} value={opt.phone}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-black text-neutral-500 uppercase mb-2">Observaciones</label>
                  <textarea rows={3} value={customerData.notes} onChange={e => setCustomerData({ ...customerData, notes: e.target.value })} className="w-full p-3.5 border border-neutral-200 rounded-xl text-neutral-900 outline-none transition-all focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100" placeholder="Aclaraciones sobre el pedido..."></textarea>
                </div>
              </form>
            )}

            {checkoutStep === 'processing' && (
              <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-6">
                <div className="w-14 h-14 border-4 border-neutral-100 rounded-full animate-spin" style={{ borderTopColor: themeColor }}></div>
                <div>
                  <h3 className="text-xl font-black text-neutral-900">Procesando Envío...</h3>
                  <p className="text-neutral-500 mt-2 text-sm font-medium">Estamos enviando el detalle al sistema.</p>
                </div>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
                <CheckCircle2 className="h-20 w-20 text-green-500" />
                <h3 className="text-2xl font-black text-neutral-900">¡Pedido Confirmado!</h3>
                <p className="text-neutral-500 font-medium">El detalle del pedido fue registrado correctamente.</p>
                <button onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }} className="mt-6 font-bold hover:opacity-80 transition-opacity" style={{ color: themeColor }}>
                  Volver a la tienda
                </button>
              </div>
            )}
          </div>

          {checkoutStep !== 'success' && checkoutStep !== 'processing' && cartItemsCount > 0 && (
            <div className="p-6 border-t border-neutral-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-5">
                <span className="text-neutral-500 font-bold">Total a pagar:</span>
                <span className="text-3xl font-black text-neutral-900">${cartTotal.toLocaleString('es-AR')}</span>
              </div>

              {checkoutStep === 'cart' ? (
                <button
                  onClick={() => setCheckoutStep('form')}
                  className="w-full text-white font-black py-4 rounded-xl transition-all active:scale-95 shadow-lg hover:opacity-90"
                  style={{ backgroundColor: themeColor }}
                >
                  Continuar Compra
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setCheckoutStep('cart')} className="px-5 py-4 font-black text-neutral-500 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors">Atrás</button>
                  <button type="submit" form="checkout-form" className="flex-grow text-white font-black py-4 rounded-xl transition-all active:scale-95 shadow-lg hover:opacity-90" style={{ backgroundColor: themeColor }}>
                    Confirmar Pedido
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .scroller-hidden::-webkit-scrollbar { display: none; }
        .scroller-hidden { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </main>
  );
}