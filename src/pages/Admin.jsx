
import { useEffect, useState } from 'react'
import { supabase, money } from '../lib/supabase'
import { categories } from '../data/categories'
import { LogOut, Plus, Pencil, Trash2, X, PackageCheck } from 'lucide-react'

const blank = {
  name: '',
  collection: 'apparel',
  category: 'T-Shirts',
  description: '',
  price: '',
  sale_price: '',
  is_special: false,
  image_url: '',
  active: true
}

const blankVariant = {
  id: null,
  size: 'One Size',
  color: 'Default',
  stock: 0
}

export default function Admin() {
  const [session, setSession] = useState(null)
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [orderItems, setOrderItems] = useState([])

  const [form, setForm] = useState(blank)
  const [variants, setVariants] = useState([{ ...blankVariant }])
  const [editing, setEditing] = useState(null)
  const [file, setFile] = useState(null)

  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('products')

  // Load products
  const loadProducts = async () => {
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

  // Load orders and their items
  const loadOrders = async () => {
    const { data: orderData, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      setMessage(`Could not load orders: ${error.message}`)
      return
    }

    const loadedOrders = orderData || []
    setOrders(loadedOrders)

    if (!loadedOrders.length) {
      setOrderItems([])
      return
    }

    const orderIds = loadedOrders.map(order => order.id)

    const { data: items, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .in('order_id', orderIds)

    if (itemsError) {
      setMessage(`Could not load order items: ${itemsError.message}`)
      return
    }

    setOrderItems(items || [])
  }

  // Verify admin account
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

    if (error || !data) {
      setAuthorized(false)
      setMessage(
        error
          ? `Admin verification failed: ${error.message}`
          : 'This account is not registered as an admin.'
      )
      return
    }

    setAuthorized(true)
    setMessage('')

    await Promise.all([
      loadProducts(),
      loadOrders()
    ])
  }

  // Session handling
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
    setLoading(true)

    const { error } = await supabase.auth.signOut()

    if (error) {
      setMessage(error.message)
    } else {
      setSession(null)
      setAuthorized(false)
      setProducts([])
      setOrders([])
      setOrderItems([])
      setMessage('')
    }

    setLoading(false)
  }

  const change = (key, value) => {
    setForm(current => ({
      ...current,
      [key]: value
    }))
  }

  // Variation form helpers
  const changeVariant = (index, key, value) => {
    setVariants(current =>
      current.map((variant, i) =>
        i === index
          ? { ...variant, [key]: value }
          : variant
      )
    )
  }

  const addVariant = () => {
    setVariants(current => [
      ...current,
      {
        ...blankVariant,
        id: null,
        size: '',
        color: '',
        stock: 0
      }
    ])
  }

  const removeVariant = (index) => {
    if (variants.length === 1) {
      setMessage('A product must have at least one variation.')
      return
    }

    setVariants(current =>
      current.filter((_, i) => i !== index)
    )
  }

  // Start editing a product and load its variations
  const startEdit = async (product) => {
    setLoading(true)
    setMessage('Loading product variations...')

    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', product.id)
      .order('created_at', { ascending: true })

    if (error) {
      setMessage(`Could not load variations: ${error.message}`)
      setLoading(false)
      return
    }

    setEditing(product.id)

    setForm({
      ...product,
      price: String(product.price),
      sale_price:
        product.sale_price == null
          ? ''
          : String(product.sale_price)
    })

    setVariants(
      data?.length
        ? data.map(variant => ({
            id: variant.id,
            size: variant.size,
            color: variant.color,
            stock: variant.stock
          }))
        : [{ ...blankVariant }]
    )

    setFile(null)
    setMessage('')

    setLoading(false)

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  // Reset product form
  const reset = () => {
    setEditing(null)
    setForm({ ...blank })
    setVariants([{ ...blankVariant }])
    setFile(null)
    setMessage('')
  }

  // Save product and variations
  const save = async (e) => {
    e.preventDefault()

    if (!supabase) return

    setLoading(true)
    setMessage('Saving product...')

    try {
      if (!variants.length) {
        throw new Error('Add at least one product variation.')
      }

      const cleanedVariants = variants.map(variant => ({
        ...variant,
        size: variant.size.trim(),
        color: variant.color.trim(),
        stock: Number(variant.stock)
      }))

      for (const variant of cleanedVariants) {
        if (!variant.size || !variant.color) {
          throw new Error('Every variation needs a size and colour.')
        }

        if (
          !Number.isInteger(variant.stock) ||
          variant.stock < 0
        ) {
          throw new Error('Stock must be a whole number of 0 or more.')
        }
      }

      const combinations = cleanedVariants.map(
        variant => `${variant.size.toLowerCase()}-${variant.color.toLowerCase()}`
      )

      if (new Set(combinations).size !== combinations.length) {
        throw new Error('You have entered the same size and colour twice.')
      }

      let imageUrl = form.image_url

      // Upload product image
      if (file) {
        const extension = file.name.split('.').pop()
        const path = `${crypto.randomUUID()}.${extension}`

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(path, file, { upsert: false })

        if (uploadError) throw uploadError

        const { data } = supabase.storage
          .from('product-images')
          .getPublicUrl(path)

        imageUrl = data.publicUrl
      }

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
        image_url: imageUrl,
        active: Boolean(form.active),
        updated_at: new Date().toISOString()
      }

      let productId = editing

      if (editing) {
        const { error } = await supabase
          .from('products')
          .update(payload)
          .eq('id', editing)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('products')
          .insert({
            ...payload,
            stock: 0
          })
          .select('id')
          .single()

        if (error) throw error

        productId = data.id
      }

      // Save each variation.
      // Existing variation IDs are preserved for order history.
      for (const variant of cleanedVariants) {
        const variantPayload = {
          product_id: productId,
          size: variant.size,
          color: variant.color,
          stock: variant.stock
        }

        if (variant.id) {
          const { error } = await supabase
            .from('product_variants')
            .update(variantPayload)
            .eq('id', variant.id)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('product_variants')
            .insert(variantPayload)

          if (error) throw error
        }
      }

      // Variations removed from the form are set to zero stock.
      // They are not deleted, preserving any linked order history.
      if (editing) {
        const currentIds = cleanedVariants
          .filter(variant => variant.id)
          .map(variant => variant.id)

        const { data: oldVariants, error: oldError } = await supabase
          .from('product_variants')
          .select('id')
          .eq('product_id', productId)

        if (oldError) throw oldError

        const removedIds = (oldVariants || [])
          .map(variant => variant.id)
          .filter(id => !currentIds.includes(id))

        if (removedIds.length) {
          const { error } = await supabase
            .from('product_variants')
            .update({ stock: 0 })
            .in('id', removedIds)

          if (error) throw error
        }
      }

      setMessage('Product and variations saved successfully!')
      reset()

      await loadProducts()

    } catch (error) {
      console.error('Product save error:', error)
      setMessage(error.message || 'Something went wrong while saving.')
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

  // Confirm payment and deduct stock
  const confirmPayment = async (order) => {
    const confirmed = window.confirm(
      `Confirm that payment for order ${order.id} has been received? Stock will be deducted.`
    )

    if (!confirmed) return

    setLoading(true)
    setMessage(`Confirming payment for order ${order.id}...`)

    const { error } = await supabase.rpc(
      'confirm_store_order_payment',
      { p_order_id: order.id }
    )

    if (error) {
      setMessage(`Payment could not be confirmed: ${error.message}`)
    } else {
      setMessage('Payment confirmed and stock updated successfully.')

      await Promise.all([
        loadOrders(),
        loadProducts()
      ])
    }

    setLoading(false)
  }

  // Cancel pending order
  const cancelOrder = async (order) => {
    const confirmed = window.confirm(
      `Cancel order ${order.id}?`
    )

    if (!confirmed) return

    setLoading(true)

    const { error } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', order.id)
      .eq('status', 'pending_payment')

    if (error) {
      setMessage(`Could not cancel order: ${error.message}`)
    } else {
      setMessage('Order cancelled.')
      await loadOrders()
    }

    setLoading(false)
  }

  // Loading screen
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
        <form className="admin-login-card" onSubmit={signIn}>
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

          {message && <p className="notice">{message}</p>}

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
          <h1>ADMIN DASHBOARD</h1>
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

      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}

      {/* Dashboard tabs */}
      <div className="category-tabs admin-tabs">
        <button
          className={tab === 'products' ? 'active' : ''}
          onClick={() => setTab('products')}
        >
          PRODUCTS & STOCK ({products.length})
        </button>

        <button
          className={tab === 'orders' ? 'active' : ''}
          onClick={() => setTab('orders')}
        >
          ORDERS ({orders.filter(order => order.status === 'pending_payment').length} PENDING)
        </button>
      </div>

      {tab === 'products' && (
        <>
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
                  <option value="apparel">BlaQ Dawg Vintage — Apparel</option>
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

              <label className="span-two">
                Product description
                <textarea
                  rows="3"
                  value={form.description}
                  onChange={e => change('description', e.target.value)}
                />
              </label>

              <label className="span-two">
                Product image
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
                <small>
                  Upload a product photo to the Supabase product-images bucket.
                </small>
                {form.image_url && !file && (
                  <img
                    src={form.image_url}
                    alt="Current product"
                    style={{ width: 100, marginTop: 10, borderRadius: 6 }}
                  />
                )}
              </label>
            </div>

            {/* Variations */}
            <div className="admin-variants">
              <div className="admin-form-heading">
                <div>
                  <h2>SIZE, COLOUR & STOCK</h2>
                  <p>Add each available size and colour combination.</p>
                </div>

                <button
                  type="button"
                  className="button button-outline-dark"
                  onClick={addVariant}
                >
                  <Plus size={16} />
                  ADD VARIATION
                </button>
              </div>

              {variants.map((variant, index) => (
                <div className="admin-variant-row" key={variant.id || index}>
                  <label>
                    Size
                    <input
                      required
                      value={variant.size}
                      placeholder="e.g. Small, Medium, 18 inch"
                      onChange={e =>
                        changeVariant(index, 'size', e.target.value)
                      }
                    />
                  </label>

                  <label>
                    Colour
                    <input
                      required
                      value={variant.color}
                      placeholder="e.g. Black, White"
                      onChange={e =>
                        changeVariant(index, 'color', e.target.value)
                      }
                    />
                  </label>

                  <label>
                    Stock
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={variant.stock}
                      onChange={e =>
                        changeVariant(index, 'stock', e.target.value)
                      }
                    />
                  </label>

                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => removeVariant(index)}
                    aria-label="Remove variation"
                    title="Remove variation"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}

              <p className="small-note">
                The total product stock is calculated automatically from all
                its variations. Set a variation's stock to 0 when unavailable.
              </p>
            </div>

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
                    {money(product.price)} · Total stock: {product.stock}
                  </span>

                  <small>
                    {product.active ? 'Visible' : 'Hidden'}
                    {product.is_special ? ' · Special' : ''}
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
        </>
      )}

      {tab === 'orders' && (
        <section className="admin-orders">
          <div className="inventory-heading">
            <h2>CUSTOMER ORDERS ({orders.length})</h2>

            <button
              className="button button-outline-dark"
              onClick={loadOrders}
              disabled={loading}
            >
              REFRESH ORDERS
            </button>
          </div>

          {orders.length === 0 ? (
            <p className="empty-state">No customer orders yet.</p>
          ) : (
            orders.map(order => {
              const items = orderItems.filter(
                item => item.order_id === order.id
              )

              return (
                <article className="admin-order-card" key={order.id}>
                  <div className="admin-order-heading">
                    <div>
                      <h3>ORDER #{order.id.slice(0, 8).toUpperCase()}</h3>
                      <small>
                        {new Date(order.created_at).toLocaleString('en-ZA')}
                      </small>
                    </div>

                    <span className={`order-status ${order.status}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="admin-order-customer">
                    <p><b>Customer:</b> {order.customer_name}</p>
                    <p><b>Phone:</b> {order.customer_phone}</p>
                    <p><b>Delivery address:</b> {order.delivery_address}</p>
                    {order.notes && (
                      <p><b>Notes:</b> {order.notes}</p>
                    )}
                  </div>

                  <div className="admin-order-items">
                    <h4>ORDER ITEMS</h4>

                    {items.map(item => (
                      <div className="admin-order-item" key={item.id}>
                        <div>
                          <b>{item.product_name}</b>
                          <small>
                            {item.size !== 'One Size' ? `Size: ${item.size} · ` : ''}
                            {item.color !== 'Default' ? `Colour: ${item.color}` : ''}
                          </small>
                          <small>Quantity: {item.quantity}</small>
                        </div>

                        <strong>{money(item.line_total)}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="admin-order-total">
                    <p>Subtotal: <b>{money(order.subtotal)}</b></p>
                    <p>Delivery: <b>{money(order.delivery_fee)}</b></p>
                    <h3>Total: {money(order.total)}</h3>
                  </div>

                  {order.status === 'pending_payment' && (
                    <div className="admin-order-actions">
                      <button
                        className="button button-dark"
                        onClick={() => confirmPayment(order)}
                        disabled={loading}
                      >
                        <PackageCheck size={16} />
                        CONFIRM PAYMENT
                      </button>

                      <button
                        className="button button-outline-dark"
                        onClick={() => cancelOrder(order)}
                        disabled={loading}
                      >
                        CANCEL ORDER
                      </button>
                    </div>
                  )}

                  {order.status === 'paid' && (
                    <p className="small-note">
                      Payment confirmed
                      {order.paid_at
                        ? ` on ${new Date(order.paid_at).toLocaleString('en-ZA')}`
                        : ''}
                    </p>
                  )}
                </article>
              )
            })
          )}
        </section>
      )}
    </main>
  )
}
