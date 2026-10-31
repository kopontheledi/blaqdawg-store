
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import { ShoppingBag, ArrowRight } from 'lucide-react'

export default function Shop() {
  const { collection } = useParams()

  const [products, setProducts] = useState([])
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)

  const allCategory = collection === 'weaves'
    ? 'All Weaves'
    : 'All Apparel'

  useEffect(() => {
    let mounted = true

    async function fetchProducts() {
      setLoading(true)
      setCategory(allCategory)

      if (!supabase) {
        setProducts([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .eq('collection', collection)
        .gt('stock', 0)
        .order('created_at', { ascending: false })

      if (!mounted) return

      if (error) {
        console.error('Error loading products:', error.message)
        setProducts([])
      } else {
        setProducts(data || [])
      }

      setLoading(false)
    }

    fetchProducts()

    return () => {
      mounted = false
    }
  }, [collection])

  // Only show categories that have available products.
  const availableCategories = [
    ...new Set(
      products
        .map(product => product.category)
        .filter(Boolean)
    )
  ]

  const categoryTabs = [allCategory, ...availableCategories]

  const filtered = category === allCategory
    ? products
    : products.filter(product => product.category === category)

  const isWeaves = collection === 'weaves'

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">

      {/* SHOP HEADING */}
      <div className="border-b border-gray-200 pb-8 mb-8">

        <p className="text-xs font-bold tracking-[0.25em] text-gray-500 mb-4">
          {isWeaves ? 'THE WEAVE EDIT' : 'THE ORIGINALS'}
        </p>

        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">

          <div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight">
              {isWeaves ? 'WEAVES' : 'BLAQ DAWG VINTAGE'}
            </h1>

            <p className="text-gray-500 text-sm mt-3">
              Find your next favourite.
            </p>
          </div>

          {!loading && products.length > 0 && (
            <p className="text-xs font-medium text-gray-500">
              {filtered.length} {filtered.length === 1 ? 'ITEM' : 'ITEMS'}
            </p>
          )}

        </div>
      </div>

      {/* LOADING STATE */}
      {loading ? (

        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-black rounded-full animate-spin mb-5" />

          <p className="text-sm text-gray-500">
            Loading collection...
          </p>
        </div>

      ) : products.length > 0 ? (

        <>
          {/* CATEGORY FILTERS */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-7 scrollbar-hide">

            {categoryTabs.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`flex-shrink-0 px-5 py-3 text-xs font-bold tracking-wide transition ${
                  category === c
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-black'
                }`}
              >
                {c}
              </button>
            ))}

          </div>

          {/* PRODUCT GRID */}
          {filtered.length > 0 ? (

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-9 sm:gap-x-6 sm:gap-y-12">

              {filtered.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}

            </div>

          ) : (

            <div className="min-h-[30vh] flex flex-col items-center justify-center text-center py-12">
              <ShoppingBag size={32} className="text-gray-300 mb-4" />

              <h2 className="text-xl font-bold mb-2">
                No products in this category
              </h2>

              <p className="text-sm text-gray-500 mb-5">
                Try another category to see what's available.
              </p>

              <button
                type="button"
                onClick={() => setCategory(allCategory)}
                className="text-xs font-bold tracking-widest border-b border-black pb-1 hover:text-gray-500 hover:border-gray-500 transition"
              >
                VIEW ALL PRODUCTS
              </button>
            </div>

          )}
        </>

      ) : (

        /* EMPTY COLLECTION */
        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center py-16">

          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <ShoppingBag size={32} className="text-gray-400" />
          </div>

          <h2 className="text-2xl font-bold mb-3">
            Nothing here just yet.
          </h2>

          <p className="text-sm text-gray-500 mb-7 max-w-sm">
            Check back for the next drop. We're always working on something new.
          </p>

          <Link
            to="/"
            className="inline-flex items-center gap-2 bg-black text-white px-7 py-4 text-xs font-bold tracking-widest hover:bg-gray-800 transition"
          >
            BACK HOME
            <ArrowRight size={16} />
          </Link>

        </div>

      )}

    </main>
  )
}
