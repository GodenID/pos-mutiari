import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App.jsx'
import { AppStoreProvider } from './store/AppStore.jsx'

import './styles/base.css'
import './styles/layout.css'
import './styles/components.css'
import './styles/foto.css'
import './styles/print.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AppStoreProvider>
        <App />
      </AppStoreProvider>
    </BrowserRouter>
  </StrictMode>,
)
