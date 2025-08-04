import React, { useContext } from 'react';
import { AnalysisContext } from '../context/AnalysisContext';

const FixtureSelector = () => {
    const { analysisState, handleLeagueChange, updateAnalysisState } = useContext(AnalysisContext);
    const { leagues, fixtures, selectedLeague, selectedFixtureId } = analysisState;
    const apiKey = import.meta.env.VITE_API_FOOTBALL_KEY;

    return (
        <div className="bg-gray-700/50 p-4 rounded-lg mb-6">
            <h3 className="text-lg font-semibold text-emerald-400 mb-4">Busca Automática (API)</h3>
            {!apiKey ? (
                <div className="text-center bg-yellow-500/10 text-yellow-300 p-3 rounded-md">
                    Por favor, crie um ficheiro .env.local e adicione a sua chave da API-Football para começar.
                </div>
            ) : (
                <div className="flex flex-col space-y-4">
                    <select 
                        value={selectedLeague} 
                        onChange={(e) => handleLeagueChange(e.target.value)} 
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white"
                    >
                        <option value="">Selecione uma Liga</option>
                        {leagues.map(l => (
                            <option key={l.league.id} value={l.league.id}>{l.country.name} - {l.league.name}</option>
                        ))}
                    </select>
                    <select 
                        value={selectedFixtureId}
                        onChange={(e) => {
                            updateAnalysisState({
                                selectedFixtureId: e.target.value,
                                results: null
                            });
                        }}
                        disabled={!selectedLeague || fixtures.length === 0}
                        className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white disabled:opacity-50"
                    >
                        <option value="">Selecione um Jogo</option>
                        {fixtures.map(f => (
                            <option key={f.fixture.id} value={f.fixture.id}>{f.teams.home.name} vs {f.teams.away.name}</option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};

export default FixtureSelector;