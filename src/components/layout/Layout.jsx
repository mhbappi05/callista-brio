import { Suspense, useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import AnnouncementBar from './AnnouncementBar.jsx'
import Header from './Header.jsx'
import Footer from './Footer.jsx'
import CartDrawer from '@/components/cart/CartDrawer.jsx'
import ErrorBoundary from '@/components/common/ErrorBoundary.jsx'
import PageLoader from '@/components/common/PageLoader.jsx'

export default function Layout() {
  const { pathname } = useLocation()
  const mainRef = useRef(null)
  const firstRender = useRef(true)

  // On navigation: scroll to the top and move focus to the page content.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    window.scrollTo({ top: 0 })
    mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-cream focus:px-4 focus:py-2">
        Skip to content
      </a>
      <AnnouncementBar />
      <Header />
      <main
        id="main"
        ref={mainRef}
        tabIndex={-1}
        className="frame page-sheet mb-6 mt-4 flex-1 outline-none focus-visible:!shadow-none"
      >
        <ErrorBoundary key={pathname}>
          <div className="page-enter">
            <Suspense fallback={<PageLoader />}>
              <Outlet />
            </Suspense>
          </div>
        </ErrorBoundary>
      </main>
      <Footer />
      <CartDrawer />
    </div>
  )
}