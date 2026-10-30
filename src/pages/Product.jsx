
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, money } from '../lib/supabase'
import { useCart } from '../context/CartContext'

export default function Product() {
  const { id } = useParams()

  const [p, setP] = useState(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)

  const { add } = useCart()

  useEffect(() => {
    let mounted = true

    async function fetchProduct() {
      setLoading(true)

      const { data, error } = await supabase
        ?.from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (!mounted) return

      if (error) {
        console.error('Error loading product:', error.message)
        setP(null)
      } else {
        setP(data)
        setSelectedImage(0)
      }

      setLoading(false)
    }

    fetchProduct()

    return () => {
      mounted = false
    }
  }, [id])

  // Add product to cart
  async function handleAddToCart() {
    if (adding || !p || p.stock < 1) return

    setAdding(true)

    try {
      await add(p)
    } catch (error) {
      console.error('Could not add product to bag:', error)
    } finally {
      setAdding(false)
    }
  }

  if (loading) {
    return (
      <main className="container page-section">
        <p>Loading item...</p>
      </main>
    )
  }

  if (!p || !p.active) {
    return (
      <main className="container page-section">
        <h1>Item not found</h1>
        <Link to="/">Back home</Link>
      </main>
    )
  }

  const special = p.is_special && p.sale_price != null

  // Display multiple images, or use the original image.
  const images = p.image_urls?.length
    ? p.image_urls
    : p.image_url
      ? [p.image_url]
      : []

  const currentImage = images[selectedImage]

  return (
    <main className="container page-section">
      <div className="detail-grid">

        {/* PRODUCT IMAGE GALLERY */}
        <div className="detail-gallery">

          <div className="detail-image">
            {currentImage ? (
              <img
                src={currentImage}
                alt={p.name}
              />
            ) : (
              <div className="image-placeholder">
                BLAQDAWG
              </div>
            )}
          </div>

          {/* IMAGE THUMBNAILS */}
          {images.length > 1 && (
            <div className="detail-thumbnails">
              {images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={`detail-thumbnail ${
                    selectedImage === index ? 'selected' : ''
                  }`}
                  onClick={() => setSelectedImage(index)}
                  aria-label={`View product image ${index + 1}`}
                >
                  <img
                    src={image}
                    alt={`${p.name} view ${index + 1}`}
                  />
                </button>
              ))}
            </div>
          )}

          {images.length > 1 && (
            <p className="gallery-note">
              {selectedImage + 1} of {images.length} images
            </p>
          )}
        </div>

        {/* PRODUCT DETAILS */}
        <div className="detail-copy">

          <p className="eyebrow">
            {p.collection === 'weaves'
              ? 'WEAVES'
              : 'BLAQ DAWG VINTAGE'}
            {' / '}
            {p.category}
          </p>

          <h1>{p.name}</h1>

          <div className="price-line large">
            {special ? (
              <>
                <strong>{money(p.sale_price)}</strong>
                <del>{money(p.price)}</del>
              </>
            ) : (
              <strong>{money(p.price)}</strong>
            )}
          </div>

          <p>{p.description}</p>

          <p className="stock-copy">
            {p.stock > 0
              ? `${p.stock} available`
              : 'Currently out of stock'}
          </p>

          {/* ADD TO BAG BUTTON WITH LOADER */}
          <button
            className="button button-dark add-cart-button"
            disabled={p.stock < 1 || adding}
            onClick={handleAddToCart}
          >
            {adding ? (
              <>
                <span className="cart-spinner"></span>
                ADDING...
              </>
            ) : (
              'ADD TO BAG'
            )}
          </button>

          <p className="small-note">
            Delivery R150 · Lead time 2–3 weeks after payment is confirmed.
          </p>

        </div>
      </div>
    </main>
  )
}
