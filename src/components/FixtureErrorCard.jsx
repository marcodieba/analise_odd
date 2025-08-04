// src/components/FixtureErrorCard.jsx

import React from 'react';

const FixtureErrorCard = ({ fixtureName, error }) => {
    return (
        <div className="bg-red-900/50 p-4 rounded-lg border border-red-500/50 flex flex-col">
            <h3 className="text-lg font-bold text-white mb-2 text-center border-b border-red-700/50 pb-2">{fixtureName}</h3>
            <div className="text-center flex-grow flex flex-col justify-center">
                <p className="text-sm font-semibold text-red-300">Falha na Análise</p>
                <p className="text-xs text-red-400 mt-1">{error}</p>
            </div>
        </div>
    );
};

export default FixtureErrorCard;