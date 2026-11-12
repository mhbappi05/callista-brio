import AppProviders from './providers/AppProviders.jsx'
import AppRouter from './router/index.jsx'

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}
