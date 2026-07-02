import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { OBSProvider } from './hooks/useOBSSettings'
import { StreamProvider } from './hooks/useStreamState'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <OBSProvider>
      <StreamProvider>
        <App />
      </StreamProvider>
    </OBSProvider>
  </React.StrictMode>
)
