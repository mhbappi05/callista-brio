import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthContext.jsx'
import { CartProvider } from '@/context/CartContext.jsx'
import { WishlistProvider } from '@/context/WishlistContext.jsx'

export default function AppProviders({ children }) {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}