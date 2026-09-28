import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/fraunces/600.css'
import '@fontsource/space-grotesk/400.css'
import '@fontsource/space-grotesk/500.css'
import '@fontsource/space-grotesk/600.css'
import './styles/tokens.css'
import './ui/ui.css'
import './styles/app.css'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
