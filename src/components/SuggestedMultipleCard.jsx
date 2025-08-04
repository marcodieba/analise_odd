// src/components/SuggestedMultipleCard.jsx

import React from 'react';

const SuggestedMultipleCard = ({ suggestedBets }) => {
    if (!suggestedBets || suggestedBets.length === 0) {
        return null; // Não mostra nada se não houver sugestões
    }

    const totalOdd = suggestedBets.reduce((acc, bet) => acc * bet.odd, 1);

    return (
        <div className="bg-gray-800 border-2 border-emerald-500 rounded-lg shadow-lg p-4">
            <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-emerald-400">💡 Múltipla Sugerida do Dia</h3>
                <p className="text-xs text-gray-400">As 4 apostas de maior probabilidade encontradas</p>
            </div>

            <div className="space-y-3">
                {suggestedBets.map((bet, index) => (
                    <div key={index} className="bg-gray-700/50 p-3 rounded-lg">
                        {/* Linha 1: Mercado, Odd e Casa de Aposta */}
                        <div className="flex justify-between items-start">
                            <div className="text-left">
                                <p className="text-xs text-gray-400">{bet.market}</p>
                                <p className="font-bold text-white text-md leading-tight">{bet.outcome}</p>
                            </div>
                            <div className="text-right">
                                <p className="font-mono text-white text-xl font-bold">{bet.odd.toFixed(2)}</p>
                                <p className="text-xs text-emerald-400 font-semibold">{bet.bookmakerName}</p>
                            </div>
                        </div>

                        {/* Linha 2: Confronto e Probabilidade */}
                        <div className="flex justify-between items-center text-xs text-gray-400 mt-2">
                            <span className="truncate max-w-[150px]">{bet.fixtureName}</span>
                            <span>Prob: <span className="font-bold text-white">{(bet.prob * 100).toFixed(1)}%</span></span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-4">
                <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg">
                    <span className="font-bold text-white">Múltipla de {suggestedBets.length}</span>
                    <span className="text-2xl font-bold text-emerald-400">{totalOdd.toFixed(2)}</span>
                </div>
                <button className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition">
                    Apostar (Simulação)
                </button>
            </div>
        </div>
    );
};

export default SuggestedMultipleCard;