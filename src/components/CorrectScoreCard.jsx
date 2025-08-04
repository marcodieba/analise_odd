// src/components/CorrectScoreCard.jsx

import React from 'react';

const CorrectScoreCard = ({ analysis }) => {
    // Apenas renderiza se a análise e a previsão do placar existirem
    if (!analysis || !analysis.mostLikelyScore) {
        return null;
    }

    const { fixtureName, mostLikelyScore } = analysis;
    const { score, prob } = mostLikelyScore;

    return (
        <div className="bg-gray-800 border-2 border-cyan-500 rounded-lg shadow-lg p-4">
            <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-cyan-400">🎯 Previsão de Placar Exato</h3>
                <p className="text-xs text-gray-400">O resultado com a maior probabilidade estatística</p>
            </div>

            <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-300 mb-1">{fixtureName}</p>
                <h4 className="text-5xl font-bold text-white tracking-wider">{score}</h4>
            </div>

            <div className="mt-4 text-center">
                <p className="text-gray-400 text-sm">Probabilidade Calculada</p>
                <p className="text-2xl font-bold text-cyan-300">{(prob * 100).toFixed(2)}%</p>
            </div>
        </div>
    );
};

export default CorrectScoreCard;