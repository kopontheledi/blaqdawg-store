
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'

const CartContext = createContext(null)

const CART_STORAGE_KEY = 'blaqdawg-cart'

function getCartItemId(product) {
  return `${product.id}-${product.variant_id}`
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY)
      const parsed = savedCart ? JSON.parse(savedCart) : []

      // Old cart items do not contain variation IDs.
      // They cannot be checked out using the new stock system.
      return parsed.filter(item => item.variant_id)
    } catch (error) {
      console.error('Could not restore cart:', error)
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('Could not save cart:', error)
    }
  }, [items])

  // Add a product variation to the cart.
  const add = (product, quantity = 1) => {
    if (!product?.id || !product?.variant_id) {
      throw new Error('Please select a size and colour first.')
    }

    const availableStock = Number(product.stock) || 0
    const amount = Math.max(1, Number(quantity) || 1)

    if (availableStock < 1) {
      throw new Error('This variation is out of stock.')
    }

    setItems(old => {
      const cartItemId = getCartItemId(product)
      const found = old.find(x => x.cartItemId === cartItemId)

      if (found) {
        const newQuantity = found.quantity + amount

        if (newQuantity > availableStock) {
          throw new Error(
            `Only ${availableStock} items are available for this variation.`
          )
        }

        return old.map(x =>
          x.cartItemId === cartItemId
            ? { ...x, quantity: newQuantity, stock: availableStock }
            : x
        )
      }

      if (amount > availableStock) {
        throw new Error(
          `Only ${availableStock} items are available for this variation.`
        )
      }

      return [
        ...old,
        {
          ...product,
          cartItemId,
          quantity: amount
        }
      ]
    })
  }

  // Update cart quantity.
  const update = (cartItemId, quantity) => {
    setItems(old =>
      old.map(item => {
        if (item.cartItemId !== cartItemId) return item

        const requested = Math.max(1, Number(quantity) || 1)
        const available = Number(item.stock) || 0

        return {
          ...item,
          quantity: Math.min(requested, available)
        }
      })
    )
  }

  // Remove a variation from the cart.
  const remove = cartItemId => {
    setItems(old =>
      old.filter(item => item.cartItemId !== cartItemId)
    )
  }

  // Clear the entire cart.
  const clear = () => {
    setItems([])
  }

  // Calculate subtotal.
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const price =
        item.is_special && item.sale_price != null
          ? Number(item.sale_price)
          : Number(item.price)

      return sum + price * item.quantity
    }, 0)
  }, [items])

  // Calculate total number of items.
  const count = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + item.quantity,
      0
    )
  }, [items])

  return (
    <CartContext.Provider
      value={{
        items,
        add,
        update,
        remove,
        clear,
        subtotal,
        count
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => useContext(CartContext)
