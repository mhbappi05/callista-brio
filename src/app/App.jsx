import AppProviders from './providers/AppProviders.jsx'
import AppRouter from './router/index.jsx'
import Splash from '@/components/common/Splash.jsx'

export default function App() {
  return (
    <AppProviders>
      <Splash />
      <AppRouter />
    </AppProviders>
  )
}