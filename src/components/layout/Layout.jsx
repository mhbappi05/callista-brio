import { Outlet } from 'react-router-dom'
import AnnouncementBar from './AnnouncementBar.jsx'
import Header from './Header.jsx'
import Footer from './Footer.jsx'
import CartDrawer from '@/components/cart/CartDrawer.jsx'

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-cream focus:px-4 focus:py-2">
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
    </div>
  )
}