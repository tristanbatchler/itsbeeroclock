import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { BeerProvider } from './contexts/BeerContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BeerProvider>
      <App />
    </BeerProvider>
  </StrictMode>,
)
