
import { useEffect, useState } from 'react'
import { supabase, money } from '../lib/supabase'
import { categories } from '../data/categories'
import {
  LogOut,
  Plus,
  Pencil,
  Trash2,
  X,
  Images
} from 'lucide-react'

const blank = {
  name: '',
  collection: 'apparel',
  category: 'T-Shirts',
  description: '',
  price: '',
  sale_price: '',
  is_special: false,
  image_url: '',
  image_urls: [],
  stock: 1,
  active: true
}

export default function Admin() {
  const [session, setSession] = useState(null)
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [products, setProducts] = useState([])
  const [form, setForm] = useState({ ...blank })
  const [editing, setEditing] = useState(null)

  const [files, setFiles] = useState([])
  const [imageInputKey, setImageInputKey] = useState(0)

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  // Load products
  const loadProducts = async () => {
    if (!supabase) return

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(`Could not load products: ${error.message}`)
      return
    }

    setProducts(data || [])
  }

  // Verify admin access
  const verifyAdmin = async (userId) => {
    if (!supabase || !userId) {
      setAuthorized(false)
      return
    }

    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle()

    if (error) {
      setAuthorized(false)
      setMessage(`Admin verification failed: ${error.message}`)
      return
    }

    if (!data) {
      setAuthorized(false)
      setMessage('This account is not registered as an admin.')
      return
    }

    setAuthorized(true)
    setMessage('')
    await loadProducts()
  }

  // Check login session
  useEffect(() => {
    if (!supabase) {
      setChecking(false)
      return
    }

    let mounted = true

    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (!mounted) return

      if (error) {
        setMessage(error.message)
        setChecking(false)
        return
      }

      setSession(data.session)

      if (data.session) {
        await verifyAdmin(data.session.user.id)
      }

      if (mounted) setChecking(false)
    }

    checkSession()

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      setAuthorized(false)

      if (!newSession) {
        setMessage('')
        return
      }

      setTimeout(() => {
        verifyAdmin(newSession.user.id)
      }, 0)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Login
  const signIn = async (e) => {
    e.preventDefault()

    if (!supabase) return

    setLoading(true)
    setMessage('Signing in...')

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    })

    if (error) {
      setMessage(error.message)
      setLoading(false)
      return
    }

    setSession(data.session)

    if (data.session) {
      await verifyAdmin(data.session.user.id)
    }

    setLoading(false)
  }

  // Logout
  const signOut = async () => {
    if (!supabase) return

    setLoading(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage(error.message)
    } else {
      setSession(null)
      setAuthorized(false)
      setProducts([])
      setMessage('')
    }

    setLoading(false)
  }

  // Change form values
  const change = (key, value) => {
    setForm(current => ({
      ...current,
      [key]: value
    }))
  }

  // Edit product
  const startEdit = (product) => {
    const currentImages = product.image_urls?.length
      ? product.image_urls
      : product.image_url
        ? [product.image_url]
        : []

    setEditing(product.id)

    setForm({
      ...product,
      image_urls: currentImages,
      image_url: currentImages[0] || '',
      price: String(product.price),
      sale_price:
        product.sale_price == null
          ? ''
          : String(product.sale_price)
    })

    setFiles([])
    setImageInputKey(key => key + 1)

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  // Remove an existing image from the product
  const removeExistingImage = (imageUrl) => {
    const remaining = form.image_urls.filter(
      image => image !== imageUrl
    )

    setForm(current => ({
      ...current,
      image_urls: remaining,
      image_url: remaining[0] || ''
    }))
  }

  // Remove a newly selected image
  const removeSelectedImage = (index) => {
    setFiles(current =>
      current.filter((_, i) => i !== index)
    )

    setImageInputKey(key => key + 1)
  }

  // Reset form and file input
  const reset = () => {
    setEditing(null)
    setForm({ ...blank, image_urls: [] })
    setFiles([])
    setImageInputKey(key => key + 1)
  }

  // Upload multiple images
  const uploadImages = async () => {
    const uploadedUrls = []

    for (const file of files) {
      const extension = file.name.split('.').pop()
      const path = `${crypto.randomUUID()}.${extension}`

      const { error } = await supabase.storage
        .from('product-images')
        .upload(path, file, {
          upsert: false
        })

      if (error) {
        throw error
      }

      const { data } = supabase.storage
        .from('product-images')
        .getPublicUrl(path)

      uploadedUrls.push(data.publicUrl)
    }

    return uploadedUrls
  }

  // Save product
  const save = async (e) => {
    e.preventDefault()

    if (!supabase) return

    setLoading(true)
    setMessage('Saving product and uploading images...')

    try {
      // Upload all newly selected images
      const uploadedUrls = await uploadImages()

      // Keep existing images and add the new ones
      const allImages = [
        ...(form.image_urls || []),
        ...uploadedUrls
      ]

      const payload = {
        name: form.name.trim(),
        collection: form.collection,
        category: form.category,
        description: form.description,
        price: Number(form.price),
        sale_price:
          form.sale_price === ''
            ? null
            : Number(form.sale_price),
        is_special: Boolean(form.is_special),
        image_urls: allImages,
        image_url: allImages[0] || '',
        stock: Number(form.stock),
        active: Boolean(form.active),
        updated_at: new Date().toISOString()
      }

      const result = editing
        ? await supabase
            .from('products')
            .update(payload)
            .eq('id', editing)
        : await supabase
            .from('products')
            .insert(payload)

      if (result.error) {
        throw result.error
      }

      setMessage('Product saved successfully!')

      reset()
      await loadProducts()

    } catch (error) {
      setMessage(error.message || 'Could not save product.')
    } finally {
      setLoading(false)
    }
  }

  // Delete product
  const deleteProduct = async (product) => {
    const confirmed = window.confirm(
      `Remove "${product.name}" from the store?`
    )

    if (!confirmed || !supabase) return

    setLoading(true)

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', product.id)

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Product removed successfully.')
      await loadProducts()
    }

    setLoading(false)
  }

  if (checking) {
    return (
      <main className="container page-section">
        Checking admin access...
      </main>
    )
  }

  if (!supabase) {
    return (
      <main className="container page-section">
        <p className="notice">
          Please configure your Supabase environment variables.
        </p>
      </main>
    )
  }

  // Login screen
  if (!session || !authorized) {
    return (
      <main className="container admin-login">
        <form
          className="admin-login-card"
          onSubmit={signIn}
        >
          <p className="eyebrow">BLAQ DAWG STORE</p>

          <h1>ADMIN LOGIN</h1>

          <p>Sign in with your authorised store account.</p>

          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </label>

          {message && (
            <p className="notice">{message}</p>
          )}

          <button
            type="submit"
            className="button button-dark full"
            disabled={loading}
          >
            {loading ? 'PLEASE WAIT...' : 'SIGN IN'}
          </button>
        </form>
      </main>
    )
  }

  // Admin dashboard
  return (
    <main className="container page-section admin-page">

      <div className="admin-top">
        <div>
          <p className="eyebrow">STORE MANAGEMENT</p>
          <h1>INVENTORY</h1>
          <p>Signed in as {session.user.email}</p>
        </div>

        <button
          className="button button-outline-dark"
          onClick={signOut}
          disabled={loading}
        >
          <LogOut size={16} />
          SIGN OUT
        </button>
      </div>

      {/* Product form */}
      <form className="admin-form" onSubmit={save}>

        <div className="admin-form-heading">
          <h2>{editing ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT'}</h2>

          {editing && (
            <button
              type="button"
              className="text-link"
              onClick={reset}
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="form-grid">

          <label>
            Product name
            <input
              required
              value={form.name}
              onChange={e => change('name', e.target.value)}
            />
          </label>

          <label>
            Collection
            <select
              value={form.collection}
              onChange={e => {
                const collection = e.target.value
                change('collection', collection)
                change('category', categories[collection][1])
              }}
            >
              <option value="apparel">
                BlaQ Dawg Vintage — Apparel
              </option>
              <option value="weaves">Weaves</option>
            </select>
          </label>

          <label>
            Category
            <select
              value={form.category}
              onChange={e => change('category', e.target.value)}
            >
              {categories[form.collection].slice(1).map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label>
            Price (R)
            <input
              type="number"
              min="0"
              step="0.01"
              required
              value={form.price}
              onChange={e => change('price', e.target.value)}
            />
          </label>

          <label>
            Special price (R)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.sale_price}
              onChange={e => change('sale_price', e.target.value)}
            />
          </label>

          <label>
            Stock quantity
            <input
              type="number"
              min="0"
              required
              value={form.stock}
              onChange={e => change('stock', e.target.value)}
            />
          </label>

          <label className="span-two">
            Product description
            <textarea
              rows="3"
              value={form.description}
              onChange={e => change('description', e.target.value)}
            />
          </label>

          {/* Multiple image uploads */}
          <label className="span-two">
            <span>
              <Images size={16} /> Product photos
            </span>

            <input
              key={imageInputKey}
              type="file"
              accept="image/*"
              multiple
              onChange={e => {
                setFiles(Array.from(e.target.files || []))
              }}
            />

            <small>
              Select multiple photos showing different angles of this product.
              The first photo will be the main product image.
            </small>
          </label>

        </div>

        {/* Existing image previews */}
        {form.image_urls?.length > 0 && (
          <div className="admin-image-section">
            <h3>Current product photos</h3>

            <div className="admin-image-grid">
              {form.image_urls.map((url, index) => (
                <div className="admin-image-item" key={url}>
                  <img src={url} alt={`Product view ${index + 1}`} />

                  <button
                    type="button"
                    onClick={() => removeExistingImage(url)}
                    aria-label="Remove image"
                    title="Remove image"
                  >
                    <X size={16} />
                  </button>

                  {index === 0 && (
                    <small>Main image</small>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Newly selected image names */}
        {files.length > 0 && (
          <div className="admin-selected-files">
            <h3>New photos selected ({files.length})</h3>

            {files.map((file, index) => (
              <div className="admin-selected-file" key={`${file.name}-${index}`}>
                <span>{file.name}</span>

                <button
                  type="button"
                  onClick={() => removeSelectedImage(index)}
                  aria-label="Remove selected file"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="check-row">
          <label>
            <input
              type="checkbox"
              checked={form.is_special}
              onChange={e => change('is_special', e.target.checked)}
            />
            Show as a special
          </label>

          <label>
            <input
              type="checkbox"
              checked={form.active}
              onChange={e => change('active', e.target.checked)}
            />
            Visible in store
          </label>
        </div>

        {message && (
          <p className="notice">{message}</p>
        )}

        <button
          type="submit"
          className="button button-dark"
          disabled={loading}
        >
          <Plus size={16} />

          {loading
            ? 'SAVING...'
            : editing
              ? 'UPDATE PRODUCT'
              : 'ADD PRODUCT'}
        </button>

      </form>

      {/* Inventory */}
      <div className="inventory-heading">
        <h2>ALL PRODUCTS ({products.length})</h2>
      </div>

      <div className="inventory-list">
        {products.map(product => (
          <div className="inventory-row" key={product.id}>

            <div className="inventory-thumb">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} />
              ) : (
                'BD'
              )}
            </div>

            <div className="inventory-info">
              <b>{product.name}</b>

              <span>
                {product.collection} · {product.category} ·{' '}
                {money(product.price)} · Stock: {product.stock}
              </span>

              <small>
                {product.active ? 'Visible' : 'Hidden'}
                {product.is_special ? ' · Special' : ''}
                {' · '}
                {(product.image_urls || []).length || (product.image_url ? 1 : 0)} photos
              </small>
            </div>

            <button
              className="icon-button"
              onClick={() => startEdit(product)}
              aria-label="Edit product"
              disabled={loading}
            >
              <Pencil size={17} />
            </button>

            <button
              className="icon-button"
              onClick={() => deleteProduct(product)}
              aria-label="Delete product"
              disabled={loading}
            >
              <Trash2 size={17} />
            </button>

          </div>
        ))}

        {products.length === 0 && (
          <p>No products have been added yet.</p>
        )}
      </div>

    </main>
  )
}
