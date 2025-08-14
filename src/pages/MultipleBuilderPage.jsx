// src/pages/MultipleBuilderPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAnalysisEngine } from '../hooks/useAnalysisEngine';
import SuggestedMultipleCard from '../components/SuggestedMultipleCard.jsx';
import CorrectScorePanel from '../components/CorrectScorePanel.jsx';
import FixtureErrorCard from '../components/FixtureErrorCard.jsx';
import { BetRow } from '../components/UnifiedFixtureCard.jsx';


// --- Componente do Boletim de Aposta (sem alterações) ---
const MultipleBetSlip = ({ selectedBets, onRemove, onClear }) => {
    const [stake, setStake] = useState(10); 
    const totalOdd = selectedBets.reduce((acc, bet) => acc * (bet.odd || 1), 1);
    const potentialReturn = totalOdd * stake;

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg">
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
                                    <span className="font-mono text-white">{(bet.odd || 0).toFixed(2)}</span>
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
    const [analysisResults, setAnalysisResults] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedBets, setSelectedBets] = useState([]);
    
    const fetchAllFixtures = useCallback(async () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const formattedDate = `${year}-${month}-${day}`;
        
        try {
            const fixturesData = await apiFetch(`v3/fixtures?date=${formattedDate}&timezone=America/Sao_Paulo`, false);
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
        } catch (e) {
            console.error("Falha ao buscar jogos do dia:", e);
        }
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
        const allFixtures = Object.values(fixturesByLeague).flat();
        const fixturesToAnalyze = allFixtures.filter(f => selectedFixtures.has(f.fixture.id));

        const initialResults = {};
        fixturesToAnalyze.forEach(f => {
            initialResults[f.fixture.id] = { status: 'loading' };
        });
        setAnalysisResults(initialResults);

        const groupedByLeague = fixturesToAnalyze.reduce((acc, fixture) => {
            const leagueId = fixture.league.id;
            if (!acc[leagueId]) acc[leagueId] = [];
            acc[leagueId].push(fixture);
            return acc;
        }, {});

        for (const leagueId in groupedByLeague) {
            const leagueContext = await fetchLeagueContext(leagueId);
            const fixturesInLeague = groupedByLeague[leagueId];

            for (const fixture of fixturesInLeague) {
                runFullAnalysis(fixture, leagueContext).then(result => {
                    setAnalysisResults(prevResults => ({
                        ...prevResults,
                        [fixture.fixture.id]: { status: 'done', data: result }
                    }));
                });
            }
        }
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

    const successfulAnalyses = Object.values(analysisResults)
        .filter(res => res.status === 'done' && res.data && !res.data.error)
        .map(res => res.data);

    const highProbValuableBets = successfulAnalyses
        .flatMap(result => result.valuableBets || [])
        .filter(bet => bet.prob > 0.55)
        .sort((a, b) => b.prob - a.prob);

    const suggestedBets = highProbValuableBets.slice(0, 4);
    
    // *** ALTERADO: A lista de mercados agora inclui novamente os mercados secundários. ***
    const marketsOrder = [
        'Resultado Final',
        'Total de Golos',
        'Ambas Marcam',
        'Total de Cantos',
        'Total de Chutes ao Gol',
        'Placar Exato'
    ];

    return (
        <div className="max-w-7xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-emerald-400">🛠️ Criador de Múltiplas</h1>
                <p className="text-gray-400 mt-2">Selecione os jogos, analise as oportunidades e construa a sua múltipla com base em dados.</p>
            </header>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-6">
                    <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
                            <h2 className="text-2xl font-bold text-white">Jogos do Dia</h2>
                        </div>
                        <div className="mb-4">
                            <input type="text" placeholder="Filtrar por liga ou equipa..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2 placeholder-gray-400"/>
                        </div>
                        {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md mb-4">{error}</div>}
                        <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                            {filteredLeagues.map(league => (
                                <LeagueAccordion key={league.id} league={league} fixtures={league.fixtures} selectedFixtures={selectedFixtures} onToggleFixture={handleToggleFixture}/>
                            ))}
                        </div>
                         <button onClick={handleAnalyzeSelection} disabled={loading || selectedFixtures.size === 0} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50">
                            {loading ? 'A Analisar...' : `Analisar ${selectedFixtures.size} Jogo(s)`}
                        </button>
                    </div>

                    <MultipleBetSlip 
                        selectedBets={selectedBets} 
                        onRemove={handleToggleBetInSlip} 
                        onClear={() => setSelectedBets([])}
                    />
                </div>

                <div className="lg:col-span-2 space-y-6">
                    {successfulAnalyses.length > 0 && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <SuggestedMultipleCard suggestedBets={suggestedBets} />
                            <CorrectScorePanel analysisResults={successfulAnalyses} />
                        </div>
                    )}
                    
                    {Object.keys(analysisResults).length > 0 && (
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-4">Resultados da Análise</h2>
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {Object.entries(analysisResults).map(([fixtureId, result]) => {
                                    if (result.status === 'loading') {
                                        return <div key={fixtureId} className="bg-gray-800 p-4 rounded-lg shadow-lg animate-pulse h-48"></div>;
                                    }

                                    if (result.status === 'done') {
                                        const analysis = result.data;
                                        if (analysis.error) {
                                            return <FixtureErrorCard key={fixtureId} fixtureName={analysis.fixtureName} error={analysis.error} />;
                                        }

                                        const valuableBets = (analysis.valuableBets || []).filter(bet => bet.prob > 0.55);
                                        const betsByMarket = valuableBets.reduce((acc, bet) => {
                                            if (!acc[bet.market]) acc[bet.market] = [];
                                            acc[bet.market].push(bet);
                                            return acc;
                                        }, {});

                                        return (
                                            <div key={fixtureId} className="bg-gray-800 p-4 rounded-lg shadow-lg flex flex-col animate-fade-in">
                                                <h3 className="text-lg font-bold text-white mb-3 text-center border-b border-gray-700 pb-2">{analysis.fixtureName}</h3>
                                                {valuableBets.length > 0 ? (
                                                    marketsOrder.map(market => (
                                                        betsByMarket[market] && (
                                                            <div key={market} className="mb-2">
                                                                <span className="inline-block px-2 py-1 rounded bg-emerald-700 text-white text-xs font-bold mb-1">{market}</span>
                                                                {betsByMarket[market].map((bet, idx) => (
                                                                    <BetRow
                                                                        key={idx}
                                                                        bet={bet}
                                                                        onAddToSlip={handleToggleBetInSlip}
                                                                        isInSlip={selectedBets.some(b => b.fixtureName === bet.fixtureName && b.outcome === bet.outcome)}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )
                                                    ))
                                                ) : (
                                                    <p className="text-sm text-gray-500 text-center flex-grow flex items-center justify-center">Nenhuma oportunidade com valor (EV &gt; 3%) e probabilidade &gt; 55% encontrada.</p>
                                                )}
                                            </div>
                                        );
                                    }
                                    return null;
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}