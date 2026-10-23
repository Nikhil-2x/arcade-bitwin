import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './app/App.tsx'

// No StrictMode: the Phaser game is created imperatively and must not be mounted twice in dev.
createRoot(document.getElementById('root')!).render(<App />)
