import React from 'react';

const CorrectScorePanel = ({ analysisResults }) => {
    // Filtra apenas os resultados que têm uma previsão de placar
    const scorePredictions = analysisResults.filter(result => result.topThreeScores && result.topThreeScores.length > 0);

    if (scorePredictions.length === 0) {
        return null; // Não mostra nada se não houver previsões
    }

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold text-cyan-400 mb-4 text-center">🎯 Mapa de Placares Prováveis</h3>
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                {scorePredictions.map((result, index) => (
                    <div key={index} className="bg-gray-700/50 p-3 rounded-lg">
                        <p className="text-sm font-bold text-white truncate text-center mb-2">{result.fixtureName}</p>
                        <div className="flex justify-around text-center">
                            {result.topThreeScores.map((prediction, idx) => (
                                <div key={idx}>
                                    <p className="font-mono text-white text-lg">{prediction.score}</p>
                                    <p className="font-mono text-cyan-300 text-xs">{(prediction.prob * 100).toFixed(1)}%</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CorrectScorePanel;