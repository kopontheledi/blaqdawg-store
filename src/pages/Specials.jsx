
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'

export default function Specials() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSpecials = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .eq('is_special', true)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching specials:', error)
      } else {
        setProducts(data || [])
      }

      setLoading(false)
    }

    fetchSpecials()
  }, [])

  return (
    <div className="min-h-screen bg-white">

      {/* PAGE HEADER */}
      <section className="bg-black text-white text-center py-16 sm:py-20 px-4">
        <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-3">
          Exclusive Offers
        </p>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-wide">
          SPECIALS
        </h1>

        <p className="text-sm text-gray-400 mt-4 max-w-xl mx-auto">
          Discover selected pieces at special prices. Shop your favourites
          while these offers last.
        </p>
      </section>

      {/* PRODUCTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12">

        {loading ? (
          <div className="text-center py-20">
            <p className="text-sm text-gray-500">
              Loading specials...
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">

            <h2 className="text-2xl sm:text-3xl font-bold text-black tracking-wide">
              SPECIALS COMING SOON
            </h2>

            <p className="text-sm text-gray-500 mt-4 max-w-md mx-auto">
              We're preparing something special for you.
              Check back soon for exclusive offers on selected
              apparel and premium weaves.
            </p>

            <a
              href="/shop"
              className="inline-flex mt-8 bg-black text-white px-8 py-3 text-xs font-bold tracking-widest hover:bg-gray-800 transition"
            >
              EXPLORE THE SHOP
            </a>

          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold uppercase tracking-wider">
                Available Specials
              </h2>

              <p className="text-xs text-gray-500">
                {products.length} {products.length === 1 ? 'offer' : 'offers'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          </>
        )}

      </section>
    </div>
  )
}
