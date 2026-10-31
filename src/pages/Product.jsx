
import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase, money } from '../lib/supabase'
import { useCart } from '../context/CartContext'

export default function Product() {
  const { id } = useParams()
  const { add } = useCart()

  const [p, setP] = useState(null)
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)

  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true

    async function fetchProduct() {
      setLoading(true)

      const { data: product, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single()

      if (!mounted) return

      if (productError) {
        console.error('Error loading product:', productError.message)
        setP(null)
        setLoading(false)
        return
      }

      const { data: productVariants, error: variantError } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', id)
        .order('size', { ascending: true })

      if (!mounted) return

      if (variantError) {
        console.error('Error loading variations:', variantError.message)
        setVariants([])
      } else {
        setVariants(productVariants || [])

        if (productVariants?.length) {
          setSelectedSize(productVariants[0].size)
          setSelectedColor(productVariants[0].color)
        }
      }

      setP(product)
      setSelectedImage(0)
      setQuantity(1)
      setLoading(false)
    }

    fetchProduct()

    return () => {
      mounted = false
    }
  }, [id])

  const availableSizes = [
    ...new Set(variants.map(variant => variant.size))
  ]

  const availableColors = [
    ...new Set(
      variants
        .filter(variant => variant.size === selectedSize)
        .map(variant => variant.color)
    )
  ]

  const selectedVariant = variants.find(
    variant =>
      variant.size === selectedSize &&
      variant.color === selectedColor
  )

  const showSize = availableSizes.length > 1 ||
    (availableSizes.length === 1 && availableSizes[0] !== 'One Size')

  const showColor = availableColors.length > 1 ||
    (availableColors.length === 1 && availableColors[0] !== 'Default')

  function changeSize(size) {
    setSelectedSize(size)

    const firstAvailableColor = variants.find(
      variant => variant.size === size
    )?.color

    setSelectedColor(firstAvailableColor || '')
    setQuantity(1)
    setMessage('')
  }

  function changeColor(color) {
    setSelectedColor(color)
    setQuantity(1)
    setMessage('')
  }

  async function handleAddToCart() {
    if (adding || !p || !selectedVariant) return

    if (quantity > selectedVariant.stock) {
      setMessage('The selected quantity is not available.')
      return
    }

    setAdding(true)
    setMessage('')

    try {
      add({
        ...p,
        variant_id: selectedVariant.id,
        size: selectedVariant.size,
        color: selectedVariant.color,
        stock: selectedVariant.stock
      }, quantity)

      setMessage('Added to your bag successfully.')
    } catch (error) {
      console.error('Could not add product to bag:', error)
      setMessage(error.message || 'Could not add this item to your bag.')
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

  const images = p.image_urls?.length
    ? p.image_urls
    : p.image_url
      ? [p.image_url]
      : []

  const currentImage = images[selectedImage]

  const stock = Number(selectedVariant?.stock || 0)

  return (
    <main className="container page-section">
      <div className="detail-grid">

        <div className="detail-gallery">
          <div className="detail-image">
            {currentImage ? (
              <img src={currentImage} alt={p.name} />
            ) : (
              <div className="image-placeholder">BLAQDAWG</div>
            )}
          </div>

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

        <div className="detail-copy">
          <p className="eyebrow">
            {p.collection === 'weaves'
              ? 'WEAVES'
              : 'BLAQ DAWG VINTAGE'} / {p.category}
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

          {variants.length > 0 ? (
            <>
              {showSize && (
                <div className="variant-options">
                  <label htmlFor="product-size">Size</label>
                  <select
                    id="product-size"
                    value={selectedSize}
                    onChange={e => changeSize(e.target.value)}
                  >
                    {availableSizes.map(size => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {showColor && (
                <div className="variant-options">
                  <label htmlFor="product-color">Colour</label>
                  <select
                    id="product-color"
                    value={selectedColor}
                    onChange={e => changeColor(e.target.value)}
                  >
                    {availableColors.map(color => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedVariant && (
                <div className="stock-copy">
                  {stock === 0 ? (
                    <p>Currently out of stock</p>
                  ) : stock < 5 ? (
                    <p className="stock-warning">
                      Hurry! Only {stock} {stock === 1 ? 'left' : 'left'} in
                      stock.
                    </p>
                  ) : (
                    <p>{stock} available</p>
                  )}
                </div>
              )}

              {selectedVariant && stock > 0 && (
                <div className="variant-options">
                  <label htmlFor="product-quantity">Quantity</label>
                  <select
                    id="product-quantity"
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                  >
                    {Array.from(
                      { length: stock },
                      (_, index) => index + 1
                    ).map(number => (
                      <option key={number} value={number}>
                        {number}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                className="button button-dark add-cart-button"
                disabled={!selectedVariant || stock < 1 || adding}
                onClick={handleAddToCart}
              >
                {adding ? (
                  <>
                    <span className="cart-spinner"></span>
                    ADDING...
                  </>
                ) : stock < 1 ? (
                  'OUT OF STOCK'
                ) : (
                  'ADD TO BAG'
                )}
              </button>

              {message && (
                <p className="small-note" role="status">
                  {message}
                </p>
              )}
            </>
          ) : (
            <p className="stock-warning">
              No variations are currently available for this item.
            </p>
          )}

          <p className="small-note">
            Delivery R150 · Lead time 2–3 weeks after payment is confirmed.
          </p>
        </div>
      </div>
    </main>
  )
}
