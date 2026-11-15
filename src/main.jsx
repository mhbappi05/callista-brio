import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App.jsx'
import { installGlobalErrorHandlers } from './lib/monitoring.js'
import './styles/index.css'

installGlobalErrorHandlers()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)