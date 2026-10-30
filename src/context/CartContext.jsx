
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'

const CartContext = createContext(null)

const CART_STORAGE_KEY = 'blaqdawg-cart'

export function CartProvider({ children }) {

  // Restore previously saved cart items.
  const [items, setItems] = useState(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY)
      return savedCart ? JSON.parse(savedCart) : []
    } catch (error) {
      console.error('Could not restore cart:', error)
      return []
    }
  })

  // Save cart whenever items change.
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error('Could not save cart:', error)
    }
  }, [items])

  // Add product to cart.
  const add = (product) => {
    setItems(old => {
      const found = old.find(x => x.id === product.id)

      if (found) {
        return old.map(x =>
          x.id === product.id
            ? { ...x, quantity: x.quantity + 1 }
            : x
        )
      }

      return [...old, { ...product, quantity: 1 }]
    })
  }

  // Update product quantity.
  const update = (id, quantity) => {
    setItems(old =>
      old.map(x =>
        x.id === id
          ? {
              ...x,
              quantity: Math.max(1, Number(quantity) || 1)
            }
          : x
      )
    )
  }

  // Remove product from cart.
  const remove = (id) => {
    setItems(old => old.filter(x => x.id !== id))
  }

  // Clear entire cart.
  const clear = () => {
    setItems([])
  }

  // Calculate subtotal.
  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, x) =>
        sum +
        Number(
          x.sale_price && x.is_special
            ? x.sale_price
            : x.price
        ) * x.quantity,
      0
    )
  }, [items])

  // Calculate total number of items.
  const count = useMemo(() => {
    return items.reduce((sum, x) => sum + x.quantity, 0)
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
