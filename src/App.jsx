
import { Routes, Route, useLocation } from 'react-router-dom'
import { useEffect } from 'react'

import Header from './components/Header'
import Footer from './components/Footer'

import Home from './pages/Home'
import Shop from './pages/Shop'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Admin from './pages/Admin'
import Contact from './pages/Contact'
import Specials from './pages/Specials'

import { CartProvider } from './context/CartContext'

function ScrollTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default function App() {
  return (
    <CartProvider>
      <ScrollTop />

      <Header />

      <Routes>
        <Route path="/" element={<Home />} />

        <Route path="/shop/:collection" element={<Shop />} />

        <Route path="/product/:id" element={<Product />} />

        <Route path="/cart" element={<Cart />} />

        <Route path="/contact" element={<Contact />} />

        <Route path="/admin" element={<Admin />} />

        <Route path="/specials" element={<Specials />} />

        <Route
          path="*"
          element={
            <main className="container page-section">
              <h1>Page not found</h1>
            </main>
          }
        />
      </Routes>

      <Footer />
    </CartProvider>
  )
}
