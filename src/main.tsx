import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { OBSProvider } from './hooks/useOBSSettings'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OBSProvider>
      <App />
    </OBSProvider>
  </React.StrictMode>
)
