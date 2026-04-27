import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export const revalidate = 0;

export default async function Catalogo() {
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  // Pone acá tu número con código de país (ej: 54911...)
  const numeroWhatsApp = "5491100000000";

  return (
    <main className="min-h-screen bg-neutral-50 pb-12">
      {/* Header Estilo Tienda */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-black text-neutral-900 uppercase tracking-wider">
            Mi Tienda
          </h1>
        </div>
      </header>

      {/* Banner Introductorio */}
      <div className="bg-neutral-900 text-white py-12 px-6 text-center mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold mb-4">Catálogo Oficial</h2>
        <p className="text-neutral-400 max-w-xl mx-auto">
          Explorá nuestros productos. Hacé tu consulta de forma directa y rápida.
        </p>
      </div>

      {/* Grilla de Productos */}
      <div className="max-w-5xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products?.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden flex flex-col transition-transform hover:-translate-y-1"
            >
              <div className="aspect-square bg-neutral-100 w-full relative">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover absolute inset-0"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">
                    Sin imagen
                  </div>
                )}
              </div>

              <div className="p-4 flex flex-col flex-grow">
                <h3 className="text-md font-semibold text-neutral-800 line-clamp-1">
                  {product.name}
                </h3>
                {product.description && (
                  <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
                    {product.description}
                  </p>
                )}
                <p className="text-lg font-bold text-neutral-900 mt-2 mb-4">
                  ${product.price.toLocaleString('es-AR')}
                </p>

                <div className="mt-auto">
                  <a
                    href={`https://wa.me/${numeroWhatsApp}?text=Hola!%20Me%20interesa%20el%20producto%20*${encodeURIComponent(product.name)}*%20que%20vi%20en%20el%20catálogo.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-neutral-900 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-neutral-800 transition-colors"
                  >
                    Consultar por WhatsApp
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}