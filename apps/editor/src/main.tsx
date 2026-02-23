import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { IconContext } from '@phosphor-icons/react'
import App from './App'
import './index.css'

// Production에서는 /storige-editor 경로에서 배포됨
const basename = import.meta.env.VITE_ROUTER_BASE || ''

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IconContext.Provider value={{ size: 24, weight: 'duotone' }}>
      <BrowserRouter basename={basename}>
        <App />
      </BrowserRouter>
    </IconContext.Provider>
  </React.StrictMode>,
)
