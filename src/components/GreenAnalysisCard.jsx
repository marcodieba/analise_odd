import React from 'react';

const GreenAnalysisCard = ({ analysis, onRegister }) => {
    if (!analysis || !analysis.bestBet) {
        return (
            <div className="bg-gray-700/50 p-4 rounded-lg text-center">
                <p className="text-gray-400">Execute a análise para encontrar a melhor oportunidade "Green".</p>
            </div>
        );
    }

    const { bestBet, secondBestBet } = analysis;
    const { market, outcome, odd, prob, value, kellyStake } = bestBet;

    return (
        <div className="bg-gradient-to-br from-emerald-800 to-green-800 p-6 rounded-lg shadow-lg border border-emerald-500/50 space-y-4">
            <div className="text-center">
                <h4 className="text-lg font-bold text-white">Oportunidade Green Encontrada</h4>
                <p className="text-xs text-gray-300">A aposta com o melhor balanço entre probabilidade e valor.</p>
            </div>
            
            <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                <p className="text-md text-gray-200">{market}</p>
                <h3 className="text-3xl font-extrabold text-white my-1">{outcome}</h3>
            </div>

            {/* --- NOVA SECÇÃO DE JUSTIFICAÇÃO COM DADOS --- */}
            <div className="border-t border-emerald-500/20 pt-3">
                <h5 className="text-xs font-bold text-emerald-300 text-center mb-2">Justificação da Análise</h5>
                <div className="grid grid-cols-2 gap-3 text-left">
                    <div className="bg-gray-700/50 p-2 rounded-lg">
                        <label className="text-xs text-gray-400">Probabilidade</label>
                        <p className="text-lg font-bold text-white">{(prob * 100).toFixed(1)}%</p>
                    </div>
                     <div className="bg-gray-700/50 p-2 rounded-lg">
                        <label className="text-xs text-gray-400">Odd de Mercado</label>
                        <p className="text-lg font-bold text-white">{odd.toFixed(2)}</p>
                    </div>
                    <div className="bg-gray-700/50 p-2 rounded-lg">
                        <label className="text-xs text-gray-400">Valor (EV)</label>
                        <p className="text-lg font-bold text-green-400">+{value.toFixed(2)}%</p>
                    </div>
                    <div className="bg-gray-700/50 p-2 rounded-lg">
                        <label className="text-xs text-gray-400">Stake (Kelly 1/4)</label>
                        <p className="text-lg font-bold text-cyan-300">{(kellyStake * 100).toFixed(2)}%</p>
                    </div>
                </div>
                {secondBestBet && (
                    <div className="mt-3 text-center text-xs text-gray-400">
                        <span>Alternativa seguinte: "{secondBestBet.outcome}" com </span>
                        <span className="font-bold text-white">{(secondBestBet.prob * 100).toFixed(1)}%</span>
                        <span> de probabilidade.</span>
                    </div>
                )}
            </div>

             <div>
                 <button 
                    onClick={onRegister}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg transition text-lg"
                >
                    Registar Aposta
                </button>
             </div>
        </div>
    );
};

export default GreenAnalysisCard;
