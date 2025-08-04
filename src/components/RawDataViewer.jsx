import React from 'react';

const StatRow = ({ type, homeValue, awayValue }) => (
    <div className="flex justify-between items-center text-sm py-1">
        <span className="w-1/3 text-right text-gray-300">{homeValue ?? '-'}</span>
        <span className="w-1/3 text-center text-xs text-gray-500">{type}</span>
        <span className="w-1/3 text-left text-gray-300">{awayValue ?? '-'}</span>
    </div>
);

export default function RawDataViewer({ title, data, teamId }) {
    if (!data || data.length === 0) {
        return null;
    }

    const formatDateTime = (dateString) => {
        try {
            return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) { return dateString; }
    };

    return (
        <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg mt-6">
            <h3 className="text-xl font-bold text-emerald-400 mb-4">{title}</h3>
            <div className="space-y-4">
                {data.map(({ fixture, league, teams, goals, ipo, isd }) => {
                    if (typeof ipo === 'undefined' || typeof isd === 'undefined') return null;

                    const isHomeTeam = teams.home.id === teamId;
                    const performanceScore = isHomeTeam ? (ipo / isd) : (ipo / isd); // Lógica pode ser refinada
                    const scoreColor = performanceScore > 1.2 ? 'text-green-400' : performanceScore < 0.8 ? 'text-red-400' : 'text-yellow-400';

                    return (
                        <div key={fixture.id} className="bg-gray-700/50 p-4 rounded-lg">
                            <div className="grid grid-cols-3 items-center text-center mb-2 pb-2 border-b border-gray-600">
                                <div className="text-left">
                                    <p className="font-bold text-white">{teams.home.name}</p>
                                </div>
                                <div className="font-mono text-xl text-emerald-400">
                                    {goals.home} - {goals.away}
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-white">{teams.away.name}</p>
                                </div>
                            </div>
                            <div className="text-center text-xs text-gray-400 mb-3">
                                {formatDateTime(fixture.date)} - {league.name}
                            </div>

                            <div className="font-mono bg-gray-900/50 p-3 rounded-md">
                                <div className="flex justify-between items-center text-sm">
                                    <div className="w-1/3 text-center">
                                        <p className="text-xs text-gray-500">IPO</p>
                                        <p className={`font-bold text-lg ${isHomeTeam ? 'text-green-400' : 'text-gray-300'}`}>
                                            {isHomeTeam ? ipo.toFixed(1) : '-'}
                                        </p>
                                    </div>
                                    <div className="w-1/3 text-center">
                                        <p className="text-xs text-gray-500">vs</p>
                                    </div>
                                    <div className="w-1/3 text-center">
                                        <p className="text-xs text-gray-500">IPO</p>
                                        <p className={`font-bold text-lg ${!isHomeTeam ? 'text-green-400' : 'text-gray-300'}`}>
                                            {!isHomeTeam ? ipo.toFixed(1) : '-'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-sm mt-1">
                                    <div className="w-1/3 text-center">
                                        <p className="text-xs text-gray-500">ISD</p>
                                        <p className={`font-bold text-lg ${isHomeTeam ? 'text-red-400' : 'text-gray-300'}`}>
                                            {isHomeTeam ? isd.toFixed(1) : '-'}
                                        </p>
                                    </div>
                                    <div className="w-1/3 text-center">
                                        <p className="text-xs text-gray-500">vs</p>
                                    </div>
                                    <div className="w-1/3 text-center">
                                        <p className="text-xs text-gray-500">ISD</p>
                                        <p className={`font-bold text-lg ${!isHomeTeam ? 'text-red-400' : 'text-gray-300'}`}>
                                            {!isHomeTeam ? isd.toFixed(1) : '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}