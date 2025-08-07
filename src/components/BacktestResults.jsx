import React from 'react';

const StatCard = ({ title, value, color }) => (
    <div className="bg-gray-700/50 p-3 rounded-lg text-center">
        <h4 className="text-sm font-medium text-gray-400 uppercase">{title}</h4>
        <p className={`text-2xl font-bold ${color || 'text-white'}`}>{value}</p>
    </div>
);

export default function BacktestResults({ results, onClose, alertName, loading }) {
    if (!results && !loading) return null;

    const { triggeredBets = [], totalFixtures, totalProfit, hitRate } = results || {};

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-emerald-500/50 w-full max-w-2xl transform transition-all">
                <div className="p-6 text-center border-b border-gray-700">
                    <h2 className="text-2xl font-bold text-emerald-400">Resultados do Backtest</h2>
                    <p className="text-gray-400 text-sm mt-1">Simulação para o alerta: <span className="font-bold text-white">{alertName}</span></p>
                </div>

                {loading ? (
                    <div className="p-16 text-center text-emerald-400">
                        <p>Analisando jogos históricos... Isso pode levar um momento.</p>
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <StatCard title="Alertas Gerados" value={triggeredBets.length} />
                            <StatCard title="Taxa de Acerto" value={`${hitRate.toFixed(1)}%`} color={hitRate > 50 ? 'text-green-400' : 'text-red-400'} />
                            <StatCard title="Unidades +/-" value={totalProfit.toFixed(2)} color={totalProfit > 0 ? 'text-green-400' : 'text-red-400'} />
                            <StatCard title="Jogos Analisados" value={totalFixtures} />
                        </div>

                        <h3 className="text-lg font-bold text-white mb-3">Apostas que seriam acionadas</h3>
                        <div className="max-h-60 overflow-y-auto bg-gray-900/50 p-2 rounded-lg">
                            {triggeredBets.length > 0 ? (
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-400 uppercase">
                                        <tr>
                                            <th className="px-4 py-2">Jogo</th>
                                            <th className="px-4 py-2">Aposta</th>
                                            <th className="px-4 py-2 text-center">Odd</th>
                                            <th className="px-4 py-2 text-center">Resultado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-300">
                                        {triggeredBets.map((bet, index) => (
                                            <tr key={index} className="border-t border-gray-700">
                                                <td className="px-4 py-2 font-medium">{bet.fixtureName}</td>
                                                <td className="px-4 py-2">{bet.outcome}</td>
                                                <td className="px-4 py-2 text-center font-mono">{bet.odd.toFixed(2)}</td>
                                                <td className={`px-4 py-2 text-center font-bold ${bet.isWin ? 'text-green-400' : 'text-red-400'}`}>
                                                    {bet.isWin ? 'GANHA' : 'PERDIDA'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-center text-gray-500 py-8">Nenhum jogo correspondeu aos critérios do seu alerta neste período.</p>
                            )}
                        </div>
                    </div>
                )}


                <div className="bg-gray-900/50 px-6 py-4 text-right rounded-b-xl">
                    <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition">
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
}