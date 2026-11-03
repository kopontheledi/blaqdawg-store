
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'

export default function Home() {
  const [recent, setRecent] = useState([])
  const [specials, setSpecials] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) {
      setError('Add your Supabase details to the .env file to load the store inventory.')
      return
    }

    let alive = true

    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .limit(4)
      .then(({ data, error }) => {
        if (alive) {
          if (error) setError(error.message)
          else setRecent(data || [])
        }
      })

    supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .eq('is_special', true)
      .not('sale_price', 'is', null)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (alive) {
          if (error) {
            console.error('Error loading specials:', error)
          } else {
            setSpecials(data || [])
          }
        }
      })

    return () => {
      alive = false
    }
  }, [])

  return (
    <main>

      {/* HERO */}
      <section className="hero">
        <div className="hero-shade" />

        <div className="container hero-content">
          <p className="eyebrow light">
            EST. 2020 · STYLE WITHOUT LIMITS
          </p>

          <h1>
            MAKE A<br />
            <em>STATEMENT.</em>
          </h1>

          <p>
            Vintage-inspired apparel. Beautiful weaves.
            Your style, your rules.
          </p>

          <div className="hero-actions">
            <Link className="button button-light" to="/shop/apparel">
              SHOP APPAREL
            </Link>

            <Link className="button button-outline-light" to="/shop/weaves">
              SHOP WEAVES
            </Link>
          </div>
        </div>
      </section>

      {/* CATEGORY PANELS */}
      <section className="category-panels container">
        <Link
          to="/shop/apparel"
          className="category-panel apparel-panel"
        >
          <span>THE ORIGINALS</span>
          <h2>BLAQ DAWG<br />VINTAGE</h2>
          <b>SHOP APPAREL ↗</b>
        </Link>

        <Link
          to="/shop/weaves"
          className="category-panel weave-panel"
        >
          <span>YOUR CROWN, YOUR WAY</span>
          <h2>THE<br />WEAVE EDIT</h2>
          <b>SHOP WEAVES ↗</b>
        </Link>
      </section>

      {/* SPECIALS */}
      <section id="specials" className="section container">

        <div className="section-heading">
          <div>
            <p className="eyebrow">DON'T MISS OUT</p>
            <h2>THE SPECIALS</h2>
          </div>

          <Link to="/specials" className="text-link">
            VIEW ALL SPECIALS ↗
          </Link>
        </div>

        {specials.length > 0 ? (
          <>
            <div className="product-grid">
              {specials.slice(0, 4).map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>

            {specials.length > 4 && (
              <div className="text-center mt-8">
                <Link to="/specials" className="button button-dark">
                  VIEW ALL SPECIALS
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="empty-state text-center py-12">
            <h3 className="text-xl sm:text-2xl font-bold tracking-wide">
              SPECIALS COMING SOON
            </h3>

            <p className="mt-3">
              We're preparing something special for you.
              Check back soon for exclusive offers on selected
              apparel and premium weaves.
            </p>

            <Link
              to="/shop"
              className="button button-dark inline-block mt-6"
            >
              EXPLORE THE SHOP
            </Link>
          </div>
        )}

      </section>

      {/* RECENTLY ADDED */}
      <section className="section container">

        <div className="section-heading">
          <div>
            <p className="eyebrow">FRESH OFF THE DROP</p>
            <h2>RECENTLY ADDED</h2>
          </div>

          <Link to="/shop/apparel" className="text-link">
            VIEW ALL ↗
          </Link>
        </div>

        {error && <p className="notice">{error}</p>}

        {recent.length > 0 ? (
          <div className="product-grid">
            {recent.map(product => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        ) : (
          !error && (
            <p className="empty-state">
              New drops are on the way. Check back soon.
            </p>
          )
        )}

      </section>

      {/* DELIVERY INFORMATION */}
      <section className="delivery-strip">
        <div className="container">
          <p className="eyebrow light">
            MADE FOR YOUR NEXT LOOK
          </p>

          <h2>GOOD STYLE IS WORTH THE WAIT.</h2>

          <p>
            Our lead time is 2–3 weeks after your payment is confirmed.
          </p>
        </div>
      </section>

    </main>
  )
}
