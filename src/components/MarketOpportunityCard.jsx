import React from 'react';

const MarketOpportunityCard = ({ marketTitle, outcomes, onRegister }) => {
    // 1. Filtra para encontrar apenas as apostas com valor positivo
    const valueBets = Object.entries(outcomes || {}).filter(([_, data]) => data.value > 0.01);

    // 2. Se não houver apostas com valor, informa o utilizador
    if (valueBets.length === 0) {
        return (
            <div className="bg-gray-700/50 p-6 rounded-lg text-center">
                <h3 className="text-xl font-bold text-white">{marketTitle}</h3>
                <p className="text-gray-400 mt-2">Nenhuma oportunidade de valor encontrada para este mercado.</p>
            </div>
        );
    }

    // 3. Das apostas com valor, encontra a que tem a maior probabilidade
    const bestBet = valueBets.sort((a, b) => b[1].prob - a[1].prob)[0];
    const [outcome, data] = bestBet;
    const { odd, prob, value, kellyStake } = data;

    return (
        <div className="bg-gradient-to-br from-emerald-900 to-gray-800 p-6 rounded-lg shadow-lg border border-emerald-500/50">
            <div className="text-center">
                <h3 className="text-xl font-bold text-white">{marketTitle}</h3>
                <p className="text-xs text-gray-300 mb-4">Melhor Oportunidade Encontrada</p>
                
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h4 className="text-3xl font-extrabold text-white my-1">{outcome}</h4>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 text-left">
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                        <label className="text-xs text-gray-400">Probabilidade</label>
                        <p className="text-xl font-bold text-white">{(prob * 100).toFixed(1)}%</p>
                    </div>
                     <div className="bg-gray-700/50 p-3 rounded-lg">
                        <label className="text-xs text-gray-400">Odd de Mercado</label>
                        <p className="text-xl font-bold text-white">{odd.toFixed(2)}</p>
                    </div>
                </div>
                <div className="mt-4 bg-green-500/10 p-3 rounded-lg">
                    <label className="text-xs text-green-300">Valor Encontrado (EV)</label>
                    <p className="text-2xl font-bold text-green-400">+{value.toFixed(2)}%</p>
                </div>
                 <div className="mt-4">
                     <button 
                        onClick={onRegister}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg transition text-lg"
                    >
                        Registar Aposta (Stake: {(kellyStake * 100).toFixed(2)}%)
                    </button>
                 </div>
            </div>
        </div>
    );
};

const MarketsList = ({ marketsWithValue = {}, handleRegister }) => {
    return (
        <div>
            {Object.entries(marketsWithValue).length > 0 && Object.entries(marketsWithValue).map(([market, outcomes]) => (
                <MarketOpportunityCard key={market} marketTitle={market} outcomes={outcomes} onRegister={(betData) => handleRegister(betData)} />
            ))}
        </div>
    );
};

export default MarketsList;
