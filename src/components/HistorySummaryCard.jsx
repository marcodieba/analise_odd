import React from 'react';

export default function HistorySummaryCard({ title, data, teamId }) {
    if (!data || data.length < 1) {
        return (
            <div className="bg-gray-800 p-4 rounded-lg">
                <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                <p className="text-sm text-gray-500">Sem dados de histórico suficientes.</p>
            </div>
        );
    }

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    const form = [];

    // Ordena os jogos do mais recente para o mais antigo para a string de "forma"
    const sortedFixtures = [...data].sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date));

    sortedFixtures.forEach(f => {
        if (f.fixture.status.short !== 'FT') return;

        const isHomeTeam = f.teams.home.id === teamId;
        const winner = f.teams.home.winner ? 'H' : f.teams.away.winner ? 'A' : 'D';

        if (winner === 'D') {
            draws++;
            form.push('E');
        } else if ((isHomeTeam && winner === 'H') || (!isHomeTeam && winner === 'A')) {
            wins++;
            form.push('V');
        } else {
            losses++;
            form.push('D');
        }
        
        if (isHomeTeam) {
            goalsFor += f.goals.home;
            goalsAgainst += f.goals.away;
        } else {
            goalsFor += f.goals.away;
            goalsAgainst += f.goals.home;
        }
    });

    const totalGames = wins + draws + losses;
    const avgGoalsFor = totalGames > 0 ? (goalsFor / totalGames).toFixed(2) : 0;
    const avgGoalsAgainst = totalGames > 0 ? (goalsAgainst / totalGames).toFixed(2) : 0;

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg h-full">
            <h3 className="text-lg font-bold text-white mb-3 text-center truncate">{title}</h3>
            
            <div className="text-center mb-3">
                <p className="text-xs text-gray-400 mb-1">Últimos {totalGames} Jogos</p>
                <div className="flex justify-center space-x-2">
                    {form.slice(0, 5).map((result, index) => (
                        <span key={index} className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${
                            result === 'V' ? 'bg-green-500 text-white' :
                            result === 'E' ? 'bg-yellow-500 text-white' :
                            'bg-red-500 text-white'
                        }`}>
                            {result}
                        </span>
                    ))}
                </div>
            </div>

            <div className="space-y-2 text-sm">
                <div className="flex justify-between p-2 bg-gray-700/50 rounded">
                    <span className="text-gray-300">Resultados (V-E-D)</span>
                    <span className="font-mono font-bold text-white">{`${wins}-${draws}-${losses}`}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-700/50 rounded">
                    <span className="text-gray-300">Média de Golos Marcados</span>
                    <span className="font-mono font-bold text-green-400">{avgGoalsFor}</span>
                </div>
                <div className="flex justify-between p-2 bg-gray-700/50 rounded">
                    <span className="text-gray-300">Média de Golos Sofridos</span>
                    <span className="font-mono font-bold text-red-400">{avgGoalsAgainst}</span>
                </div>
            </div>
        </div>
    );
}