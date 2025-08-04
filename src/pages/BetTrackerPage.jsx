import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const StatCard = ({ title, value, color }) => (
    <div className="bg-gray-800 p-4 rounded-lg text-center">
        <h3 className="text-sm font-medium text-gray-400 uppercase">{title}</h3>
        <p className={`text-3xl font-bold ${color || 'text-white'}`}>{value}</p>
    </div>
);

// Novo componente para o estado vazio
const EmptyState = ({ onNavigate }) => (
    <div className="text-center bg-gray-800 p-16 rounded-lg">
        <h3 className="text-2xl font-bold text-white mb-2">Ainda não há apostas registadas.</h3>
        <p className="text-gray-400 mb-6">Comece a sua jornada analisando um jogo e registando a sua primeira aposta de valor!</p>
        <button
            onClick={onNavigate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition"
        >
            Ir para a Análise Profunda
        </button>
    </div>
);


export default function BetTrackerPage({ bets, bankroll, setBankroll, onResolveBets, onDeleteBet, setActivePage }) {
    const [profit, setProfit] = useState(0);
    const [roi, setRoi] = useState(0);
    const apiKey = import.meta.env.VITE_API_FOOTBALL_KEY;
    const [chartData, setChartData] = useState([]);
    const [marketData, setMarketData] = useState([]);

    useEffect(() => {
        const resolvedBets = bets.filter(bet => bet.result !== 'Pendente');
        const totalProfit = resolvedBets.reduce((acc, bet) => acc + bet.profit, 0);
        const totalStaked = resolvedBets.reduce((acc, bet) => acc + (bet.stake / 100 * bankroll), 0);
        const currentRoi = totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0;

        setProfit(totalProfit);
        setRoi(currentRoi);

        // Prepara os dados para o gráfico de evolução
        let cumulativeProfit = 0;
        const evolutionData = resolvedBets.map((bet, index) => {
            cumulativeProfit += bet.profit;
            return { name: `Aposta ${index + 1}`, Lucro: cumulativeProfit, Banca: bankroll + cumulativeProfit };
        });
        setChartData(evolutionData);

        // Prepara os dados para o gráfico de lucro por mercado
        const profitByMarket = resolvedBets.reduce((acc, bet) => {
            const marketType = bet.market.split(':')[0].trim(); // Agrupa por tipo de mercado
            if (!acc[marketType]) {
                acc[marketType] = 0;
            }
            acc[marketType] += bet.profit;
            return acc;
        }, {});

        const marketChartData = Object.entries(profitByMarket).map(([name, Lucro]) => ({ name, Lucro }));
        setMarketData(marketChartData);

    }, [bets, bankroll]);

    return (
        <div className="max-w-7xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-emerald-400">Bet Tracker & Desempenho</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                    Acompanhe as suas apostas, analise o seu desempenho e gira a sua banca.
                </p>
            </header>

            {bets.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <StatCard title="Banca Atual" value={`R$${(bankroll + profit).toFixed(2)}`} />
                        <StatCard title="Lucro/Prejuízo" value={`${profit >= 0 ? '+' : ''}R$${profit.toFixed(2)}`} color={profit >= 0 ? 'text-green-400' : 'text-red-400'} />
                        <StatCard title="ROI" value={`${roi.toFixed(2)}%`} color={roi >= 0 ? 'text-green-400' : 'text-red-400'} />
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        <div className="bg-gray-800 p-6 rounded-lg">
                            <h3 className="text-lg font-bold text-white mb-4">Evolução da Banca</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                    <XAxis dataKey="name" stroke="#A0AEC0" />
                                    <YAxis stroke="#A0AEC0" />
                                    <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: 'none' }} />
                                    <Legend />
                                    <Line type="monotone" dataKey="Banca" stroke="#38B2AC" strokeWidth={2} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                         <div className="bg-gray-800 p-6 rounded-lg">
                            <h3 className="text-lg font-bold text-white mb-4">Lucro por Mercado</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={marketData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                                    <XAxis dataKey="name" stroke="#A0AEC0" />
                                    <YAxis stroke="#A0AEC0" />
                                    <Tooltip contentStyle={{ backgroundColor: '#2D3748', border: 'none' }} />
                                    <Legend />
                                    <Bar dataKey="Lucro" fill="#38B2AC" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-gray-800 p-4 rounded-lg mb-8 flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-grow">
                            <label htmlFor="bankroll-input" className="block text-sm font-medium text-gray-300">Definir Banca Inicial (R$)</label>
                            <input
                                id="bankroll-input"
                                type="number"
                                value={bankroll}
                                onChange={(e) => setBankroll(parseFloat(e.target.value))}
                                className="mt-1 bg-gray-700 border border-gray-600 text-white rounded-md p-2 w-full md:w-auto"
                            />
                        </div>
                        <div className="w-full md:w-auto">
                            <button 
                                onClick={() => onResolveBets(apiKey)}
                                disabled={!apiKey || apiKey === 'SUA_CHAVE_API_AQUI'}
                                className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Atualizar Resultados
                            </button>
                        </div>
                    </div>
                    
                    <div className="bg-gray-800 rounded-lg overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Jogo</th>
                                    <th scope="col" className="px-6 py-3">Mercado</th>
                                    <th scope="col" className="px-6 py-3 text-center">Odd</th>
                                    <th scope="col" className="px-6 py-3 text-center">Stake (%)</th>
                                    <th scope="col" className="px-6 py-3 text-center">Resultado</th>
                                    <th scope="col" className="px-6 py-3 text-center">Lucro/Prejuízo (R$)</th>
                                    <th scope="col" className="px-6 py-3 text-center">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bets.map(bet => (
                                    <tr key={bet.id} className="border-b border-gray-700">
                                        <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">{bet.fixture}</th>
                                        <td className="px-6 py-4">{bet.market}</td>
                                        <td className="px-6 py-4 text-center font-mono">{bet.odd.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-center font-mono">{bet.stake.toFixed(2)}%</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                bet.result === 'Ganha' ? 'bg-green-900 text-green-300' :
                                                bet.result === 'Perdida' ? 'bg-red-900 text-red-300' :
                                                'bg-yellow-900 text-yellow-300'
                                            }`}>
                                                {bet.result}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-center font-mono font-bold ${
                                            bet.profit > 0 ? 'text-green-400' : bet.profit < 0 ? 'text-red-400' : 'text-gray-400'
                                        }`}>
                                            {bet.profit >= 0 ? '+' : ''}{bet.profit.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={() => onDeleteBet(bet.id)}
                                                className="text-red-500 hover:text-red-400 text-xl"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            ) : (
                <EmptyState onNavigate={() => setActivePage('deepAnalysis')} />
            )}
        </div>
    );
}