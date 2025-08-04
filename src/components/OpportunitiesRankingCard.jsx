import React from 'react';

const OpportunitiesRankingCard = ({ analysis, onRegister, fixtureName, fixtureId }) => {
    if (!analysis || analysis.length === 0) {
        return (
            <div className="bg-gray-700/50 p-6 rounded-lg text-center">
                <h3 className="text-xl font-bold text-white">Ranking de Oportunidades</h3>
                <p className="text-gray-400 mt-2">Nenhuma oportunidade de valor encontrada para este jogo.</p>
            </div>
        );
    }

    return (
        <div className="bg-gray-700/50 p-6 rounded-lg">
            <h3 className="text-xl font-bold text-white mb-4">Ranking de Oportunidades</h3>
            <div className="space-y-3">
                {analysis.map((bet, index) => (
                    <div key={index} className={`p-4 rounded-lg border ${index === 0 ? 'bg-emerald-900/50 border-emerald-500/50' : 'bg-gray-800/50 border-gray-600/50'}`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <span className="text-xs text-gray-400">{bet.market}</span>
                                <p className="font-bold text-lg text-white">{bet.outcome}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-bold text-emerald-400">{(bet.prob * 100).toFixed(1)}%</p>
                                <p className="text-xs text-gray-400">Probabilidade</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
                            <div>
                                <p className="text-gray-400">Odd Mercado</p>
                                <p className="font-mono text-white">{bet.odd.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Valor (EV)</p>
                                <p className="font-mono text-green-400">+{bet.value.toFixed(2)}%</p>
                            </div>
                            <div>
                                <p className="text-gray-400">Stake (Kelly 1/4)</p>
                                <p className="font-mono text-cyan-300">{(bet.kellyStake * 100).toFixed(2)}%</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => onRegister({
                                fixtureId: fixtureId,
                                fixture: fixtureName,
                                market: bet.outcome,
                                odd: bet.odd,
                                stake: bet.kellyStake * 100,
                            })}
                            className="w-full mt-4 bg-gray-600 hover:bg-gray-500 text-white text-xs font-bold py-1.5 px-2 rounded-md transition"
                        >
                            Registar Aposta
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default OpportunitiesRankingCard;
