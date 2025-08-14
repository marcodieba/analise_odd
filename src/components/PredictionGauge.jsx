// src/components/PredictionGauge.jsx

import React from 'react';

const PredictionGauge = ({ prediction }) => {
    if (!prediction) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg text-center">
                <p className="text-gray-400">Aguardando dados suficientes para gerar uma previsão...</p>
            </div>
        );
    }

    const { outcome, probability, confidence } = prediction;

    const confidenceConfig = {
        'Alta': { color: 'bg-green-500', text: 'Alta' },
        'Média': { color: 'bg-yellow-500', text: 'Média' },
        'Baixa': { color: 'bg-red-500', text: 'Baixa' },
    };
    const currentConfidence = confidenceConfig[confidence] || confidenceConfig['Média'];

    return (
        <div className="bg-gradient-to-br from-emerald-900 via-gray-800 to-gray-800 p-6 rounded-lg shadow-lg border border-emerald-500/50">
            <h2 className="text-xl font-bold text-white text-center mb-4">Previsão do Modelo</h2>
            
            <div className="relative flex justify-center items-center h-40">
                <svg className="w-40 h-40 transform -rotate-90">
                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="10" className="text-gray-700" fill="transparent" />
                    <circle
                        cx="80"
                        cy="80"
                        r="70"
                        stroke="currentColor"
                        strokeWidth="10"
                        strokeDasharray={2 * Math.PI * 70}
                        strokeDashoffset={(2 * Math.PI * 70) * (1 - (probability / 100))}
                        className="text-emerald-400"
                        fill="transparent"
                        style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                    />
                </svg>
                <div className="absolute flex flex-col items-center">
                    <span className="text-4xl font-bold text-white">{probability}%</span>
                    <span className="text-xs text-gray-400">Probabilidade</span>
                </div>
            </div>

            <div className="text-center mt-4">
                <p className="text-lg text-gray-300">Resultado Mais Provável:</p>
                <h3 className="text-2xl font-extrabold text-white">{outcome}</h3>
                <div className="flex items-center justify-center mt-2">
                    <span className={`px-3 py-1 text-sm font-bold text-white rounded-full ${currentConfidence.color}`}>
                        Confiança: {currentConfidence.text}
                    </span>
                </div>
            </div>
        </div>
    );
};

export default PredictionGauge;