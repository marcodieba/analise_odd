// src/components/AnalysisSummaryCard.jsx

import React from 'react';

const BetRow = ({ bet, onRegister }) => {
    return (
        <div className="grid grid-cols-12 gap-2 items-center text-sm py-2 border-b border-gray-700 last:border-b-0">
            <div className="col-span-5">
                <p className="font-bold text-white truncate">{bet.outcome}</p>
                <p className="text-xs text-gray-400">{bet.market}</p>
            </div>
            <div className="col-span-2 text-center">
                <p className="font-mono font-bold text-white">{bet.odd.toFixed(2)}</p>
                <p className="font-mono text-emerald-400 text-[10px]">{bet.bookmakerName}</p>
            </div>
            <div className="col-span-2 text-center">
                <p className="font-mono font-bold text-white">{(bet.prob * 100).toFixed(1)}%</p>
            </div>
            <div className="col-span-2 text-center">
                <p className="font-mono font-bold text-green-400">+{bet.value.toFixed(2)}%</p>
            </div>
            <div className="col-span-1 text-right">
                <button 
                    onClick={() => onRegister(bet)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-2 rounded"
                >
                    +
                </button>
            </div>
        </div>
    );
};

const AnalysisSummaryCard = ({ bets, onRegisterBet }) => {
    if (!bets || bets.length === 0) {
        return (
            <div className="text-center bg-gray-800 p-8 rounded-lg">
                <p className="text-gray-500">Nenhuma oportunidade com mais de 55% de probabilidade encontrada para este jogo.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <h3 className="text-lg font-bold text-white mb-3 text-center">Oportunidades de Valor Encontradas</h3>
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-bold px-2 mb-2">
                <div className="col-span-5">Aposta</div>
                <div className="col-span-2 text-center">Melhor Odd</div>
                <div className="col-span-2 text-center">Prob.</div>
                <div className="col-span-2 text-center">Valor (EV)</div>
                <div className="col-span-1"></div>
            </div>
            <div className="space-y-1">
                {bets.map((bet, index) => (
                    <BetRow key={index} bet={bet} onRegister={onRegisterBet} />
                ))}
            </div>
        </div>
    );
};

export default AnalysisSummaryCard;