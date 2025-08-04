import React from 'react';

// Componente para a barra de fator individual
const FactorBar = ({ label, value, color }) => {
    const width = Math.max(10, Math.min(100, value * 100)); // Garante que a barra tem entre 10% e 100%
    return (
        <div>
            <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{label}</span>
                <span>{Math.round(value * 100)}%</span>
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2">
                <div 
                    className={`${color} h-2 rounded-full transition-all duration-500`}
                    style={{ width: `${width}%` }}
                ></div>
            </div>
        </div>
    );
};

const BTTSAnalysisCard = ({ analysis }) => {
    if (!analysis) return null;

    const { finalProbability, factors, conclusion } = analysis;

    const signalConfig = {
        confirm: { icon: '✅', color: 'text-green-400' },
        neutral: { icon: '⚪', color: 'text-gray-300' },
        alert: { icon: '❌', color: 'text-red-400' },
    };
    
    const signal = finalProbability > 65 ? signalConfig.confirm : finalProbability < 45 ? signalConfig.alert : signalConfig.neutral;

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Coluna da Probabilidade Final */}
                <div className="flex flex-col items-center justify-center text-center bg-gray-900/30 p-4 rounded-lg">
                    <h5 className="font-bold text-gray-300">Probabilidade de Ambas Marcam</h5>
                    <p className={`text-6xl font-bold my-2 ${signal.color}`}>
                        {Math.round(finalProbability)}%
                    </p>
                    <p className="text-sm text-gray-400">
                        {conclusion}
                    </p>
                </div>

                {/* Coluna dos Fatores de Análise */}
                <div className="space-y-3">
                    <h5 className="font-bold text-gray-300 text-center md:text-left">Fatores de Influência</h5>
                    <FactorBar label="Tendência Histórica" value={factors.historical} color="bg-blue-500" />
                    <FactorBar label="Potencial Ofensivo" value={factors.potential} color="bg-emerald-500" />
                    <FactorBar label="Contexto (Lesões)" value={factors.context} color="bg-yellow-500" />
                </div>
            </div>
        </div>
    );
};

export default BTTSAnalysisCard;
