import React from 'react';

const StatsComparisonCard = ({ stats }) => {
    if (!stats) return null;

    const { home, away, teamNames } = stats;

    const StatRow = ({ title, homeValue, awayValue }) => (
        <div className="flex items-center py-3 border-b border-gray-700">
            <div className="w-1/3 text-right pr-4 text-white font-bold text-lg">{homeValue}</div>
            <div className="w-1/3 text-center text-gray-400 text-sm uppercase">{title}</div>
            <div className="w-1/3 text-left pl-4 text-white font-bold text-lg">{awayValue}</div>
        </div>
    );

    return (
        <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex justify-between items-center mb-4">
                <div className="w-1/3 text-center">
                    <img src={teamNames.home.logo} alt={teamNames.home.name} className="w-12 h-12 mx-auto mb-2" />
                    <h4 className="font-bold text-white">{teamNames.home.name}</h4>
                </div>
                <div className="w-1/3 text-center text-gray-500 font-bold">VS</div>
                <div className="w-1/3 text-center">
                    <img src={teamNames.away.logo} alt={teamNames.away.name} className="w-12 h-12 mx-auto mb-2" />
                    <h4 className="font-bold text-white">{teamNames.away.name}</h4>
                </div>
            </div>

            <div className="space-y-2">
                <StatRow title="Gols Marcados" homeValue={home.goalsFor} awayValue={away.goalsFor} />
                <StatRow title="Gols Sofridos" homeValue={home.goalsAgainst} awayValue={away.goalsAgainst} />
                <StatRow title="Chutes por Jogo" homeValue={home.shotsTotal} awayValue={away.shotsTotal} />
                <StatRow title="Chutes no Gol" homeValue={home.shotsOnGoal} awayValue={away.shotsOnGoal} />
                <StatRow title="Escanteios" homeValue={home.corners} awayValue={away.corners} />
                <StatRow title="Cartões Amarelos" homeValue={home.yellowCards} awayValue={away.yellowCards} />
                <StatRow title="Posse de Bola" homeValue={`${home.possession}%`} awayValue={`${away.possession}%`} />
            </div>
        </div>
    );
};

export default StatsComparisonCard;
