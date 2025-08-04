import React from 'react';

const H2HAnalysisCard = ({ signal, message, h2hFixtures }) => {
    // Modo Preditivo (usado na Análise Profunda)
    if (signal) {
        const signalConfig = {
            confirm: { icon: '✅', color: 'text-green-400' },
            neutral: { icon: '⚪', color: 'text-gray-300' },
            alert: { icon: '⚠️', color: 'text-yellow-400' },
        };
        const config = signalConfig[signal] || signalConfig.neutral;

        return (
            <div className="bg-gray-700/50 p-4 rounded-lg">
                <div className="flex items-start space-x-4">
                    <div className="text-2xl mt-1">{config.icon}</div>
                    <div>
                        <p className={`font-bold ${config.color}`}>Sinal do Confronto Direto</p>
                        <p className="text-sm text-gray-400">{message}</p>
                    </div>
                </div>
            </div>
        );
    }

    // Modo Descritivo (usado no Centro de Stats)
    if (h2hFixtures && h2hFixtures.length > 0) {
        return (
            <div className="bg-gray-700/50 p-4 rounded-lg">
                 <h3 className="text-lg font-semibold text-emerald-400 mb-2">Confronto Direto (H2H)</h3>
                 <div className="space-y-2">
                    {h2hFixtures.slice(0, 5).map(fixture => (
                        <div key={fixture.fixture.id} className="bg-gray-800/50 p-2 rounded-md flex justify-between items-center text-sm">
                            <span className="text-gray-400">{new Date(fixture.fixture.date).toLocaleDateString('pt-BR')}</span>
                            <span className="font-bold text-white">{fixture.teams.home.name}</span>
                            <span className="px-2 py-1 bg-gray-700 rounded-md font-mono text-white">
                                {fixture.goals.home} - {fixture.goals.away}
                            </span>
                            <span className="font-bold text-white">{fixture.teams.away.name}</span>
                        </div>
                    ))}
                 </div>
            </div>
        );
    }

    // Fallback se não houver dados
    return null;
};

export default H2HAnalysisCard;
