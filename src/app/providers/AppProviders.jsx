import { BrowserRouter } from 'react-router-dom'

// Auth, cart and wishlist providers are added here in later phases.
export default function AppProviders({ children }) {
  return <BrowserRouter>{children}</BrowserRouter>
}
