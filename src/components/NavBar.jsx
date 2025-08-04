import React from 'react';
import NotificationPanel from './NotificationPanel.jsx';

const NavBar = ({ activePage, setActivePage, notifications }) => {
    const NavButton = ({ pageName, children }) => {
        const isActive = activePage === pageName;
        return (
            <button
                onClick={() => setActivePage(pageName)}
                className={`px-3 py-2 text-sm md:text-base rounded-md font-medium transition-colors duration-200 ${
                    isActive 
                        ? 'bg-emerald-600 text-white' 
                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
            >
                {children}
            </button>
        );
    };

    return (
        <nav className="bg-gray-800 p-2 rounded-lg flex justify-center items-center space-x-1 md:space-x-2 flex-wrap">
            <NavButton pageName="deepAnalysis">🔍 Análise Profunda</NavButton> {/* Alterado de 'analyzer' */}
            <NavButton pageName="green">✅ Análise Green</NavButton>
            <NavButton pageName="hunter">🎯 Caçador de Odds</NavButton>
            <NavButton pageName="stats">📊 Centro de Stats</NavButton>
            <NavButton pageName="live">🔴 Análise Ao Vivo</NavButton>
            <NavButton pageName="tracker">📈 Bet Tracker</NavButton>
            <NavButton pageName="alerts">🔔 Alertas</NavButton>
            <NavButton pageName="settings">⚙️ Configurações</NavButton>
        </nav>
    );
};

export default NavBar;