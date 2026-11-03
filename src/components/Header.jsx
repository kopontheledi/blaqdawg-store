
import { Link, NavLink } from 'react-router-dom'
import { ShoppingBag, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useCart } from '../context/CartContext'
import logo from '../assets/blaqdawg-logo.jpg'

export default function Header() {
  const [open, setOpen] = useState(false)
  const { count } = useCart()

  const nav = (
    <>
      <NavLink
        onClick={() => setOpen(false)}
        to="/shop/apparel"
      >
        BLAQ DAWG VINTAGE
      </NavLink>

      <NavLink
        onClick={() => setOpen(false)}
        to="/shop/weaves"
      >
        WEAVES
      </NavLink>

      <a
        onClick={() => setOpen(false)}
        href="/specials"
      >
        SPECIALS
      </a>

      <NavLink
        onClick={() => setOpen(false)}
        to="/contact"
      >
        CONTACT
      </NavLink>
    </>
  )

  return (
    <header className="site-header">
      <div className="container header-inner">

        <button
          className="mobile-menu icon-button"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X /> : <Menu />}
        </button>

        <Link
          to="/"
          className="brand"
          onClick={() => setOpen(false)}
        >
          <img src={logo} alt="Blaqdawg Vintage logo" />

          <span>
            BLAQDAWG
            <small>VINTAGE · EST. 2020</small>
          </span>
        </Link>

        <nav className="desktop-nav">
          {nav}
        </nav>

        <Link
          to="/cart"
          className="cart-link"
          onClick={() => setOpen(false)}
        >
          <ShoppingBag size={19} />
          <span>Bag</span>
          <b>{count}</b>
        </Link>

      </div>

      {open && (
        <nav className="mobile-nav container">
          {nav}
        </nav>
      )}
    </header>
  )
}
