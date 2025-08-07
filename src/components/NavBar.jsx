import React from 'react';

const NavBar = ({ activePage, setActivePage }) => {
    const NavButton = ({ pageName, children }) => {
        const isActive = activePage === pageName;
        return (
            <button
                onClick={() => setActivePage(pageName)}
                className={`w-full md:w-auto px-3 py-2 text-sm rounded-md font-medium transition-colors duration-200 ${
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
        <nav className="bg-gray-800 p-2 rounded-lg flex flex-col md:flex-row md:justify-center items-center space-y-1 md:space-y-0 md:space-x-2">
            <NavButton pageName="gameAnalysis">🔍 Análise de Jogo</NavButton>
            <NavButton pageName="green">✅ Análise Green</NavButton>
            <NavButton pageName="hunter">🎯 Caçador de Odds</NavButton>
            <NavButton pageName="live">🔴 Análise Ao Vivo</NavButton>
            <NavButton pageName="tracker">📈 Bet Tracker</NavButton>
            <NavButton pageName="alerts">🔔 Alertas</NavButton>
            <NavButton pageName="profile">👤 Perfil</NavButton> {/* BOTÃO NOVO */}
            <NavButton pageName="settings">⚙️ Configurações</NavButton>
        </nav>
    );
};

export default NavBar;