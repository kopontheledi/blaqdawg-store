
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { money, supabase } from '../lib/supabase'
import { useState } from 'react'
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  Copy,
  Upload,
  FileText
} from 'lucide-react'

const DELIVERY_OPTIONS = {
  door_to_door: 150,
  paxi_collection: 60
}

const BANK_DETAILS = {
  bank: 'Capitec',
  accountHolder: 'Mr M Didi',
  accountNumber: '1507132768',
  accountType: 'Savings',
  branchCode: '470010'
}

export default function Cart() {
  const { items, update, remove, subtotal, clear } = useCart()

  const [details, setDetails] = useState({
    name: '',
    phone: '',
    address: '',
    collectionPoint: '',
    collectionTown: '',
    notes: ''
  })

  // No delivery option selected by default.
  const [deliveryMethod, setDeliveryMethod] = useState('')

  const [show, setShow] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')
  const [activeOrder, setActiveOrder] = useState(null)

  const [proofFile, setProofFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [copied, setCopied] = useState(false)

  // Only calculate delivery once an option has been selected.
  const deliveryFee = deliveryMethod
    ? DELIVERY_OPTIONS[deliveryMethod]
    : null

  const total = Number(subtotal) + (deliveryFee ?? 0)

  const submit = async (e) => {
    e.preventDefault()

    if (processing || !items.length) return

    if (!supabase) {
      setError('The store is currently unavailable. Please try again later.')
      return
    }

    if (!deliveryMethod || deliveryFee === undefined || deliveryFee === null) {
      setError('Please select a delivery option before placing your order.')
      return
    }

    if (
      deliveryMethod === 'door_to_door' &&
      !details.address.trim()
    ) {
      setError('Please enter your delivery address.')
      return
    }

    if (
      deliveryMethod === 'paxi_collection' &&
      (!details.collectionPoint.trim() || !details.collectionTown.trim())
    ) {
      setError('Please enter your PEP collection point and town or suburb.')
      return
    }

    setProcessing(true)
    setError('')

    try {
      const { data: orderId, error: orderError } = await supabase.rpc(
        'create_store_order',
        {
          p_customer_name: details.name.trim(),
          p_customer_phone: details.phone.trim(),

          p_delivery_address:
            deliveryMethod === 'door_to_door'
              ? details.address.trim()
              : '',

          p_notes: details.notes.trim(),

          p_items: items.map(item => ({
            variant_id: item.variant_id,
            quantity: item.quantity
          })),

          p_delivery_method: deliveryMethod,

          p_collection_point:
            deliveryMethod === 'paxi_collection'
              ? details.collectionPoint.trim()
              : '',

          p_collection_town:
            deliveryMethod === 'paxi_collection'
              ? details.collectionTown.trim()
              : ''
        }
      )

      if (orderError) throw orderError

      if (!orderId) {
        throw new Error('Your order could not be created. Please try again.')
      }

      // Retrieve the final amount calculated by Supabase.
      const { data: savedOrder, error: fetchError } = await supabase
        .from('orders')
        .select('subtotal, delivery_fee, total')
        .eq('id', orderId)
        .single()

      if (fetchError) throw fetchError

      setActiveOrder({
        id: orderId,
        phone: details.phone.trim(),
        name: details.name.trim(),
        total: Number(savedOrder.total),
        subtotal: Number(savedOrder.subtotal),
        delivery: Number(savedOrder.delivery_fee),
        deliveryMethod,
        address: details.address.trim(),
        collectionPoint: details.collectionPoint.trim(),
        collectionTown: details.collectionTown.trim()
      })

      clear()
      setShow(false)
      setProofFile(null)
      setUploadSuccess(false)
      setUploadError('')

    } catch (err) {
      console.error('Checkout error:', err)

      setError(
        err.message ||
        'Something went wrong while creating your order.'
      )
    } finally {
      setProcessing(false)
    }
  }

  const copyAccountNumber = async () => {
    try {
      await navigator.clipboard.writeText(BANK_DETAILS.accountNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setUploadError('Unable to copy. Please copy the account number manually.')
    }
  }

  const uploadProof = async (e) => {
    e.preventDefault()

    if (!proofFile || !activeOrder || uploading || uploadSuccess) return

    if (!supabase) {
      setUploadError('The store is currently unavailable.')
      return
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'application/pdf'
    ]

    if (!allowedTypes.includes(proofFile.type)) {
      setUploadError('Please upload a JPG, PNG or PDF file.')
      return
    }

    if (proofFile.size > 5 * 1024 * 1024) {
      setUploadError('Your file must not exceed 5 MB.')
      return
    }

    setUploading(true)
    setUploadError('')

    try {
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader()

        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(
          new Error('Could not read your selected file.')
        )

        reader.readAsDataURL(proofFile)
      })

      const { data, error: functionError } =
        await supabase.functions.invoke('upload-payment-proof', {
          body: {
            orderId: activeOrder.id,
            phone: activeOrder.phone,
            fileType: proofFile.type,
            fileBase64
          }
        })

      if (functionError) throw functionError

      if (!data?.success) {
        throw new Error(data?.error || 'Upload failed. Please try again.')
      }

      setUploadSuccess(true)
      setProofFile(null)

    } catch (err) {
      console.error('Proof upload error:', err)

      setUploadError(
        err.message || 'Unable to upload your proof. Please try again.'
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">

      <div className="mb-10 border-b border-gray-200 pb-6">
        <p className="text-xs font-bold tracking-[0.25em] text-gray-500 mb-3">
          YOUR PICKS
        </p>

        <h1 className="text-3xl md:text-4xl font-black tracking-tight">
          SHOPPING BAG
        </h1>

        <p className="text-sm text-gray-500 mt-3">
          {items.length} {items.length === 1 ? 'item' : 'items'} in your bag
        </p>
      </div>

      {/* ORDER CREATED - PAYMENT SECTION */}
      {activeOrder ? (

        <section className="max-w-2xl mx-auto">

          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-green-600" />
            </div>

            <h2 className="text-2xl md:text-3xl font-black mb-3">
              ORDER RECEIVED!
            </h2>

            <p className="text-sm text-gray-500">
              Thank you, {activeOrder.name}. Your order has been created.
            </p>
          </div>

          <div className="border border-gray-200 p-5 md:p-7 mb-6">

            <p className="text-xs font-bold tracking-widest text-gray-500 mb-3">
              YOUR ORDER REFERENCE
            </p>

            <div className="break-all bg-gray-50 p-4 font-mono text-sm font-bold">
              {activeOrder.id}
            </div>

            <div className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Delivery option</span>
                <strong className="text-right">
                  {activeOrder.deliveryMethod === 'paxi_collection'
                    ? 'PEP collection (Paxi)'
                    : 'Door-to-door delivery'}
                </strong>
              </div>

              {activeOrder.deliveryMethod === 'paxi_collection' ? (
                <>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">PEP collection point</span>
                    <strong className="text-right">
                      {activeOrder.collectionPoint}
                    </strong>
                  </div>

                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Town / suburb</span>
                    <strong className="text-right">
                      {activeOrder.collectionTown}
                    </strong>
                  </div>
                </>
              ) : (
                <div className="flex justify-between gap-4">
                  <span className="text-gray-500">Delivery address</span>
                  <strong className="text-right max-w-[60%]">
                    {activeOrder.address}
                  </strong>
                </div>
              )}

              <div className="flex justify-between gap-4">
                <span className="text-gray-500">Delivery fee</span>
                <strong>{money(activeOrder.delivery)}</strong>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-200 flex justify-between items-center">
              <span className="text-sm text-gray-500">
                Amount to pay
              </span>

              <strong className="text-2xl">
                {money(activeOrder.total)}
              </strong>
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Please use your order reference as your EFT payment reference.
            </p>

          </div>

          {/* BANK DETAILS */}
          <div className="bg-gray-50 border border-gray-200 p-5 md:p-7 mb-6">

            <h3 className="font-black tracking-widest text-sm mb-6">
              EFT BANKING DETAILS
            </h3>

            <div className="space-y-4 text-sm">

              {[
                ['Bank', BANK_DETAILS.bank],
                ['Account holder', BANK_DETAILS.accountHolder],
                ['Account type', BANK_DETAILS.accountType],
                ['Account number', BANK_DETAILS.accountNumber],
                ['Branch code', BANK_DETAILS.branchCode]
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between items-center gap-4 border-b border-gray-200 pb-3"
                >
                  <span className="text-gray-500">{label}</span>
                  <strong className="text-right">{value}</strong>
                </div>
              ))}

            </div>

            <button
              type="button"
              onClick={copyAccountNumber}
              className="w-full mt-5 flex items-center justify-center gap-2 border border-black py-3 text-xs font-bold tracking-widest hover:bg-black hover:text-white transition"
            >
              <Copy size={15} />
              {copied ? 'ACCOUNT NUMBER COPIED' : 'COPY ACCOUNT NUMBER'}
            </button>

          </div>

          {/* PAYMENT INSTRUCTIONS */}
          <div className="border border-gray-200 p-5 md:p-7 mb-6">

            <h3 className="font-bold text-sm mb-3">
              PAYMENT INSTRUCTIONS
            </h3>

            <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-600 leading-6">
              <li>Transfer the exact amount shown above.</li>
              <li>Use your order reference as the payment reference.</li>
              <li>Save your proof of payment.</li>
              <li>Upload your proof using the form below.</li>
            </ol>

            <p className="text-xs text-gray-500 mt-5 leading-5">
              Your order will remain pending until the store verifies your payment. Stock is deducted only after payment confirmation.
            </p>

          </div>

          {/* PROOF UPLOAD */}
          <div className="border border-gray-200 p-5 md:p-7">

            <h3 className="font-black tracking-widest text-sm mb-2">
              UPLOAD PROOF OF PAYMENT
            </h3>

            <p className="text-xs text-gray-500 mb-6">
              Accepted formats: JPG, PNG and PDF. Maximum file size: 5 MB.
            </p>

            {uploadSuccess ? (

              <div className="bg-green-50 border border-green-200 p-5 text-center">
                <CheckCircle size={30} className="text-green-600 mx-auto mb-3" />

                <h4 className="font-bold text-sm text-green-800">
                  PROOF SUBMITTED SUCCESSFULLY
                </h4>

                <p className="text-xs text-green-700 mt-2 leading-5">
                  Thank you! The store will review your payment and update your order.
                </p>
              </div>

            ) : (

              <form onSubmit={uploadProof} className="space-y-5">

                <label
                  htmlFor="payment-proof"
                  className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 p-8 cursor-pointer hover:border-black transition"
                >
                  <Upload size={28} className="text-gray-400 mb-3" />

                  <span className="text-sm font-bold">
                    Choose your proof of payment
                  </span>

                  <span className="text-xs text-gray-400 mt-2">
                    JPG, PNG or PDF · Maximum 5 MB
                  </span>

                  <input
                    id="payment-proof"
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                    className="hidden"
                    onChange={e => {
                      setProofFile(e.target.files?.[0] || null)
                      setUploadError('')
                    }}
                  />
                </label>

                {proofFile && (
                  <div className="flex items-center gap-3 bg-gray-50 p-3">
                    <FileText size={20} className="text-gray-500" />

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">
                        {proofFile.name}
                      </p>

                      <p className="text-[11px] text-gray-500">
                        {(proofFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}

                {uploadError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                    <AlertCircle size={17} className="flex-shrink-0" />
                    <p>{uploadError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!proofFile || uploading}
                  className="w-full flex items-center justify-center gap-3 bg-black text-white py-4 px-5 text-xs font-bold tracking-widest hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      UPLOADING...
                    </>
                  ) : (
                    <>
                      <Upload size={17} />
                      SUBMIT PROOF OF PAYMENT
                    </>
                  )}
                </button>

              </form>
            )}

          </div>

          <div className="text-center mt-8">
            <p className="text-xs text-gray-500 leading-5 mb-5">
              Your delivery arrangements and estimated delivery or collection time will be confirmed according to the delivery option you selected. Orders are processed after payment has been confirmed.
            </p>

            <Link
              to="/shop/apparel"
              className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 text-xs font-bold tracking-widest hover:bg-gray-800 transition"
            >
              CONTINUE SHOPPING
            </Link>
          </div>

        </section>

      ) : !items.length ? (

        <div className="min-h-[40vh] flex flex-col items-center justify-center text-center py-16">

          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <ShoppingBag size={32} className="text-gray-400" />
          </div>

          <h2 className="text-2xl font-bold mb-3">
            Your bag is empty
          </h2>

          <p className="text-sm text-gray-500 mb-7">
            Looks like you haven't added anything to your bag yet.
          </p>

          <Link
            to="/shop/apparel"
            className="inline-flex items-center gap-2 bg-black text-white px-8 py-4 text-xs font-bold tracking-widest hover:bg-gray-800 transition"
          >
            <ArrowLeft size={16} />
            START SHOPPING
          </Link>

        </div>

      ) : (

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 lg:gap-12">

          {/* CART ITEMS */}
          <section className="lg:col-span-2">

            <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-6">
              <h2 className="text-sm font-bold tracking-widest">
                YOUR ITEMS
              </h2>

              <Link
                to="/shop/apparel"
                className="text-xs font-semibold text-gray-500 hover:text-black transition"
              >
                Continue shopping
              </Link>
            </div>

            <div className="divide-y divide-gray-200">

              {items.map(item => {
                const unitPrice =
                  item.is_special && item.sale_price != null
                    ? item.sale_price
                    : item.price

                return (
                  <div
                    key={item.cartItemId}
                    className="flex flex-col sm:flex-row gap-5 py-6 min-w-0"
                  >

                    <Link
                      to={`/product/${item.id}`}
                      className="w-full sm:w-32 aspect-[4/3] sm:aspect-[4/5] flex-shrink-0 bg-gray-100 overflow-hidden flex items-center justify-center"
                    >
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-gray-400">
                          BD
                        </div>
                      )}
                    </Link>

                    <div className="flex-1 min-w-0">

                      <div className="flex justify-between gap-4">
                        <div className="min-w-0">
                          <Link to={`/product/${item.id}`}>
                            <h3 className="font-bold text-base hover:text-gray-500 transition break-words">
                              {item.name}
                            </h3>
                          </Link>

                          <p className="text-sm font-semibold mt-2">
                            {money(unitPrice)}
                          </p>
                        </div>

                        <p className="font-bold text-sm whitespace-nowrap">
                          {money(Number(unitPrice) * item.quantity)}
                        </p>
                      </div>

                      <div className="text-xs text-gray-500 mt-3 space-y-1">
                        {item.size && item.size !== 'One Size' && (
                          <p>Size: {item.size}</p>
                        )}

                        {item.color && item.color !== 'Default' && (
                          <p>Colour: {item.color}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-4 mt-5">

                        <div className="flex items-center border border-gray-300">

                          <button
                            type="button"
                            disabled={item.quantity <= 1}
                            onClick={() => update(item.cartItemId, item.quantity - 1)}
                            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition"
                            aria-label="Decrease quantity"
                          >
                            <Minus size={14} />
                          </button>

                          <span className="w-10 text-center text-sm font-semibold">
                            {item.quantity}
                          </span>

                          <button
                            type="button"
                            disabled={item.quantity >= item.stock}
                            onClick={() => update(item.cartItemId, item.quantity + 1)}
                            className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 transition"
                            aria-label="Increase quantity"
                          >
                            <Plus size={14} />
                          </button>

                        </div>

                        <button
                          type="button"
                          onClick={() => remove(item.cartItemId)}
                          className="flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-red-600 transition"
                        >
                          <Trash2 size={14} />
                          Remove
                        </button>

                      </div>

                      <p className="text-[11px] text-gray-400 mt-3">
                        {item.stock} available for this variation
                      </p>

                    </div>
                  </div>
                )
              })}

            </div>
          </section>

          {/* ORDER SUMMARY */}
          <aside className="lg:col-span-1">

            <div className="bg-gray-50 border border-gray-200 p-6 md:p-7 lg:sticky lg:top-24">

              <h2 className="text-sm font-black tracking-widest mb-7">
                ORDER SUMMARY
              </h2>

              <div className="space-y-5 text-sm">

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <strong>{money(subtotal)}</strong>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">
                    {deliveryMethod === 'paxi_collection'
                      ? 'PEP collection'
                      : deliveryMethod === 'door_to_door'
                        ? 'Door-to-door delivery'
                        : 'Delivery'}
                  </span>

                  <strong className="text-right">
                    {deliveryFee !== null
                      ? money(deliveryFee)
                      : 'Select delivery option'}
                  </strong>
                </div>

                <div className="border-t border-gray-200 pt-5 flex items-center justify-between">
                  <span className="font-bold">Total</span>
                  <strong className="text-xl">
                    {money(total)}
                  </strong>
                </div>

              </div>

              <p className="text-xs text-gray-500 leading-5 mt-6">
                Your delivery fee will be calculated according to the delivery option you select at checkout.
              </p>

              <button
                type="button"
                disabled={processing}
                onClick={() => {
                  setShow(!show)
                  setError('')
                }}
                className="w-full mt-7 bg-black text-white py-4 px-5 text-xs font-bold tracking-widest hover:bg-gray-800 transition disabled:opacity-50"
              >
                {show ? 'CLOSE CHECKOUT' : 'PROCEED TO CHECKOUT'}
              </button>

              {show && (
                <form
                  onSubmit={submit}
                  className="mt-7 pt-7 border-t border-gray-200 space-y-5"
                >

                  <div>
                    <h3 className="font-bold text-sm mb-1">
                      DELIVERY DETAILS
                    </h3>

                    <p className="text-xs text-gray-500">
                      Please provide your details and choose how you would like to receive your order.
                    </p>
                  </div>

                  {/* DELIVERY METHOD */}
                  <div>
                    <label className="block text-xs font-bold mb-3">
                      Choose delivery option *
                    </label>

                    <div className="space-y-3">

                      <label className={`flex items-start gap-3 border p-4 cursor-pointer transition ${
                        deliveryMethod === 'door_to_door'
                          ? 'border-black bg-white'
                          : 'border-gray-300 bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="door_to_door"
                          checked={deliveryMethod === 'door_to_door'}
                          onChange={() => {
                            setDeliveryMethod('door_to_door')
                            setError('')
                          }}
                          className="mt-1 accent-black"
                        />

                        <span className="flex-1">
                          <span className="flex justify-between gap-3 text-sm font-bold">
                            Door-to-door delivery
                            <span>{money(150)}</span>
                          </span>

                          <span className="block text-xs text-gray-500 mt-1">
                            Have your order delivered to your address.
                          </span>
                        </span>
                      </label>

                      <label className={`flex items-start gap-3 border p-4 cursor-pointer transition ${
                        deliveryMethod === 'paxi_collection'
                          ? 'border-black bg-white'
                          : 'border-gray-300 bg-white'
                      }`}>
                        <input
                          type="radio"
                          name="deliveryMethod"
                          value="paxi_collection"
                          checked={deliveryMethod === 'paxi_collection'}
                          onChange={() => {
                            setDeliveryMethod('paxi_collection')
                            setError('')
                          }}
                          className="mt-1 accent-black"
                        />

                        <span className="flex-1">
                          <span className="flex justify-between gap-3 text-sm font-bold">
                            PEP collection (Paxi)
                            <span>{money(60)}</span>
                          </span>

                          <span className="block text-xs text-gray-500 mt-1">
                            Collect your order from your selected PEP collection point.
                          </span>
                        </span>
                      </label>

                    </div>
                  </div>

                  {/* CUSTOMER NAME */}
                  <div>
                    <label htmlFor="customer-name" className="block text-xs font-bold mb-2">
                      Full name *
                    </label>

                    <input
                      id="customer-name"
                      required
                      value={details.name}
                      onChange={e => setDetails({ ...details, name: e.target.value })}
                      className="w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                      placeholder="Enter your full name"
                    />
                  </div>

                  {/* CUSTOMER PHONE */}
                  <div>
                    <label htmlFor="customer-phone" className="block text-xs font-bold mb-2">
                      Phone number *
                    </label>

                    <input
                      id="customer-phone"
                      required
                      type="tel"
                      value={details.phone}
                      onChange={e => setDetails({ ...details, phone: e.target.value })}
                      className="w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                      placeholder="Enter your phone number"
                    />
                    <p className="mt-1 text-xs text-gray-500">
  Please ensure that the cellphone number provided above is one we can reach you on for updates regarding your order.
</p>
                  </div>

                  {/* DOOR-TO-DOOR ADDRESS */}
                  {deliveryMethod === 'door_to_door' && (
                    <div>
                      <label htmlFor="customer-address" className="block text-xs font-bold mb-2">
                        Delivery address *
                      </label>

                      <textarea
                        id="customer-address"
                        required
                        rows="3"
                        value={details.address}
                        onChange={e => setDetails({ ...details, address: e.target.value })}
                        className="w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black resize-y"
                        placeholder="Enter your full delivery address"
                      />
                    </div>
                  )}

                  {/* PEP COLLECTION DETAILS */}
                  {deliveryMethod === 'paxi_collection' && (
                    <div className="space-y-4 bg-white border border-gray-200 p-4">

                      <div>
                        <h4 className="font-bold text-sm mb-1">
                          PEP COLLECTION DETAILS
                        </h4>

                        <p className="text-xs text-gray-500 leading-5">
                          Enter the PEP store or collection point where you would like to collect your order.
                        </p>
                      </div>

                      <div>
                        <label htmlFor="collection-point" className="block text-xs font-bold mb-2">
                          PEP store / collection point *
                        </label>

                        <input
                          id="collection-point"
                          required
                          value={details.collectionPoint}
                          onChange={e => setDetails({
                            ...details,
                            collectionPoint: e.target.value
                          })}
                          className="w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                          placeholder="Enter PEP store name or location"
                        />
                      </div>

                      <div>
                        <label htmlFor="collection-town" className="block text-xs font-bold mb-2">
                          Town / suburb *
                        </label>

                        <input
                          id="collection-town"
                          required
                          value={details.collectionTown}
                          onChange={e => setDetails({
                            ...details,
                            collectionTown: e.target.value
                          })}
                          className="w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black"
                          placeholder="Enter town or suburb"
                        />
                      </div>

                      <p className="text-[11px] text-gray-500 leading-5">
                        Please double-check your selected collection point before placing your order.
                      </p>

                    </div>
                  )}

                  {/* ORDER NOTES */}
                  <div>
                    <label htmlFor="order-notes" className="block text-xs font-bold mb-2">
                      Order notes (optional)
                    </label>

                    <textarea
                      id="order-notes"
                      rows="3"
                      value={details.notes}
                      onChange={e => setDetails({ ...details, notes: e.target.value })}
                      className="w-full border border-gray-300 bg-white px-4 py-3 text-sm outline-none focus:border-black resize-y"
                      placeholder="Any additional information?"
                    />
                  </div>

                  {/* UPDATED TOTAL */}
                  <div className="bg-white border border-gray-200 p-4 space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Subtotal</span>
                      <strong>{money(subtotal)}</strong>
                    </div>

                    <div className="flex justify-between text-xs gap-3">
                      <span className="text-gray-500">Delivery fee</span>
                      <strong className="text-right">
                        {deliveryFee !== null
                          ? money(deliveryFee)
                          : 'Select delivery option'}
                      </strong>
                    </div>

                    <div className="border-t border-gray-200 pt-3 flex justify-between">
                      <span className="font-bold text-sm">Total to pay</span>
                      <strong className="text-lg">{money(total)}</strong>
                    </div>
                  </div>

                  {error && (
                    <div role="alert" className="flex items-start gap-2 bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                      <AlertCircle size={17} className="flex-shrink-0" />
                      <p>{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={processing || !deliveryMethod}
                    className="w-full flex items-center justify-center gap-3 bg-black text-white py-4 px-5 text-xs font-bold tracking-widest hover:bg-gray-800 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        CREATING YOUR ORDER...
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={17} />
                        PLACE ORDER
                      </>
                    )}
                  </button>

                  <div className="bg-white border border-gray-200 p-4 space-y-3">
                    <p className="flex items-start gap-2 text-xs text-gray-600 leading-5">
                      <CheckCircle size={15} className="text-green-600 flex-shrink-0 mt-0.5" />
                      Pay by EFT and upload your proof of payment after placing your order.
                    </p>

                    <p className="text-xs text-gray-500 leading-5">
                      Stock is deducted only after the store confirms your payment.
                    </p>

                    <p className="text-xs text-gray-500 leading-5">
                      Your delivery arrangements and estimated timeframe will be confirmed according to the delivery option you select.
                    </p>
                  </div>

                </form>
              )}

            </div>
          </aside>

        </div>
      )}

    </main>
  )
}
