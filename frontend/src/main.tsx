import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// No StrictMode: the Phaser game is created imperatively and must not be mounted twice in dev.
createRoot(document.getElementById('root')!).render(<App />)
