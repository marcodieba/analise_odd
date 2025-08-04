import React from 'react';

const AutoAnalysisModal = ({ bestBet, onClose, onRegister }) => {
    if (!bestBet) return null;

    const { market, outcome, odd, value, kellyStake, prob, confidence } = bestBet;

    const confidenceConfig = {
        high: { text: 'Alta', color: 'text-green-400', icon: '🟢' },
        medium: { text: 'Média', color: 'text-yellow-400', icon: '🟡' },
        low: { text: 'Baixa', color: 'text-red-400', icon: '🔴' },
    };

    const currentConfidence = confidenceConfig[confidence];

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 rounded-xl shadow-2xl border border-emerald-500/50 w-full max-w-md transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 text-center">
                    <h2 className="text-2xl font-bold text-emerald-400">Melhor Oportunidade Encontrada</h2>
                    <p className="text-gray-400 text-sm mt-1">Com base na análise combinada</p>
                    
                    <div className="my-6 bg-gray-900/50 p-6 rounded-lg">
                        <p className="text-lg text-gray-300">{market}</p>
                        <h3 className="text-4xl font-extrabold text-white my-2">{outcome}</h3>
                        <p className="text-lg text-gray-300">
                            com uma odd de <span className="font-bold text-emerald-400 text-xl">{odd.toFixed(2)}</span>
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-left">
                        <div className="bg-gray-700/50 p-3 rounded-lg">
                            <label className="text-xs text-gray-400">Valor (EV)</label>
                            <p className="text-xl font-bold text-green-400">+{value.toFixed(2)}%</p>
                        </div>
                        <div className="bg-gray-700/50 p-3 rounded-lg">
                            <label className="text-xs text-gray-400">Stake Sugerido (Kelly)</label>
                            <p className="text-xl font-bold text-cyan-300">{kellyStake.toFixed(2)}%</p>
                        </div>
                        <div className="bg-gray-700/50 p-3 rounded-lg">
                            <label className="text-xs text-gray-400">Probabilidade Calculada</label>
                            <p className="text-xl font-bold text-white">{(prob * 100).toFixed(1)}%</p>
                        </div>
                        <div className="bg-gray-700/50 p-3 rounded-lg">
                            <label className="text-xs text-gray-400">Confiança (H2H/Forma)</label>
                            <p className={`text-xl font-bold ${currentConfidence.color}`}>{currentConfidence.icon} {currentConfidence.text}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-900/50 px-6 py-4 flex justify-end space-x-3 rounded-b-xl">
                    <button 
                        onClick={onClose}
                        className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                        Fechar
                    </button>
                    <button 
                        onClick={onRegister}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg transition"
                    >
                        Registar Aposta
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AutoAnalysisModal;
