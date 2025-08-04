// src/pages/OddsHunterPage.jsx

import React, { useState, useEffect } from 'react';
import { useAnalysisEngine } from '../hooks/useAnalysisEngine';

// NOVO Componente para renderizar o resultado de CADA jogo
const FixtureAnalysisCard = ({ result }) => {
    const { fixtureName, bestGreenBet, error, homeStats, awayStats } = result;

    if (bestGreenBet) {
        // Card de Sucesso
        return (
            <div className="bg-gray-700/50 p-4 rounded-lg border border-emerald-500/30">
                <p className="text-sm font-bold text-white mb-2">{fixtureName}</p>
                <div className="bg-emerald-900/50 p-3 rounded-lg flex justify-between items-center">
                    <div>
                        <p className="text-xs text-emerald-300">Oportunidade Encontrada</p>
                        <p className="font-bold text-white">{bestGreenBet.outcome}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-mono text-lg text-emerald-400">{bestGreenBet.odd.toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{(bestGreenBet.prob * 100).toFixed(1)}% Prob.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Card de Falha com Dados
    return (
        <div className="bg-gray-700/50 p-4 rounded-lg border border-yellow-500/30">
            <p className="text-sm font-bold text-white mb-2">{fixtureName}</p>
            <div className="bg-yellow-900/50 p-3 rounded-lg text-center">
                <p className="text-xs text-yellow-300">Análise Incompleta</p>
                <p className="font-bold text-white text-sm">{error || "Não foi possível concluir a análise."}</p>
            </div>
            <div className="mt-3 text-xs text-gray-400 space-y-1">
                <p><span className="font-bold text-gray-300">Dados Casa:</span> {homeStats ? `Golos M/S: ${homeStats.goalsForHome.toFixed(2)} / ${homeStats.goalsAgainstHome.toFixed(2)} (Fonte: ${homeStats.source})` : "Dados insuficientes."}</p>
                <p><span className="font-bold text-gray-300">Dados Visitante:</span> {awayStats ? `Golos M/S: ${awayStats.goalsForAway.toFixed(2)} / ${awayStats.goalsAgainstAway.toFixed(2)} (Fonte: ${awayStats.source})` : "Dados insuficientes."}</p>
            </div>
        </div>
    );
};


// Componente para o Acordeão da Liga
const LeagueAccordion = ({ league, fixtures, selectedFixtures, onToggleFixture }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-center font-bold text-lg text-emerald-400 border-b border-gray-700 pb-1 mb-2 text-left"
            >
                <span>{league.country} - {league.name}</span>
                <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {isOpen && (
                <div className="space-y-2">
                    {fixtures.map(fixture => (
                        <label key={fixture.fixture.id} className="flex items-center bg-gray-700/50 p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                            <input 
                                type="checkbox"
                                checked={selectedFixtures.has(fixture.fixture.id)}
                                onChange={() => onToggleFixture(fixture.fixture.id)}
                                className="h-5 w-5 rounded bg-gray-800 border-gray-600 text-emerald-500 focus:ring-emerald-600"
                            />
                            <span className="ml-4 text-white">{fixture.teams.home.name} vs {fixture.teams.away.name}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

export default function OddsHunterPage() {
    const { loading, error, apiFetch, runFullAnalysis, fetchLeagueContext } = useAnalysisEngine();
    
    const [leagues, setLeagues] = useState([]);
    const [fixturesByLeague, setFixturesByLeague] = useState({});
    const [selectedFixtures, setSelectedFixtures] = useState(new Set());
    const [analysisResults, setAnalysisResults] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    
    useEffect(() => {
        const fetchAllFixtures = async () => {
            const today = new Date().toISOString().slice(0, 10);
            const fixturesData = await apiFetch(`v3/fixtures?date=${today}`);
            if (!fixturesData) return;

            const leaguesMap = {};
            const fixturesMap = {};

            fixturesData.forEach(fixture => {
                const leagueId = fixture.league.id;
                if (!leaguesMap[leagueId]) leaguesMap[leagueId] = { id: leagueId, name: fixture.league.name, country: fixture.league.country };
                if (!fixturesMap[leagueId]) fixturesMap[leagueId] = [];
                fixturesMap[leagueId].push(fixture);
            });
            
            setLeagues(Object.values(leaguesMap).sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name)));
            setFixturesByLeague(fixturesMap);
        };
        fetchAllFixtures();
    }, [apiFetch]);

    const handleToggleFixture = (fixtureId) => {
        const newSelection = new Set(selectedFixtures);
        if (newSelection.has(fixtureId)) newSelection.delete(fixtureId);
        else newSelection.add(fixtureId);
        setSelectedFixtures(newSelection);
    };

    const handleAnalyzeSelection = async () => {
        setAnalysisResults([]);
        const allFixtures = Object.values(fixturesByLeague).flat();
        const fixturesToAnalyze = allFixtures.filter(f => selectedFixtures.has(f.fixture.id));
        
        const groupedByLeague = fixturesToAnalyze.reduce((acc, fixture) => {
            const leagueId = fixture.league.id;
            if (!acc[leagueId]) acc[leagueId] = [];
            acc[leagueId].push(fixture);
            return acc;
        }, {});

        let allPromiseResults = [];
        for (const leagueId in groupedByLeague) {
            const leagueContext = await fetchLeagueContext(leagueId);
            const fixturesInLeague = groupedByLeague[leagueId];
            const analysisPromises = fixturesInLeague.map(fixture => runFullAnalysis(fixture, leagueContext));
            const leagueResults = await Promise.all(analysisPromises);
            allPromiseResults = [...allPromiseResults, ...leagueResults];
        }
        
        setAnalysisResults(allPromiseResults);
    };
    
    const filteredLeagues = leagues.map(league => {
        const searchLower = searchTerm.toLowerCase();
        const filteredFixtures = (fixturesByLeague[league.id] || []).filter(fixture => 
            fixture.teams.home.name.toLowerCase().includes(searchLower) ||
            fixture.teams.away.name.toLowerCase().includes(searchLower)
        );

        if (filteredFixtures.length > 0) return { ...league, fixtures: filteredFixtures };
        if (league.name.toLowerCase().includes(searchLower) || league.country.toLowerCase().includes(searchLower)) {
            return { ...league, fixtures: fixturesByLeague[league.id] || [] };
        }
        return null;
    }).filter(Boolean);

    return (
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
                <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-emerald-400">🎯 Caçador de Odds</h1>
                    <p className="text-gray-400 mt-2">
                        Selecione os jogos do dia para uma análise aprofundada.
                    </p>
                </header>

                <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                        <h2 className="text-2xl font-bold text-white">Jogos do Dia</h2>
                        <button 
                            onClick={handleAnalyzeSelection}
                            disabled={loading || selectedFixtures.size === 0}
                            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'A Analisar...' : `Analisar ${selectedFixtures.size} Jogo(s)`}
                        </button>
                    </div>

                    <div className="mb-4">
                        <input
                            type="text"
                            placeholder="Filtrar por liga, país ou time..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    
                    {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4">{error}</div>}

                    <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                        {loading && !leagues.length ? <p className="text-center text-emerald-400">A carregar jogos...</p> : null}
                        {filteredLeagues.length > 0 ? (
                            filteredLeagues.map(league => (
                                <LeagueAccordion
                                    key={league.id}
                                    league={league}
                                    fixtures={league.fixtures}
                                    selectedFixtures={selectedFixtures}
                                    onToggleFixture={handleToggleFixture}
                                />
                            ))
                        ) : (
                            !loading && <p className="text-center text-gray-500 py-8">Nenhum jogo encontrado para o seu filtro.</p>
                        )}
                    </div>
                </div>
            </div>
            
            <div className="mt-8 lg:mt-0">
                 <header className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-white">Painel de Análise</h1>
                    <p className="text-gray-400 mt-2">
                        Resultados individuais para cada jogo selecionado.
                    </p>
                </header>
                <div className="bg-gray-800 p-6 rounded-lg shadow-lg max-h-[80vh] overflow-y-auto">
                    {loading && analysisResults.length === 0 && <p className="text-center text-emerald-400">A analisar confrontos...</p>}
                    {analysisResults.length > 0 ? (
                        <div className="space-y-4">
                            {analysisResults.map(result => (
                                <FixtureAnalysisCard key={result.fixtureName} result={result} />
                            ))}
                        </div>
                    ) : (
                       !loading && <p className="text-center text-gray-500 py-16">Selecione os jogos e clique em "Analisar" para ver os resultados.</p>
                    )}
                </div>
            </div>
        </div>
    );
}