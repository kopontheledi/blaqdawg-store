
import { Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { money, whatsappNumber, supabase } from '../lib/supabase'
import { useState } from 'react'

const DELIVERY = 150

export default function Cart() {
  const { items, update, remove, subtotal, clear } = useCart()

  const [details, setDetails] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  })

  const [show, setShow] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  const total = subtotal + (items.length ? DELIVERY : 0)

  const submit = async (e) => {
    e.preventDefault()

    if (processing || !items.length) return

    if (!supabase) {
      setError('The store is currently unavailable. Please try again later.')
      return
    }

    setProcessing(true)
    setError('')

    // Open a blank tab immediately to avoid popup blocking.
    const whatsappWindow = window.open('', '_blank')

    try {
      // Save the order in Supabase.
      const { data: orderId, error: orderError } = await supabase.rpc(
        'create_store_order',
        {
          p_customer_name: details.name.trim(),
          p_customer_phone: details.phone.trim(),
          p_delivery_address: details.address.trim(),
          p_notes: details.notes.trim(),
          p_items: items.map(item => ({
            variant_id: item.variant_id,
            quantity: item.quantity
          }))
        }
      )

      if (orderError) {
        throw orderError
      }

      if (!orderId) {
        throw new Error('The order could not be created. Please try again.')
      }

      // Prepare the WhatsApp order message.
      const lines = items.map(item => {
        const unitPrice =
          item.is_special && item.sale_price != null
            ? Number(item.sale_price)
            : Number(item.price)

        const variation = [
          item.size && item.size !== 'One Size'
            ? `Size: ${item.size}`
            : null,
          item.color && item.color !== 'Default'
            ? `Colour: ${item.color}`
            : null
        ].filter(Boolean).join(', ')

        return [
          `• ${item.name}`,
          variation ? `(${variation})` : '',
          `x${item.quantity}`,
          `— ${money(unitPrice * item.quantity)}`
        ].filter(Boolean).join(' ')
      }).join('\n')

      const message = `BLAQDAWG VINTAGE — NEW ORDER

Order reference: ${orderId}

Customer: ${details.name}
Contact: ${details.phone}
Delivery address: ${details.address}

ORDER ITEMS
${lines}

Subtotal: ${money(subtotal)}
Delivery: ${money(DELIVERY)}
TOTAL: ${money(total)}

Payment status: PENDING

Lead time: 2–3 weeks after payment is confirmed.
Notes: ${details.notes || 'None'}

Please confirm payment details for this order.`

      const whatsappUrl =
        `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`

      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.location.href = whatsappUrl
        whatsappWindow.opener = null
      } else {
        window.location.href = whatsappUrl
      }

      // Clear the shopping bag after the order is successfully saved.
      clear()

    } catch (err) {
      console.error('Checkout error:', err)

      if (whatsappWindow && !whatsappWindow.closed) {
        whatsappWindow.close()
      }

      setError(
        err.message ||
        'Something went wrong while creating your order. Please try again.'
      )
    } finally {
      setProcessing(false)
    }
  }

  return (
    <main className="container page-section">
      <div className="page-title">
        <p className="eyebrow">YOUR PICKS</p>
        <h1>SHOPPING BAG</h1>
      </div>

      {!items.length ? (
        <div className="empty-state">
          Your bag is empty.{' '}
          <Link to="/shop/apparel" className="text-link">
            Start shopping ↗
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {items.map(item => (
              <div className="cart-item" key={item.cartItemId}>
                <div className="cart-thumb">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} />
                  ) : (
                    'BD'
                  )}
                </div>

                <div className="cart-item-copy">
                  <h3>{item.name}</h3>

                  <p>
                    {money(
                      item.is_special && item.sale_price != null
                        ? item.sale_price
                        : item.price
                    )}
                  </p>

                  {item.size && item.size !== 'One Size' && (
                    <p>Size: {item.size}</p>
                  )}

                  {item.color && item.color !== 'Default' && (
                    <p>Colour: {item.color}</p>
                  )}

                  <div className="quantity">
                    <button
                      type="button"
                      disabled={item.quantity <= 1}
                      onClick={() =>
                        update(item.cartItemId, item.quantity - 1)
                      }
                    >
                      -
                    </button>

                    <span>{item.quantity}</span>

                    <button
                      type="button"
                      disabled={item.quantity >= item.stock}
                      onClick={() =>
                        update(item.cartItemId, item.quantity + 1)
                      }
                    >
                      +
                    </button>
                  </div>

                  <p className="small-note">
                    {item.stock} available for this variation
                  </p>
                </div>

                <button
                  type="button"
                  className="remove-link"
                  onClick={() => remove(item.cartItemId)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <aside className="summary-card">
            <h2>ORDER SUMMARY</h2>

            <div>
              <span>Subtotal</span>
              <b>{money(subtotal)}</b>
            </div>

            <div>
              <span>Delivery</span>
              <b>{money(DELIVERY)}</b>
            </div>

            <div className="summary-total">
              <span>Total</span>
              <strong>{money(total)}</strong>
            </div>

            <p className="small-note">
              Delivery fee of R150 is added to every order.
            </p>

            <button
              className="button button-dark full"
              type="button"
              disabled={processing}
              onClick={() => {
                setShow(!show)
                setError('')
              }}
            >
              CHECK OUT ON WHATSAPP
            </button>

            {show && (
              <form className="checkout-form" onSubmit={submit}>
                <label>
                  Full name
                  <input
                    required
                    value={details.name}
                    onChange={e =>
                      setDetails({
                        ...details,
                        name: e.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Phone number
                  <input
                    required
                    type="tel"
                    value={details.phone}
                    onChange={e =>
                      setDetails({
                        ...details,
                        phone: e.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Delivery address
                  <textarea
                    required
                    value={details.address}
                    onChange={e =>
                      setDetails({
                        ...details,
                        address: e.target.value
                      })
                    }
                  />
                </label>

                <label>
                  Order notes (optional)
                  <textarea
                    value={details.notes}
                    onChange={e =>
                      setDetails({
                        ...details,
                        notes: e.target.value
                      })
                    }
                  />
                </label>

                {error && (
                  <p className="stock-warning" role="alert">
                    {error}
                  </p>
                )}

                <button
                  className="button button-dark full"
                  type="submit"
                  disabled={processing}
                >
                  {processing
                    ? 'CREATING YOUR ORDER...'
                    : 'SEND ORDER TO WHATSAPP'}
                </button>

                <p className="small-note">
                  Your order will be saved before WhatsApp opens.
                  Payment is confirmed separately by the store.
                  Stock is deducted only after payment confirmation.
                </p>
              </form>
            )}
          </aside>
        </div>
      )}
    </main>
  )
}
