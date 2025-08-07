// src/pages/MultipleBuilderPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAnalysisEngine } from '../hooks/useAnalysisEngine';
import SuggestedMultipleCard from '../components/SuggestedMultipleCard.jsx';
import CorrectScorePanel from '../components/CorrectScorePanel.jsx';
import UnifiedFixtureCard from '../components/UnifiedFixtureCard.jsx';
import FixtureErrorCard from '../components/FixtureErrorCard.jsx';

// --- Componente do Boletim de Aposta (AGORA COM SIMULAÇÃO) ---
const MultipleBetSlip = ({ selectedBets, onRemove, onClear }) => {
    const [stake, setStake] = useState(10); // Estado para o valor da aposta
    const totalOdd = selectedBets.reduce((acc, bet) => acc * bet.odd, 1);
    const potentialReturn = totalOdd * stake; // Cálculo do retorno potencial

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg sticky top-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-emerald-400">Seu Boletim</h3>
                {selectedBets.length > 0 && (
                    <button onClick={onClear} className="text-xs text-red-400 hover:text-red-300">
                        Limpar
                    </button>
                )}
            </div>

            {selectedBets.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Adicione apostas para criar a sua múltipla.</p>
            ) : (
                <>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {selectedBets.map((bet, index) => (
                            <div key={index} className="bg-gray-800 p-2 rounded-md flex justify-between items-center text-sm">
                                <div>
                                    <p className="font-bold text-white">{bet.outcome}</p>
                                    <p className="text-xs text-gray-400">{bet.fixtureName}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="font-mono text-white">{bet.odd.toFixed(2)}</span>
                                    <button onClick={() => onRemove(bet)} className="text-red-500 hover:text-red-400 text-lg leading-none">&times;</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-gray-700 pt-4 mt-4 space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-gray-400">Odd Total</p>
                            <p className="text-2xl font-bold text-emerald-400">{totalOdd.toFixed(2)}</p>
                        </div>
                        <div className="flex justify-between items-center">
                            <label htmlFor="stake-input" className="text-gray-400">Valor (R$)</label>
                            <input
                                id="stake-input"
                                type="number"
                                value={stake}
                                onChange={(e) => setStake(parseFloat(e.target.value) || 0)}
                                className="bg-gray-700 border border-gray-600 rounded-md w-24 p-2 text-right text-white font-mono"
                            />
                        </div>
                        <div className="flex justify-between items-center bg-gray-800 p-3 rounded-lg">
                            <p className="text-gray-400">Retorno Potencial</p>
                            <p className="text-xl font-bold text-emerald-400">R$ {potentialReturn.toFixed(2)}</p>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};


const LeagueAccordion = ({ league, fixtures, selectedFixtures, onToggleFixture }) => {
    const [isOpen, setIsOpen] = useState(true);
    return (
        <div>
            <button onClick={() => setIsOpen(!isOpen)} className="w-full flex justify-between items-center font-bold text-lg text-emerald-400 border-b border-gray-700 pb-1 mb-2 text-left">
                <span>{league.country} - {league.name}</span>
                <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>
            {isOpen && (
                <div className="space-y-2">
                    {fixtures.map(fixture => (
                        <label key={fixture.fixture.id} className="flex items-center bg-gray-700/50 p-3 rounded-lg cursor-pointer hover:bg-gray-700 transition">
                            <input type="checkbox" checked={selectedFixtures.has(fixture.fixture.id)} onChange={() => onToggleFixture(fixture.fixture.id)} className="h-5 w-5 rounded bg-gray-800 border-gray-600 text-emerald-500 focus:ring-emerald-600"/>
                            <span className="ml-4 text-white">{fixture.teams.home.name} vs {fixture.teams.away.name}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};


export default function MultipleBuilderPage() {
    const { loading, error, apiFetch, runFullAnalysis, fetchLeagueContext } = useAnalysisEngine();
    
    const [leagues, setLeagues] = useState([]);
    const [fixturesByLeague, setFixturesByLeague] = useState({});
    const [selectedFixtures, setSelectedFixtures] = useState(new Set());
    const [analysisResults, setAnalysisResults] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBets, setSelectedBets] = useState([]);
    
    const fetchAllFixtures = useCallback(async () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        const endpoint = `v3/fixtures?date=${formattedDate}&timezone=America/Sao_Paulo`;
        const fixturesData = await apiFetch(endpoint, false);
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
    }, [apiFetch]);

    useEffect(() => {
        fetchAllFixtures();
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                fetchAllFixtures();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [fetchAllFixtures]);

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

        const allPromiseResults = [];
        for (const leagueId in groupedByLeague) {
            const leagueContext = await fetchLeagueContext(leagueId);
            const fixturesInLeague = groupedByLeague[leagueId];
            const analysisPromises = fixturesInLeague.map(fixture => runFullAnalysis(fixture, leagueContext));
            const leagueResults = await Promise.all(analysisPromises);
            allPromiseResults.push(...leagueResults);
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

    const handleToggleBetInSlip = (bet) => {
        setSelectedBets(prev => 
            prev.some(b => b.fixtureName === bet.fixtureName && b.outcome === bet.outcome)
            ? prev.filter(b => !(b.fixtureName === bet.fixtureName && b.outcome === bet.outcome))
            : [...prev, bet]
        );
    };

    const highProbValuableBets = analysisResults
        .flatMap(result => result.valuableBets || [])
        .filter(bet => bet.prob > 0.55)
        .sort((a, b) => b.prob - a.prob);

    const betsByFixture = highProbValuableBets.reduce((acc, bet) => {
        if (!acc[bet.fixtureName]) acc[bet.fixtureName] = [];
        acc[bet.fixtureName].push(bet);
        return acc;
    }, {});

    const suggestedBets = highProbValuableBets.slice(0, 4);
    
    const successfulAnalyses = analysisResults.filter(result => !result.error);
    const failedAnalyses = analysisResults.filter(result => result.error);

    return (
        <div className="max-w-7xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-emerald-400">🛠️ Criador de Múltiplas</h1>
                <p className="text-gray-400 mt-2">Selecione os jogos, analise as oportunidades e construa a sua múltipla com base em dados.</p>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                            <h2 className="text-2xl font-bold text-white">Jogos do Dia</h2>
                            <button onClick={handleAnalyzeSelection} disabled={loading || selectedFixtures.size === 0} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50">
                                {loading ? 'A Analisar...' : `Analisar ${selectedFixtures.size} Jogo(s)`}
                            </button>
                        </div>
                        <div className="mb-4">
                            <input type="text" placeholder="Filtrar por liga, país ou equipa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 placeholder-gray-400"/>
                        </div>
                        {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4">{error}</div>}
                        <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
                            {filteredLeagues.map(league => (
                                <LeagueAccordion key={league.id} league={league} fixtures={league.fixtures} selectedFixtures={selectedFixtures} onToggleFixture={handleToggleFixture}/>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                    {analysisResults.length > 0 && (
                        <>
                            <CorrectScorePanel analysisResults={successfulAnalyses} />
                            <SuggestedMultipleCard suggestedBets={suggestedBets} />
                        </>
                    )}
                    <MultipleBetSlip 
                        selectedBets={selectedBets} 
                        onRemove={handleToggleBetInSlip} 
                        onClear={() => setSelectedBets([])} // Passando a função para limpar
                    />
                </div>
            </div>
            <div className="mt-8">
                <h2 className="text-2xl font-bold text-white mb-4">Oportunidades Encontradas (Prob. &gt; 55%)</h2>
                {loading && <p className="text-center text-emerald-400">A processar análises...</p>}
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {failedAnalyses.map((result, index) => (
                        <FixtureErrorCard key={`error-${index}`} fixtureName={result.fixtureName} error={result.error} />
                    ))}
                    {Object.entries(betsByFixture).map(([fixtureName, bets]) => (
                        <UnifiedFixtureCard key={fixtureName} fixtureName={fixtureName} bets={bets} onAddToSlip={handleToggleBetInSlip} selectedBets={selectedBets} />
                    ))}
                </div>

                {!loading && analysisResults.length > 0 && Object.keys(betsByFixture).length === 0 && failedAnalyses.length === 0 && (
                    <div className="text-center bg-gray-800 p-16 rounded-lg">
                        <p className="text-gray-500">Nenhuma oportunidade com mais de 55% de probabilidade encontrada para os jogos selecionados.</p>
                    </div>
                )}
            </div>
        </div>
    );
}