
import { useEffect, useState } from 'react'
import { supabase, money } from '../lib/supabase'
import { categories } from '../data/categories'
import {
  LogOut,
  Plus,
  Pencil,
  Trash2,
  X,
  PackageCheck,
  Package,
  ShoppingBag,
  RefreshCw,
  FileText,
  ExternalLink
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

  const [proofUrls, setProofUrls] = useState({})
  const [proofErrors, setProofErrors] = useState({})

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

  // Load orders, items and proof-of-payment links
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
    setProofUrls({})
    setProofErrors({})

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

    // Generate temporary signed URLs for private payment proofs
    const uploadedOrders = loadedOrders.filter(
      order => order.proof_file_path
    )

    const urls = {}
    const errors = {}

    await Promise.all(
      uploadedOrders.map(async order => {
        const { data, error } = await supabase.storage
          .from('payment-proofs')
          .createSignedUrl(order.proof_file_path, 3600)

        if (error) {
          errors[order.id] = error.message
        } else {
          urls[order.id] = data.signedUrl
        }
      })
    )

    setProofUrls(urls)
    setProofErrors(errors)
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
      setProofUrls({})
      setProofErrors({})
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

  // Variation helpers
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

  // Start editing product
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

  // Reset form
  const reset = () => {
    setEditing(null)
    setForm({ ...blank })
    setVariants([{ ...blankVariant }])
    setFile(null)
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
        variant =>
          `${variant.size.toLowerCase()}-${variant.color.toLowerCase()}`
      )

      if (new Set(combinations).size !== combinations.length) {
        throw new Error('You have entered the same size and colour twice.')
      }

      let imageUrl = form.image_url

      // Upload image
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

      // Get original variation IDs before inserting new ones
      let originalVariantIds = []

      if (editing) {
        const { data: oldVariants, error: oldError } = await supabase
          .from('product_variants')
          .select('id')
          .eq('product_id', productId)

        if (oldError) throw oldError

        originalVariantIds = (oldVariants || []).map(item => item.id)
      }

      // Save variations
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

      // Set removed original variations to zero stock
      if (editing) {
        const currentIds = cleanedVariants
          .filter(variant => variant.id)
          .map(variant => variant.id)

        const removedIds = originalVariantIds.filter(
          id => !currentIds.includes(id)
        )

        if (removedIds.length) {
          const { error } = await supabase
            .from('product_variants')
            .update({ stock: 0 })
            .in('id', removedIds)

          if (error) throw error
        }
      }

      reset()
      setMessage('Product and variations saved successfully!')

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
      `Have you checked the bank account and confirmed that R${Number(order.total).toFixed(2)} has actually been received for order ${order.id}? Stock will be deducted.`
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
      <main className="min-h-[60vh] flex items-center justify-center px-5">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
          <p className="text-sm text-gray-500">Checking admin access...</p>
        </div>
      </main>
    )
  }

  if (!supabase) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-16">
        <div className="border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          Please configure your Supabase environment variables.
        </div>
      </main>
    )
  }

  // Login screen
  if (!session || !authorized) {
    return (
      <main className="flex min-h-[75vh] items-center justify-center bg-gray-50 px-5 py-16">
        <form
          onSubmit={signIn}
          className="w-full max-w-md border border-gray-200 bg-white p-7 shadow-sm sm:p-10"
        >
          <p className="mb-3 text-[10px] font-black tracking-[3px] text-gray-500">
            BLAQ DAWG STORE
          </p>

          <h1 className="text-3xl font-black tracking-tight">
            ADMIN LOGIN
          </h1>

          <p className="mb-8 mt-2 text-sm text-gray-500">
            Sign in with your authorised store account.
          </p>

          <label className="mb-5 block text-xs font-bold">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mt-2 w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="admin@example.com"
            />
          </label>

          <label className="mb-6 block text-xs font-bold">
            Password
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-2 w-full border border-gray-300 px-4 py-3 text-sm outline-none focus:border-black"
              placeholder="Enter your password"
            />
          </label>

          {message && (
            <p className="mb-5 border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center bg-black px-5 py-4 text-xs font-black tracking-widest text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'PLEASE WAIT...' : 'SIGN IN'}
          </button>
        </form>
      </main>
    )
  }

  const pendingOrders = orders.filter(
    order => order.status === 'pending_payment'
  ).length

  const paidOrders = orders.filter(
    order => order.status === 'paid'
  ).length

  const lowStockProducts = products.filter(
    product => product.stock > 0 && product.stock < 5
  ).length

  const proofsAwaitingReview = orders.filter(
    order => order.status === 'pending_payment' && order.proof_file_path
  ).length

  // Admin dashboard
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* Header */}
        <header className="mb-8 flex flex-col justify-between gap-5 border-b border-gray-200 pb-7 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-[10px] font-black tracking-[3px] text-gray-500">
              BLAQ DAWG VINTAGE
            </p>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              ADMIN DASHBOARD
            </h1>

            <p className="mt-2 text-xs text-gray-500">
              Signed in as {session.user.email}
            </p>
          </div>

          <button
            onClick={signOut}
            disabled={loading}
            className="flex items-center justify-center gap-2 border border-gray-300 bg-white px-5 py-3 text-xs font-black tracking-wider transition hover:border-black hover:bg-black hover:text-white disabled:opacity-50"
          >
            <LogOut size={16} />
            SIGN OUT
          </button>
        </header>

        {/* Feedback message */}
        {message && (
          <div
            role="status"
            className="mb-6 flex items-start justify-between gap-4 border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700"
          >
            <span>{message}</span>
            <button
              onClick={() => setMessage('')}
              className="text-gray-400 hover:text-black"
              aria-label="Dismiss message"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Dashboard summary */}
        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="border border-gray-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <Package size={19} className="text-gray-500" />
              <span className="text-[9px] font-bold tracking-wider text-gray-400">
                INVENTORY
              </span>
            </div>
            <p className="text-2xl font-black">{products.length}</p>
            <p className="mt-1 text-xs text-gray-500">Total products</p>
          </div>

          <div className="border border-gray-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <ShoppingBag size={19} className="text-gray-500" />
              <span className="text-[9px] font-bold tracking-wider text-gray-400">
                ORDERS
              </span>
            </div>
            <p className="text-2xl font-black">{orders.length}</p>
            <p className="mt-1 text-xs text-gray-500">All orders</p>
          </div>

          <div className="border border-gray-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <PackageCheck size={19} className="text-gray-500" />
              <span className="text-[9px] font-bold tracking-wider text-gray-400">
                PENDING
              </span>
            </div>
            <p className="text-2xl font-black">{pendingOrders}</p>
            <p className="mt-1 text-xs text-gray-500">Awaiting payment</p>
          </div>

          <div className="border border-gray-200 bg-white p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <FileText size={19} className="text-gray-500" />
              <span className="text-[9px] font-bold tracking-wider text-gray-400">
                PROOFS
              </span>
            </div>
            <p className="text-2xl font-black">{proofsAwaitingReview}</p>
            <p className="mt-1 text-xs text-gray-500">Awaiting review</p>
          </div>
        </section>

        {/* Tabs */}
        <div className="mb-8 flex border-b border-gray-200">
          <button
            onClick={() => setTab('products')}
            className={`flex-1 border-b-2 px-3 py-4 text-center text-[10px] font-black tracking-wider transition sm:flex-none sm:px-8 ${
              tab === 'products'
                ? 'border-black bg-black text-white'
                : 'border-transparent bg-white text-gray-500 hover:text-black'
            }`}
          >
            PRODUCTS & STOCK ({products.length})
          </button>

          <button
            onClick={() => setTab('orders')}
            className={`flex-1 border-b-2 px-3 py-4 text-center text-[10px] font-black tracking-wider transition sm:flex-none sm:px-8 ${
              tab === 'orders'
                ? 'border-black bg-black text-white'
                : 'border-transparent bg-white text-gray-500 hover:text-black'
            }`}
          >
            ORDERS ({pendingOrders} PENDING)
          </button>
        </div>

        {/* PRODUCTS TAB */}
        {tab === 'products' && (
          <div className="space-y-10">

            {/* Product form */}
            <form
              onSubmit={save}
              className="border border-gray-200 bg-white p-5 sm:p-8"
            >
              <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5">
                <div>
                  <p className="mb-1 text-[9px] font-black tracking-[2px] text-gray-400">
                    INVENTORY MANAGEMENT
                  </p>
                  <h2 className="text-xl font-black">
                    {editing ? 'EDIT PRODUCT' : 'ADD NEW PRODUCT'}
                  </h2>
                </div>

                {editing && (
                  <button
                    type="button"
                    onClick={reset}
                    className="text-xs font-bold text-gray-500 underline hover:text-black"
                  >
                    Cancel edit
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-x-6 gap-y-1 md:grid-cols-2">

                <label className="mb-4 block text-xs font-bold">
                  Product name
                  <input
                    required
                    value={form.name}
                    onChange={e => change('name', e.target.value)}
                    className="mt-2 w-full border border-gray-300 px-3 py-3 text-sm outline-none focus:border-black"
                    placeholder="Enter product name"
                  />
                </label>

                <label className="mb-4 block text-xs font-bold">
                  Collection
                  <select
                    value={form.collection}
                    onChange={e => {
                      const collection = e.target.value
                      change('collection', collection)
                      change('category', categories[collection][1])
                    }}
                    className="mt-2 w-full border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-black"
                  >
                    <option value="apparel">BlaQ Dawg Vintage — Apparel</option>
                    <option value="weaves">Weaves</option>
                  </select>
                </label>

                <label className="mb-4 block text-xs font-bold">
                  Category
                  <select
                    value={form.category}
                    onChange={e => change('category', e.target.value)}
                    className="mt-2 w-full border border-gray-300 bg-white px-3 py-3 text-sm outline-none focus:border-black"
                  >
                    {categories[form.collection].slice(1).map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="mb-4 block text-xs font-bold">
                  Price (R)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.price}
                    onChange={e => change('price', e.target.value)}
                    className="mt-2 w-full border border-gray-300 px-3 py-3 text-sm outline-none focus:border-black"
                    placeholder="0.00"
                  />
                </label>

                <label className="mb-4 block text-xs font-bold">
                  Special price (R)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sale_price}
                    onChange={e => change('sale_price', e.target.value)}
                    className="mt-2 w-full border border-gray-300 px-3 py-3 text-sm outline-none focus:border-black"
                    placeholder="Optional"
                  />
                </label>

                <label className="mb-4 block text-xs font-bold md:col-span-2">
                  Product description
                  <textarea
                    rows="4"
                    value={form.description}
                    onChange={e => change('description', e.target.value)}
                    className="mt-2 w-full border border-gray-300 px-3 py-3 text-sm outline-none focus:border-black"
                    placeholder="Describe the product..."
                  />
                </label>

                <label className="mb-4 block text-xs font-bold md:col-span-2">
                  Product image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setFile(e.target.files?.[0] || null)}
                    className="mt-2 block w-full border border-gray-300 bg-white px-3 py-3 text-xs file:mr-4 file:border-0 file:bg-black file:px-4 file:py-2 file:text-xs file:font-bold file:text-white"
                  />

                  <span className="mt-2 block text-[10px] font-normal text-gray-400">
                    Upload a product photo to the Supabase product-images bucket.
                  </span>

                  {file && (
                    <span className="mt-2 block text-xs text-gray-600">
                      Selected: {file.name}
                    </span>
                  )}

                  {form.image_url && !file && (
                    <img
                      src={form.image_url}
                      alt="Current product"
                      className="mt-3 h-28 w-28 border border-gray-200 object-cover"
                    />
                  )}
                </label>
              </div>

              {/* Variations */}
              <div className="mt-7 border border-gray-200 bg-gray-50 p-4 sm:p-6">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black tracking-wide">
                      SIZE, COLOUR & STOCK
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Add each available size and colour combination.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addVariant}
                    className="flex items-center gap-2 bg-black px-4 py-3 text-[10px] font-black tracking-wider text-white transition hover:bg-gray-700"
                  >
                    <Plus size={15} />
                    ADD VARIATION
                  </button>
                </div>

                <div className="space-y-3">
                  {variants.map((variant, index) => (
                    <div
                      key={variant.id || index}
                      className="grid grid-cols-1 gap-3 border border-gray-200 bg-white p-4 sm:grid-cols-[1fr_1fr_110px_40px] sm:items-end"
                    >
                      <label className="block text-[10px] font-bold">
                        SIZE
                        <input
                          required
                          value={variant.size}
                          placeholder="e.g. Small, Medium, 18 inch"
                          onChange={e =>
                            changeVariant(index, 'size', e.target.value)
                          }
                          className="mt-2 w-full border border-gray-300 px-3 py-3 text-xs outline-none focus:border-black"
                        />
                      </label>

                      <label className="block text-[10px] font-bold">
                        COLOUR
                        <input
                          required
                          value={variant.color}
                          placeholder="e.g. Black, White"
                          onChange={e =>
                            changeVariant(index, 'color', e.target.value)
                          }
                          className="mt-2 w-full border border-gray-300 px-3 py-3 text-xs outline-none focus:border-black"
                        />
                      </label>

                      <label className="block text-[10px] font-bold">
                        STOCK
                        <input
                          type="number"
                          min="0"
                          step="1"
                          required
                          value={variant.stock}
                          onChange={e =>
                            changeVariant(index, 'stock', e.target.value)
                          }
                          className="mt-2 w-full border border-gray-300 px-3 py-3 text-xs outline-none focus:border-black"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        aria-label="Remove variation"
                        title="Remove variation"
                        className="flex h-10 w-10 items-center justify-center border border-gray-200 text-gray-500 transition hover:border-red-600 hover:bg-red-600 hover:text-white"
                      >
                        <X size={17} />
                      </button>
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-[10px] leading-5 text-gray-500">
                  Total product stock is calculated automatically from all
                  variations. Set a variation's stock to 0 when unavailable.
                </p>
              </div>

              {/* Product settings */}
              <div className="my-6 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:gap-8">
                <label className="flex items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={form.is_special}
                    onChange={e => change('is_special', e.target.checked)}
                    className="h-4 w-4 accent-black"
                  />
                  Show as a special
                </label>

                <label className="flex items-center gap-2 text-xs font-bold">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={e => change('active', e.target.checked)}
                    className="h-4 w-4 accent-black"
                  />
                  Visible in store
                </label>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center gap-2 bg-black px-7 py-4 text-xs font-black tracking-widest text-white transition hover:bg-gray-700 disabled:opacity-50"
                >
                  <Plus size={16} />
                  {loading
                    ? 'SAVING...'
                    : editing
                      ? 'UPDATE PRODUCT'
                      : 'ADD PRODUCT'}
                </button>

                {editing && (
                  <button
                    type="button"
                    onClick={reset}
                    className="border border-gray-300 px-7 py-4 text-xs font-bold tracking-wider hover:border-black"
                  >
                    CANCEL
                  </button>
                )}
              </div>
            </form>

            {/* Inventory */}
            <section>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black tracking-[2px] text-gray-400">
                    STORE INVENTORY
                  </p>
                  <h2 className="text-xl font-black">
                    ALL PRODUCTS ({products.length})
                  </h2>
                </div>
              </div>

              <div className="border border-gray-200 bg-white">
                {products.map(product => (
                  <div
                    key={product.id}
                    className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4 last:border-0 sm:flex-nowrap sm:gap-5 sm:p-5"
                  >
                    <div className="h-16 w-16 flex-shrink-0 bg-gray-100">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-black text-gray-400">
                          BD
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-black">
                        {product.name}
                      </h3>

                      <p className="mt-1 text-[10px] text-gray-500">
                        {product.collection} · {product.category}
                      </p>

                      <p className="mt-1 text-xs font-bold">
                        {money(product.price)}
                        <span className="ml-2 font-normal text-gray-500">
                          Stock: {product.stock}
                        </span>
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`px-2 py-1 text-[9px] font-bold ${
                          product.active
                            ? 'bg-green-50 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {product.active ? 'VISIBLE' : 'HIDDEN'}
                        </span>

                        {product.is_special && (
                          <span className="bg-black px-2 py-1 text-[9px] font-bold text-white">
                            SPECIAL
                          </span>
                        )}

                        {product.stock > 0 && product.stock < 5 && (
                          <span className="bg-orange-50 px-2 py-1 text-[9px] font-bold text-orange-700">
                            LOW STOCK
                          </span>
                        )}

                        {product.stock === 0 && (
                          <span className="bg-red-50 px-2 py-1 text-[9px] font-bold text-red-700">
                            OUT OF STOCK
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => startEdit(product)}
                        aria-label="Edit product"
                        disabled={loading}
                        className="flex h-10 w-10 items-center justify-center border border-gray-200 transition hover:bg-black hover:text-white disabled:opacity-40"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => deleteProduct(product)}
                        aria-label="Delete product"
                        disabled={loading}
                        className="flex h-10 w-10 items-center justify-center border border-gray-200 text-gray-500 transition hover:border-red-600 hover:bg-red-600 hover:text-white disabled:opacity-40"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}

                {products.length === 0 && (
                  <p className="p-10 text-center text-sm text-gray-500">
                    No products have been added yet.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[9px] font-black tracking-[2px] text-gray-400">
                  CUSTOMER MANAGEMENT
                </p>
                <h2 className="text-xl font-black">
                  CUSTOMER ORDERS ({orders.length})
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  {pendingOrders} awaiting payment · {paidOrders} paid · {proofsAwaitingReview} proofs submitted
                </p>
              </div>

              <button
                onClick={loadOrders}
                disabled={loading}
                className="flex items-center gap-2 border border-gray-300 bg-white px-4 py-3 text-[10px] font-black tracking-wider transition hover:border-black hover:bg-black hover:text-white"
              >
                <RefreshCw size={14} />
                REFRESH ORDERS
              </button>
            </div>

            {orders.length === 0 ? (
              <div className="border border-gray-200 bg-white px-5 py-16 text-center">
                <ShoppingBag size={30} className="mx-auto mb-4 text-gray-300" />
                <p className="font-bold">No customer orders yet.</p>
                <p className="mt-2 text-xs text-gray-500">
                  New customer orders will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {orders.map(order => {
                  const items = orderItems.filter(
                    item => item.order_id === order.id
                  )

                  const statusStyle =
                    order.status === 'paid'
                      ? 'border-green-200 bg-green-50 text-green-700'
                      : order.status === 'cancelled'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-orange-200 bg-orange-50 text-orange-700'

                  return (
                    <article
                      className="border border-gray-200 bg-white"
                      key={order.id}
                    >
                      {/* Order header */}
                      <div className="flex flex-col justify-between gap-3 border-b border-gray-100 p-5 sm:flex-row sm:items-center">
                        <div>
                          <p className="text-[9px] font-black tracking-[2px] text-gray-400">
                            ORDER REFERENCE
                          </p>
                          <h3 className="mt-1 text-lg font-black">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </h3>
                          <p className="mt-1 text-[10px] text-gray-500">
                            {new Date(order.created_at).toLocaleString('en-ZA')}
                          </p>
                        </div>

                        <span className={`w-fit border px-3 py-2 text-[9px] font-black tracking-wider uppercase ${statusStyle}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-6 p-5 lg:grid-cols-2">

                        {/* Customer details */}
                        <div>
                          <h4 className="mb-3 text-[10px] font-black tracking-widest text-gray-400">
                            CUSTOMER DETAILS
                          </h4>

                          <div className="space-y-2 text-xs">
                            <p>
                              <span className="font-bold">Customer:</span>{' '}
                              {order.customer_name}
                            </p>

                            <p>
                              <span className="font-bold">Phone:</span>{' '}
                              {order.customer_phone}
                            </p>

                            <p className="break-words">
                              <span className="font-bold">Delivery address:</span>{' '}
                              {order.delivery_address}
                            </p>

                            {order.notes && (
                              <p className="break-words">
                                <span className="font-bold">Notes:</span>{' '}
                                {order.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Items */}
                        <div>
                          <h4 className="mb-3 text-[10px] font-black tracking-widest text-gray-400">
                            ORDER ITEMS
                          </h4>

                          {items.length === 0 ? (
                            <p className="text-xs text-gray-500">
                              No order items found.
                            </p>
                          ) : (
                            <div className="divide-y divide-gray-100">
                              {items.map(item => (
                                <div
                                  className="flex justify-between gap-4 py-3 first:pt-0"
                                  key={item.id}
                                >
                                  <div>
                                    <p className="text-xs font-bold">
                                      {item.product_name}
                                    </p>

                                    <p className="mt-1 text-[10px] text-gray-500">
                                      {item.size !== 'One Size'
                                        ? `Size: ${item.size} · `
                                        : ''}
                                      {item.color !== 'Default'
                                        ? `Colour: ${item.color}`
                                        : ''}
                                    </p>

                                    <p className="mt-1 text-[10px] text-gray-500">
                                      Quantity: {item.quantity}
                                    </p>
                                  </div>

                                  <strong className="whitespace-nowrap text-xs">
                                    {money(item.line_total)}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Order totals */}
                      <div className="border-t border-gray-100 bg-gray-50 p-5">
                        <div className="ml-auto max-w-sm space-y-3">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Subtotal</span>
                            <strong>{money(order.subtotal)}</strong>
                          </div>

                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">Delivery</span>
                            <strong>{money(order.delivery_fee)}</strong>
                          </div>

                          <div className="flex justify-between border-t border-gray-200 pt-3">
                            <span className="text-sm font-black">TOTAL</span>
                            <strong className="text-lg font-black">
                              {money(order.total)}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Proof of payment */}
                      <div className="border-t border-gray-100 p-5">
                        <h4 className="mb-3 flex items-center gap-2 text-[10px] font-black tracking-widest text-gray-400">
                          <FileText size={15} />
                          PROOF OF PAYMENT
                        </h4>

                        {order.proof_file_path ? (
                          <div className="border border-gray-200 bg-gray-50 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-xs font-bold text-green-700">
                                  Proof uploaded
                                </p>

                                {order.proof_uploaded_at && (
                                  <p className="mt-1 text-[10px] text-gray-500">
                                    Uploaded:{' '}
                                    {new Date(order.proof_uploaded_at).toLocaleString('en-ZA')}
                                  </p>
                                )}
                              </div>

                              {proofUrls[order.id] ? (
                                <a
                                  href={proofUrls[order.id]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center gap-2 bg-black px-5 py-3 text-[10px] font-black tracking-wider text-white transition hover:bg-gray-700"
                                >
                                  <ExternalLink size={14} />
                                  VIEW PROOF
                                </a>
                              ) : (
                                <div className="text-xs text-red-600">
                                  {proofErrors[order.id] || 'Preparing proof link...'}
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="border border-dashed border-gray-300 p-4 text-xs text-gray-500">
                            No proof of payment uploaded yet.
                          </p>
                        )}
                      </div>

                      {/* Order actions */}
                      {order.status === 'pending_payment' && (
                        <div className="flex flex-col gap-3 border-t border-gray-100 p-5 sm:flex-row">
                          <button
                            onClick={() => confirmPayment(order)}
                            disabled={loading}
                            className="flex items-center justify-center gap-2 bg-black px-5 py-3 text-[10px] font-black tracking-wider text-white transition hover:bg-gray-700 disabled:opacity-50"
                          >
                            <PackageCheck size={16} />
                            CONFIRM PAYMENT
                          </button>

                          <button
                            onClick={() => cancelOrder(order)}
                            disabled={loading}
                            className="border border-gray-300 px-5 py-3 text-[10px] font-black tracking-wider text-gray-600 transition hover:border-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
                          >
                            CANCEL ORDER
                          </button>
                        </div>
                      )}

                      {order.status === 'paid' && (
                        <div className="border-t border-gray-100 p-5">
                          <p className="text-xs font-bold text-green-700">
                            Payment confirmed
                          </p>

                          {order.paid_at && (
                            <p className="mt-1 text-[10px] text-gray-500">
                              {new Date(order.paid_at).toLocaleString('en-ZA')}
                            </p>
                          )}
                        </div>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
