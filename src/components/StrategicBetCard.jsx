import React from 'react';

export default function StrategicBetCard({ bet, onRegister }) {
    if (!bet) {
        return (
            <div className="bg-gray-700/50 p-6 rounded-lg text-center">
                <h3 className="text-xl font-bold text-white">Nenhuma Aposta Estratégica Encontrada</h3>
                {/* CORREÇÃO AQUI: Substituindo > por &gt; */}
                <p className="text-gray-400 mt-2">Nenhuma oportunidade cumpriu os critérios de valor (&gt;0%) e probabilidade (&gt;60%) para este jogo.</p>
            </div>
        );
    }

    const { outcome, prob, odd, value, kellyStake } = bet; // Corrigido para usar kellyStake, não stake

    return (
        <div className="bg-gradient-to-br from-emerald-800 to-green-800 p-6 rounded-lg shadow-lg border border-emerald-500/50">
            <div className="text-center">
                <h3 className="text-xl font-bold text-white">Aposta Estratégica Sugerida</h3>
                <p className="text-xs text-gray-300 mb-4">A melhor oportunidade de valor com alta probabilidade</p>
                
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <h4 className="text-4xl font-extrabold text-white my-1">{outcome}</h4>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 text-left">
                    <div className="bg-gray-700/50 p-3 rounded-lg">
                        <label className="text-xs text-gray-400">Probabilidade Calculada</label>
                        <p className="text-2xl font-bold text-white">{(prob * 100).toFixed(1)}%</p>
                    </div>
                     <div className="bg-gray-700/50 p-3 rounded-lg">
                        <label className="text-xs text-gray-400">Odd de Mercado</label>
                        <p className="text-2xl font-bold text-white">{odd.toFixed(2)}</p>
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
                        Registar Aposta (Stake: {kellyStake ? (kellyStake * 100).toFixed(2) : '0.00'}%)
                    </button>
                 </div>
            </div>
        </div>
    );
};