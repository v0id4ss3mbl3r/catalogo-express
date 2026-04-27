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

  return (
    <main className="min-h-screen bg-neutral-50 p-6 sm:p-10">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center sm:text-left">
          <h1 className="text-3xl font-bold text-neutral-900 tracking-tight">Mi Catálogo</h1>
          <p className="text-neutral-500 mt-2">Productos disponibles</p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {products?.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-xl shadow-sm border border-neutral-100 overflow-hidden transition-transform hover:scale-[1.02]"
            >
              <div className="aspect-square bg-neutral-200 w-full">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-neutral-400">
                    Sin imagen
                  </div>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-lg font-semibold text-neutral-800">{product.name}</h2>
                {/* Acá agregamos la descripción */}
                {product.description && (
                  <p className="text-sm text-neutral-500 mt-1 line-clamp-2">
                    {product.description}
                  </p>
                )}
                <p className="text-xl font-bold text-neutral-900 mt-3">
                  ${product.price.toLocaleString('es-AR')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}