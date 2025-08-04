import React from 'react';

const HighProbabilityCard = ({ analysis, onRegister }) => {
    // Verificação de segurança: não renderiza nada se não houver uma aposta válida
    if (!analysis || !analysis.bestBet) {
        return (
            <div className="bg-gray-700/50 p-4 rounded-lg text-center">
                <p className="text-gray-400">Execute a análise para encontrar a aposta mais provável.</p>
            </div>
        );
    }

    const { bestBet, justification } = analysis;
    const { market, outcome, odd, prob } = bestBet;

    return (
        <div className="bg-gradient-to-br from-blue-800 to-indigo-800 p-6 rounded-lg shadow-lg border border-blue-500/50 space-y-4">
            <div className="text-center">
                <h4 className="text-lg font-bold text-white">Aposta Mais Provável</h4>
                <p className="text-xs text-gray-300">O resultado com a maior probabilidade estatística.</p>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                <p className="text-md text-gray-200">{market}</p>
                <h3 className="text-3xl font-extrabold text-white my-1">{outcome}</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left">
                <div className="bg-gray-700/50 p-3 rounded-lg col-span-2">
                    <label className="text-xs text-gray-400">Probabilidade Calculada</label>
                    <p className="text-4xl text-center font-bold text-white">{(prob * 100).toFixed(1)}%</p>
                </div>
            </div>
            
            <div className="border-t border-blue-500/20 pt-3">
                <h5 className="text-xs font-bold text-blue-300 text-center mb-2">Justificação da Análise</h5>
                <p className="text-xs text-gray-300 text-center">
                    {justification}
                </p>
            </div>

             <div>
                 <button 
                    onClick={onRegister}
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition text-lg"
                >
                    Registar Aposta (Odd: {odd ? odd.toFixed(2) : 'N/A'})
                </button>
             </div>
        </div>
    );
};

export default HighProbabilityCard;
