import React from 'react';

// Componente para listar os jogadores
const PlayerList = ({ title, players }) => (
    <div>
        <h5 className="font-bold text-gray-300 mb-2">{title}</h5>
        {players && players.length > 0 ? (
            <ul className="text-xs text-gray-400 space-y-1">
                {players.map(p => (
                    <li key={p.player.id} className="flex items-center">
                        <span className="font-mono bg-gray-600/50 px-1.5 py-0.5 rounded-md text-gray-300 mr-2 w-8 text-center">{p.player.number || '-'}</span>
                        <span>{p.player.name}</span>
                        <span className="ml-auto text-gray-500">{p.player.pos}</span>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-xs text-gray-500">Ainda não disponível</p>
        )}
    </div>
);

// Componente para listar as ausências
const InjuryList = ({ title, players }) => (
     <div className="mt-4">
        <h5 className="font-bold text-red-400 mb-2">{title}</h5>
        {players && players.length > 0 ? (
            <ul className="text-xs text-gray-400 space-y-1">
            {players.map(i => (
                <li key={i.player.id}>- {i.player.name} <span className="text-gray-500">({i.player.reason})</span></li>
            ))}
            </ul>
        ) : (
             <p className="text-xs text-gray-500">Nenhuma ausência reportada.</p>
        )}
    </div>
);


const LineupAnalysisCard = ({ lineups, injuries, teamNames }) => {
    if (!lineups || !injuries || !teamNames) return null;

    const homeLineup = lineups.find(d => d.team.id === teamNames.home.id);
    const awayLineup = lineups.find(d => d.team.id === teamNames.away.id);
    
    const homeInjuries = injuries.filter(i => i.team.id === teamNames.home.id);
    const awayInjuries = injuries.filter(i => i.team.id === teamNames.away.id);

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {/* Coluna da Equipa da Casa */}
                <div>
                    <h4 className="font-bold text-white mb-2 text-center">{teamNames.home.name}</h4>
                    <p className="text-center text-emerald-400 font-mono text-sm mb-4">{homeLineup?.formation || 'Formação Indefinida'}</p>
                    <PlayerList title="Prováveis Titulares" players={homeLineup?.startXI} />
                    <InjuryList title="Ausências Notáveis" players={homeInjuries} />
                </div>
                {/* Coluna da Equipa Visitante */}
                <div>
                    <h4 className="font-bold text-white mb-2 text-center">{teamNames.away.name}</h4>
                    <p className="text-center text-emerald-400 font-mono text-sm mb-4">{awayLineup?.formation || 'Formação Indefinida'}</p>
                    <PlayerList title="Prováveis Titulares" players={awayLineup?.startXI} />
                    <InjuryList title="Ausências Notáveis" players={awayInjuries} />
                </div>
            </div>
        </div>
    );
};

export default LineupAnalysisCard;
