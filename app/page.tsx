"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Search, ShoppingCart, Trash2, X, CheckCircle2 } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Tus números configurados y listos para usar
const WHATSAPP_NUMBERS = [
  { id: '1', label: 'Ventas - Línea 1', phone: '5492235922077' },
  { id: '2', label: 'Ventas - Línea 2', phone: '5492932500926' }
];

export default function CatalogoEmpretiendaStyle() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const [cart, setCart] = useState<{ [key: string]: any }>({});
  const [isCartOpen, setIsCartOpen] = useState(false);

  // ESTADO FALTANTE CORREGIDO: Para manejar el modal de detalles
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);

  // Estados para el flujo de Checkout y UI
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'form' | 'success'>('cart');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Datos del cliente
  const [customerData, setCustomerData] = useState({
    name: '',
    phone: '',
    notes: '',
    selectedSeller: WHATSAPP_NUMBERS[0].phone // Por defecto el primero
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
      const { data: prods } = await supabase.from('products').select('*').order('created_at', { ascending: false });
      if (prods) setProducts(prods);

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

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addToCart = (product: any) => {
    setCart(prev => ({
      ...prev,
      [product.id]: prev[product.id]
        ? { ...prev[product.id], quantity: prev[product.id].quantity + 1 }
        : { ...product, quantity: 1 }
    }));
    showToast(`¡${product.name} agregado!`);
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
      if (newQuantity <= 0) {
        const newCart = { ...prev };
        delete newCart[id];
        return newCart;
      }
      return { ...prev, [id]: { ...prev[id], quantity: newQuantity } };
    });
  };

  const cartItemsCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = Object.values(cart).reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Generar el mensaje
    let mensaje = `*NUEVO PEDIDO*\n\n`;
    mensaje += `*Datos del Cliente:*\n`;
    mensaje += `- Nombre: ${customerData.name}\n`;
    mensaje += `- Teléfono: ${customerData.phone}\n`;
    if (customerData.notes) mensaje += `- Observaciones: ${customerData.notes}\n`;

    mensaje += `\n*Detalle del Pedido:*\n`;
    Object.values(cart).forEach((item, index) => {
      mensaje += `${index + 1}. *${item.name}* x ${item.quantity} - $${(item.price * item.quantity).toLocaleString('es-AR')}\n`;
    });
    mensaje += `\n*TOTAL: $${cartTotal.toLocaleString('es-AR')}*`;

    // Abrir WhatsApp
    const url = `https://wa.me/${customerData.selectedSeller}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');

    // Limpiar carrito y mostrar éxito
    setCart({});
    setCheckoutStep('success');
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = searchQuery === '' || product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === null || product.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <main className="min-h-screen bg-neutral-50 pb-16 relative">

      {/* Notificación Toast (Animada) */}
      <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white px-6 py-3 rounded-full shadow-lg font-medium text-sm transition-all duration-300 ${toastMessage ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'}`}>
        {toastMessage}
      </div>

      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 sm:h-20 flex items-center justify-between">
          <div className="relative flex-grow max-w-xs transition-all duration-300 focus-within:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 sm:py-2.5 border border-neutral-200 rounded-lg text-neutral-900 bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white text-sm transition-colors"
            />
          </div>

          <h1 className="text-xl sm:text-2xl font-extrabold text-neutral-900 uppercase tracking-tighter mx-4 text-center cursor-pointer hover:text-orange-500 transition-colors">
            Mi Tienda
          </h1>

          <button
            onClick={() => { setIsCartOpen(true); setCheckoutStep('cart'); }}
            className="relative flex items-center gap-2.5 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-all hover:scale-105 active:scale-95"
          >
            <ShoppingCart className="h-5 w-5" />
            <span className="font-semibold text-sm hidden sm:inline">Carrito</span>
            {cartItemsCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-[11px] font-bold h-5 w-5 flex items-center justify-center rounded-full animate-bounce">
                {cartItemsCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {categories.length > 0 && (
        <nav className="bg-white border-b border-neutral-100 sticky top-16 sm:top-20 z-30 shadow-xs">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 overflow-x-auto scroller-hidden">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${activeCategory === null ? 'bg-orange-500 text-white shadow-md' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:shadow-sm'}`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${activeCategory === cat ? 'bg-orange-500 text-white shadow-md' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 hover:shadow-sm'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </nav>
      )}

      <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6 mt-10">
        {loading ? (
          [...Array(10)].map((_, i) => <div key={i} className="aspect-[3/4] bg-neutral-200 rounded-xl animate-pulse"></div>)
        ) : filteredProducts.map((product) => (
          <div
            key={product.id}
            className={`bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col transition-all duration-300 hover:shadow-xl hover:-translate-y-1.5 group ${!product.in_stock ? 'opacity-75 grayscale-[0.5]' : 'cursor-pointer'}`}
            onClick={() => product.in_stock && setSelectedProduct(product)}
          >
            <div className="aspect-square bg-neutral-50 w-full relative overflow-hidden flex items-center justify-center p-4">
              {!product.in_stock && (
                <div className="absolute inset-0 bg-white/40 z-20 flex items-center justify-center backdrop-blur-[1px]">
                  <span className="bg-neutral-900 text-white font-black text-xs tracking-widest uppercase px-4 py-1.5 rounded-full rotate-[-12deg] shadow-lg">Agotado</span>
                </div>
              )}
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-110" />
              ) : (
                <div className="text-neutral-300 text-xs">Sin imagen</div>
              )}
            </div>

            <div className="p-4 text-center flex flex-col flex-grow bg-white z-10">
              <h3 className="text-sm font-semibold text-neutral-800 line-clamp-2 min-h-[40px] group-hover:text-orange-500 transition-colors">
                {product.name}
              </h3>
              <p className="text-lg font-black text-neutral-950 mt-1 mb-4">
                ${product.price.toLocaleString('es-AR')}
              </p>

              <button
                disabled={!product.in_stock}
                onClick={(e) => { e.stopPropagation(); addToCart(product); }}
                className="mt-auto w-full text-center bg-neutral-900 text-white text-xs font-bold py-3 rounded-lg hover:bg-orange-500 transition-colors active:scale-95 disabled:bg-neutral-200 disabled:text-neutral-400 disabled:hover:scale-100 disabled:cursor-not-allowed"
              >
                {product.in_stock ? 'Sumar al carrito' : 'Sin Stock'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL DETALLE DE PRODUCTO */}
      {selectedProduct && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 opacity-100 transition-opacity">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedProduct(null)}></div>

          <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row transform transition-transform scale-100 max-h-[90vh]">
            <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-10 bg-white/80 backdrop-blur p-1.5 rounded-full text-neutral-500 hover:text-neutral-900 transition-colors">
              <X className="h-6 w-6" />
            </button>

            {/* Columna Imagen */}
            <div className="w-full md:w-1/2 bg-neutral-50 p-6 sm:p-10 flex items-center justify-center min-h-[300px]">
              {selectedProduct.image_url ? (
                <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-full object-contain mix-blend-multiply" />
              ) : (
                <div className="text-neutral-400">Sin imagen</div>
              )}
            </div>

            {/* Columna Info */}
            <div className="w-full md:w-1/2 p-6 sm:p-10 flex flex-col overflow-y-auto scroller-hidden">
              {selectedProduct.category && <span className="text-orange-500 text-xs font-black uppercase tracking-wider mb-2">{selectedProduct.category}</span>}
              <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 leading-tight mb-4">{selectedProduct.name}</h2>
              <p className="text-3xl font-black text-neutral-900 mb-6">${selectedProduct.price.toLocaleString('es-AR')}</p>

              <div className="prose prose-sm text-neutral-600 mb-8 whitespace-pre-wrap flex-grow">
                {selectedProduct.description ? selectedProduct.description : 'Este producto no tiene descripción adicional.'}
              </div>

              <div className="mt-auto pt-6 border-t border-neutral-100">
                <button
                  onClick={() => { addToCart(selectedProduct); setSelectedProduct(null); setIsCartOpen(true); }}
                  className="w-full bg-orange-500 text-white font-black py-4 rounded-xl hover:bg-orange-600 transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="h-5 w-5" />
                  Agregar al Carrito
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL LATERAL DEL CARRITO / CHECKOUT */}
      <div className={`fixed inset-0 z-50 transition-opacity duration-300 ${isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>

        <div className={`absolute right-0 top-0 h-full w-full max-w-sm sm:max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}>

          <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
            <h3 className="text-lg font-black text-neutral-900 uppercase tracking-tight">
              {checkoutStep === 'cart' ? 'Tu Pedido' : checkoutStep === 'form' ? 'Datos de Envío' : '¡Listo!'}
            </h3>
            <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-neutral-900 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="flex-grow overflow-y-auto scroller-hidden">

            {/* PASO 1: CARRITO */}
            {checkoutStep === 'cart' && (
              <div className="p-5 space-y-4">
                {cartItemsCount === 0 ? (
                  <p className="text-center text-neutral-500 pt-10">Tu carrito está vacío.</p>
                ) : Object.values(cart).map(item => (
                  <div key={item.id} className="flex items-center gap-4 p-3 border border-neutral-100 rounded-xl bg-white shadow-sm">
                    {item.image_url && <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-lg bg-neutral-50" />}
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-neutral-900 text-sm truncate">{item.name}</p>
                      <p className="text-orange-600 font-black text-sm">${(item.price * item.quantity).toLocaleString('es-AR')}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 flex items-center justify-center border border-neutral-200 rounded-md hover:bg-neutral-100 font-bold">-</button>
                        <span className="text-sm font-bold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 flex items-center justify-center border border-neutral-200 rounded-md hover:bg-neutral-100 font-bold">+</button>
                      </div>
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="text-neutral-300 hover:text-red-500 p-2 transition-colors">
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* PASO 2: FORMULARIO */}
            {checkoutStep === 'form' && (
              <form id="checkout-form" onSubmit={handleCheckoutSubmit} className="p-6 space-y-5">
                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase mb-1.5">Tu Nombre</label>
                  <input type="text" required value={customerData.name} onChange={e => setCustomerData({ ...customerData, name: e.target.value })} className="w-full p-3 border border-neutral-200 rounded-lg text-neutral-900 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Ej: Juan Pérez" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase mb-1.5">Tu Teléfono</label>
                  <input type="tel" required value={customerData.phone} onChange={e => setCustomerData({ ...customerData, phone: e.target.value })} className="w-full p-3 border border-neutral-200 rounded-lg text-neutral-900 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Ej: 223..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase mb-1.5">Enviar pedido a:</label>
                  <select value={customerData.selectedSeller} onChange={e => setCustomerData({ ...customerData, selectedSeller: e.target.value })} className="w-full p-3 border border-neutral-200 rounded-lg text-neutral-900 focus:ring-2 focus:ring-orange-500 outline-none bg-white">
                    {WHATSAPP_NUMBERS.map(opt => (
                      <option key={opt.id} value={opt.phone}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-600 uppercase mb-1.5">Observaciones (Opcional)</label>
                  <textarea rows={3} value={customerData.notes} onChange={e => setCustomerData({ ...customerData, notes: e.target.value })} className="w-full p-3 border border-neutral-200 rounded-lg text-neutral-900 focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Talles, colores, detalles de entrega..."></textarea>
                </div>
              </form>
            )}

            {/* PASO 3: ÉXITO */}
            {checkoutStep === 'success' && (
              <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-4">
                <CheckCircle2 className="h-20 w-20 text-green-500" />
                <h3 className="text-2xl font-black text-neutral-900">¡Pedido Enviado!</h3>
                <p className="text-neutral-500">Te redirigimos a WhatsApp para confirmar la compra. Si no se abrió automáticamente, revisá tus pestañas.</p>
                <button onClick={() => { setIsCartOpen(false); setCheckoutStep('cart'); }} className="mt-6 font-bold text-orange-500 hover:text-orange-600">
                  Volver a la tienda
                </button>
              </div>
            )}
          </div>

          {/* FOOTER DEL CARRITO (Botones de acción) */}
          {checkoutStep !== 'success' && cartItemsCount > 0 && (
            <div className="p-5 border-t border-neutral-200 bg-neutral-50">
              <div className="flex items-center justify-between mb-4">
                <span className="text-neutral-500 font-medium">Total a pagar:</span>
                <span className="text-2xl font-black text-neutral-900">${cartTotal.toLocaleString('es-AR')}</span>
              </div>

              {checkoutStep === 'cart' ? (
                <button
                  onClick={() => setCheckoutStep('form')}
                  className="w-full bg-orange-500 text-white font-black py-4 rounded-xl hover:bg-orange-600 transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/30"
                >
                  Continuar Compra
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={() => setCheckoutStep('cart')} className="px-4 py-4 font-bold text-neutral-500 hover:text-neutral-900 transition-colors">Atrás</button>
                  <button type="submit" form="checkout-form" className="flex-grow bg-green-500 text-white font-black py-4 rounded-xl hover:bg-green-600 transition-transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-green-500/30">
                    Enviar por WhatsApp
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