import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Login from './Login.jsx'

function Root() {
    // Beim Seitenaufruf prüfen ob noch ein gültiger Token im sessionStorage liegt
    const savedUser = sessionStorage.getItem("bs_user");
    const [user, setUser] = useState(savedUser ? JSON.parse(savedUser) : null);

    const handleLogin  = (u) => setUser(u);
    const handleLogout = () => {
        sessionStorage.removeItem("bs_token");
        sessionStorage.removeItem("bs_api_token");
        sessionStorage.removeItem("bs_user");
        sessionStorage.removeItem("bs_seite");   // nach dem Anmelden wieder auf der Startseite beginnen
        setUser(null);
    };

    if (!user) return <Login onLogin={handleLogin} />;
    return <App user={user} onLogout={handleLogout} />;
}

createRoot(document.getElementById('root')).render(
    <StrictMode>
        <Root />
    </StrictMode>,
)