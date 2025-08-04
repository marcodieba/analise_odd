import React from 'react';

const AdvancedStatRow = ({ title, homeValue, awayValue, homeColor = 'text-white', awayColor = 'text-white' }) => (
    <div className="flex items-center py-2 border-b border-gray-700/50">
        <div className={`w-1/3 text-right pr-4 font-bold text-lg ${homeColor}`}>{homeValue}</div>
        <div className="w-1/3 text-center text-gray-400 text-xs uppercase">{title}</div>
        <div className={`w-1/3 text-left pl-4 font-bold text-lg ${awayColor}`}>{awayValue}</div>
    </div>
);

const AdvancedStatsCard = ({ stats }) => {
    if (!stats) return null;

    const { home, away, teamNames } = stats;

    // Função para determinar a cor com base na comparação
    const getColor = (homeVal, awayVal, higherIsBetter = true) => {
        if (homeVal > awayVal) {
            return { home: higherIsBetter ? 'text-green-400' : 'text-red-400', away: higherIsBetter ? 'text-red-400' : 'text-green-400' };
        }
        if (awayVal > homeVal) {
            return { home: higherIsBetter ? 'text-red-400' : 'text-green-400', away: higherIsBetter ? 'text-green-400' : 'text-red-400' };
        }
        return { home: 'text-white', away: 'text-white' };
    };

    const offensiveColors = getColor(home.offensiveStrength, away.offensiveStrength);
    const defensiveColors = getColor(home.defensiveSolidity, away.defensiveSolidity, false); // Menor é melhor
    const xGColors = getColor(home.xG, away.xG);

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

            <div className="space-y-1">
                <AdvancedStatRow 
                    title="Força Ofensiva" 
                    homeValue={home.offensiveStrength.toFixed(2)} 
                    awayValue={away.offensiveStrength.toFixed(2)}
                    homeColor={offensiveColors.home}
                    awayColor={offensiveColors.away}
                />
                <AdvancedStatRow 
                    title="Solidez Defensiva" 
                    homeValue={home.defensiveSolidity.toFixed(2)} 
                    awayValue={away.defensiveSolidity.toFixed(2)}
                    homeColor={defensiveColors.home}
                    awayColor={defensiveColors.away}
                />
                 <AdvancedStatRow 
                    title="Golos Esperados (xG)" 
                    homeValue={home.xG.toFixed(2)} 
                    awayValue={away.xG.toFixed(2)}
                    homeColor={xGColors.home}
                    awayColor={xGColors.away}
                />
            </div>
             <p className="text-xs text-gray-500 mt-4 text-center">
                Força Ofensiva e Defensiva são calculadas com base em golos, chutes e forma. Valores mais altos indicam melhor desempenho ofensivo, e valores mais baixos indicam melhor desempenho defensivo.
            </p>
        </div>
    );
};

export default AdvancedStatsCard;
