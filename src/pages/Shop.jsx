
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'

export default function Shop() {
  const { collection } = useParams()

  const [products, setProducts] = useState([])
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)

  const allCategory = collection === 'weaves' ? 'All Weaves' : 'All Apparel'

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

  return (
    <main className="container page-section">

      <div className="page-title">
        <p className="eyebrow">
          {collection === 'weaves' ? 'THE WEAVE EDIT' : 'THE ORIGINALS'}
        </p>

        <h1>
          {collection === 'weaves' ? 'WEAVES' : 'BLAQ DAWG VINTAGE'}
        </h1>

        <p>Find your next favourite.</p>
      </div>

      {loading ? (
        <p className="empty-state">Loading collection…</p>
      ) : products.length > 0 ? (
        <>
          <div className="category-tabs">
            {categoryTabs.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={category === c ? 'active' : ''}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="product-grid">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        </>
      ) : (
        <p className="empty-state">
          Nothing here just yet. Check back for the next drop.
        </p>
      )}

    </main>
  )
}
