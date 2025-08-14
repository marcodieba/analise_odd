// src/components/UnifiedFixtureCard.jsx

import React from 'react';
import { kellyCriterion } from '../utils/math'; // Importar se for usar o stake

const BetRow = ({ bet, onAddToSlip, isInSlip }) => {
    const probDisplay = typeof bet.prob === 'number' ? (bet.prob * 100).toFixed(1) : '--';
    const oddDisplay = typeof bet.odd === 'number' ? bet.odd.toFixed(2) : '--';

    return (
        <div className="bg-gray-700/50 p-3 rounded-lg flex items-center justify-between">
            <div>
                <p className="text-xs text-emerald-300">{bet.market}</p>
                <p className="font-bold text-white">{bet.outcome}</p>
                <div className="flex items-center space-x-2 text-xs mt-1">
                    <span className="text-gray-400">Prob: <span className="font-bold text-white">{probDisplay + '%'}</span></span>
                    <span className="text-gray-400">
  EV: <span className="font-bold text-green-400">
    {typeof bet.value === 'number' ? `+${bet.value.toFixed(2)}%` : '--'}
  </span>
</span>
                </div>
            </div>
            <div className="text-right">
                <p className="font-mono text-white text-xl font-bold">{oddDisplay}</p>
                <p className="text-xs text-emerald-400 font-semibold">{bet.bookmakerName}</p>
                <button
                    onClick={() => onAddToSlip(bet)}
                    disabled={isInSlip}
                    className="mt-2 bg-emerald-700 text-white text-xs px-2 py-1 rounded hover:bg-emerald-600 disabled:bg-gray-500"
                >
                    {isInSlip ? '✓' : '+'}
                </button>
            </div>
        </div>
    );
};

const UnifiedFixtureCard = ({ fixtureName, bets, onAddToSlip, selectedBets }) => {
    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col">
            <h3 className="text-lg font-bold text-white mb-3 text-center border-b border-gray-700 pb-2">{fixtureName}</h3>
            <div className="space-y-2">
                {bets.map((bet, index) => (
                    <BetRow 
                        key={index} 
                        bet={bet} 
                        onAddToSlip={onAddToSlip}
                        isInSlip={selectedBets.some(b => b.fixtureName === bet.fixtureName && b.outcome === bet.outcome)}
                    />
                ))}
            </div>
        </div>
    );
};

export { BetRow };
export default UnifiedFixtureCard;