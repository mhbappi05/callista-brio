import { Routes, Route } from 'react-router-dom'
import Layout from '@/components/layout/Layout.jsx'
import Home from '@/pages/Home.jsx'
import Shop from '@/pages/Shop.jsx'
import Collections from '@/pages/Collections.jsx'
import ProductDetails from '@/pages/ProductDetails.jsx'
import About from '@/pages/About.jsx'
import Contact from '@/pages/Contact.jsx'
import Cart from '@/pages/Cart.jsx'
import Checkout from '@/pages/Checkout.jsx'
import Auth from '@/pages/Auth.jsx'
import ComingSoon from '@/pages/ComingSoon.jsx'
import NotFound from '@/pages/NotFound.jsx'

export default function AppRouter() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="shop" element={<Shop />} />
        <Route path="collections" element={<Collections />} />
        <Route path="product/:slug" element={<ProductDetails />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="wishlist" element={<ComingSoon title="Wishlist" />} />
        <Route path="cart" element={<Cart />} />
        <Route path="checkout" element={<Checkout />} />
        <Route path="auth" element={<Auth />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}