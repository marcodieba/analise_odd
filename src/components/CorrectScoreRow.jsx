// src/components/CorrectScoreRow.jsx

import React from 'react';

const CorrectScoreRow = ({ analysisResults }) => {
    // Filtra apenas os resultados que têm uma previsão de placar
    const scorePredictions = analysisResults.filter(result => result.mostLikelyScore);

    if (scorePredictions.length === 0) {
        return null; // Não mostra nada se não houver previsões
    }

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold text-cyan-400 mb-3 text-center">🎯 Previsões de Placar Exato</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 gap-3">
                {scorePredictions.map((result, index) => (
                    <div key={index} className="bg-gray-700/50 p-2 rounded-lg text-center">
                        <p className="text-xs text-gray-400 truncate">{result.fixtureName}</p>
                        <p className="font-bold text-white text-xl">{result.mostLikelyScore.score}</p>
                        <p className="font-mono text-cyan-300 text-xs">{(result.mostLikelyScore.prob * 100).toFixed(1)}%</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CorrectScoreRow;