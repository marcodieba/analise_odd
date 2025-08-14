// src/pages/GameAnalysisPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useAnalysisEngine } from '../hooks/useAnalysisEngine';
import PowerScoreCard from '../components/PowerScoreCard.jsx';
import FixtureErrorCard from '../components/FixtureErrorCard.jsx';
import SkeletonLoader from '../components/SkeletonLoader.jsx';
import PredictionSummaryCard from '../components/PredictionSummaryCard.jsx';
import GreenSuggestionsCard from '../components/GreenSuggestionsCard.jsx'; // NOVO

const CURRENT_SEASON = new Date().getFullYear();

export default function GameAnalysisPage({ onRegisterBet }) {
    const { loading, error: engineError, apiFetch, runFullAnalysis } = useAnalysisEngine();
    
    const [leagues, setLeagues] = useState([]);
    const [fixtures, setFixtures] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [selectedFixtureId, setSelectedFixtureId] = useState('');
    const [analysisResult, setAnalysisResult] = useState(null);

    const handleRegister = (bet) => {
        if (!bet) return;
        onRegisterBet(bet);
    };

    const fetchLeagues = useCallback(async () => {
        const data = await apiFetch(`v3/leagues?season=${CURRENT_SEASON}`);
        if (data) {
            const sortedLeagues = data.sort((a, b) => a.country.name.localeCompare(b.country.name) || a.league.name.localeCompare(b.name));
            setLeagues(sortedLeagues);
        }
    }, [apiFetch]);

    useEffect(() => { fetchLeagues(); }, [fetchLeagues]);

    useEffect(() => {
        const fetchFixtures = async () => {
            if (selectedLeague) {
                setFixtures([]);
                setSelectedFixtureId('');
                setAnalysisResult(null);
                const data = await apiFetch(`v3/fixtures?league=${selectedLeague}&season=${CURRENT_SEASON}&status=NS`);
                if (data) setFixtures(data);
            }
        };
        fetchFixtures();
    }, [selectedLeague, apiFetch]);

    const handleAnalyzeClick = async () => {
        if (selectedFixtureId) {
            setAnalysisResult(null);
            const fixture = fixtures.find(f => f.fixture.id.toString() === selectedFixtureId);
            if (fixture) {
                const result = await runFullAnalysis(fixture);
                setAnalysisResult(result);
            }
        }
    };
    
    return (
        <div className="max-w-7xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-emerald-400">🔍 Análise de Jogo</h1>
                <p className="text-gray-400 mt-2">Análise Preditiva com Foco em Green.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-2 bg-gray-800 p-6 rounded-lg shadow-lg self-start sticky top-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Selecionar Jogo</h2>
                    <div className="space-y-4">
                         <select value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3">
                            <option value="">Selecione uma Liga</option>
                            {leagues.map(l => <option key={l.league.id} value={l.league.id}>{l.country.name} - {l.league.name}</option>)}
                        </select>
                        <select value={selectedFixtureId} onChange={(e) => setSelectedFixtureId(e.target.value)} disabled={!selectedLeague || fixtures.length === 0} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 disabled:opacity-50">
                            <option value="">Selecione um Jogo</option>
                            {fixtures.map(f => <option key={f.fixture.id} value={f.fixture.id}>{f.teams.home.name} vs {f.teams.away.name}</option>)}
                        </select>
                         <button onClick={handleAnalyzeClick} disabled={!selectedFixtureId || loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg disabled:opacity-50">
                            {loading ? 'Analisando...' : 'Analisar Jogo'}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    {loading && <SkeletonLoader />}
                    {!loading && !analysisResult && (
                         <div className="text-center bg-gray-800 p-16 rounded-lg"><p className="text-gray-500">Selecione e analise um jogo para ver os resultados.</p></div>
                    )}

                    {analysisResult && (
                        <div className="space-y-6">
                            {analysisResult.error && <FixtureErrorCard fixtureName={analysisResult.fixtureName} error={analysisResult.error} />}
                            {!analysisResult.error && (
                                <>
                                    <PredictionSummaryCard 
                                        prediction={analysisResult.mainPrediction}
                                        narrative={analysisResult.narrative}
                                    />
                                    
                                    {/* COMPONENTE SUBSTITUÍDO */}
                                    <GreenSuggestionsCard 
                                        suggestions={analysisResult.greenSuggestions}
                                        fixtureName={analysisResult.fixtureName}
                                        fixtureId={analysisResult.fixtureId}
                                        onRegister={handleRegister}
                                    />

                                    <PowerScoreCard analysisResult={analysisResult} />
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}