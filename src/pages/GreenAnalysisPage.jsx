// src/pages/GreenAnalysisPage.jsx

import React, { useState, useEffect } from 'react';
import { useAnalysisEngine } from '../hooks/useAnalysisEngine';
// NOVO: Importa o overlay de carregamento
import LoadingOverlay from '../components/LoadingOverlay.jsx';

// --- Componente da Tabela de Resultados (sem alterações) ---
const GreenResultsTable = ({ results }) => (
    <div className="bg-gray-800 rounded-lg overflow-x-auto">
        <h2 className="text-2xl font-bold text-white p-6">Oportunidades "Green" Encontradas</h2>
        <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                <tr>
                    <th scope="col" className="px-6 py-3">Jogo</th>
                    <th scope="col" className="px-6 py-3">Aposta Mais Segura com Valor</th>
                    <th scope="col" className="px-6 py-3 text-center">Prob.</th>
                    <th scope="col" className="px-6 py-3 text-center">Odd</th>
                    <th scope="col" className="px-6 py-3 text-center">Valor (EV)</th>
                </tr>
            </thead>
            <tbody>
                {results.map((res, index) => (
                    <tr key={index} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                        <th scope="row" className="px-6 py-4 font-medium text-white whitespace-nowrap">
                            {res.fixtureName}
                        </th>
                        <td className="px-6 py-4 font-bold text-white">{res.bestBet.outcome}</td>
                        <td className="px-6 py-4 text-center font-mono text-emerald-300">{(res.bestBet.prob * 100).toFixed(1)}%</td>
                        <td className="px-6 py-4 text-center font-mono text-white">{res.bestBet.odd.toFixed(2)}</td>
                        <td className="px-6 py-4 text-center font-mono text-green-400">+{res.bestBet.value.toFixed(2)}%</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// --- Componente Principal da Página ---
export default function GreenAnalysisPage() {
    const { loading: engineLoading, error: engineError, apiFetch, runFullAnalysis, fetchLeagueContext } = useAnalysisEngine();
    
    const [leagues, setLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [loadingPage, setLoadingPage] = useState(false);
    const [results, setResults] = useState([]);
    const [pageError, setPageError] = useState('');
    const [progressMessage, setProgressMessage] = useState('');

    const apiKey = import.meta.env.VITE_API_FOOTBALL_KEY;

    useEffect(() => {
        const fetchLeagues = async () => {
            const data = await apiFetch('v3/leagues?season=' + new Date().getFullYear());
            if (data) {
                const sortedLeagues = data.sort((a, b) => {
                    if (a.country.name < b.country.name) return -1;
                    if (a.country.name > b.country.name) return 1;
                    if (a.league.name < b.league.name) return -1;
                    if (a.league.name > b.league.name) return 1;
                    return 0;
                });
                setLeagues(sortedLeagues);
            }
        };
        if (apiKey) fetchLeagues();
    }, [apiFetch, apiKey]);

    const handleAnalyzeLeague = async () => {
        if (!selectedLeague) return;
        setLoadingPage(true);
        setResults([]);
        setPageError('');
        setProgressMessage('A buscar jogos futuros...');

        const fixtures = await apiFetch(`v3/fixtures?league=${selectedLeague}&season=${new Date().getFullYear()}&status=NS`);
        if (!fixtures || fixtures.length === 0) {
            setPageError("Não foram encontrados jogos futuros para esta liga.");
            setLoadingPage(false);
            setProgressMessage('');
            return;
        }

        setProgressMessage('A obter contexto da liga...');
        const leagueContext = await fetchLeagueContext(selectedLeague);
        if (!leagueContext) {
            setPageError("Não foi possível obter o contexto da liga para análise.");
            setLoadingPage(false);
            setProgressMessage('');
            return;
        }

        const greenBets = [];
        for (let i = 0; i < fixtures.length; i++) {
            const fixture = fixtures[i];
            setProgressMessage(`Analisando jogo ${i + 1} de ${fixtures.length}: ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);
            
            const analysisResult = await runFullAnalysis(fixture, leagueContext);
            if (analysisResult && analysisResult.bestGreenBet) {
                greenBets.push({
                    fixtureName: analysisResult.fixtureName,
                    bestBet: analysisResult.bestGreenBet
                });
            }
        }
        
        greenBets.sort((a, b) => b.bestBet.prob - a.bestBet.prob);
        setResults(greenBets);
        setLoadingPage(false);
        setProgressMessage('');
    };

    return (
        <div className="max-w-7xl mx-auto">
             {/* NOVO: Componente de overlay em ação */}
             <LoadingOverlay isLoading={loadingPage} message={progressMessage} />

             <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-emerald-400">Análise Green</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                    Selecione uma liga para encontrar a aposta com a maior probabilidade de acerto (e com valor positivo) para cada jogo.
                </p>
            </header>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div className="md:col-span-2">
                        <label htmlFor="league-select" className="block mb-2 text-sm font-medium text-gray-300">Selecione a Competição</label>
                        <select 
                            id="league-select" 
                            value={selectedLeague}
                            onChange={(e) => setSelectedLeague(e.target.value)}
                            disabled={!apiKey || leagues.length === 0 || loadingPage}
                            className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg block w-full p-2.5 disabled:opacity-50"
                        >
                            <option value="">-- Escolha uma competição --</option>
                            {leagues.map(l => (
                                <option key={l.league.id} value={l.league.id}>{l.country.name} - {l.league.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="md:col-span-1">
                        <button 
                            onClick={handleAnalyzeLeague}
                            disabled={!selectedLeague || loadingPage || engineLoading}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loadingPage ? 'A Analisar...' : 'Analisar Competição'}
                        </button>
                    </div>
                </div>
            </div>

            {(pageError || engineError) && <div className="bg-red-500/20 text-red-300 p-3 rounded-md mb-8">{pageError || engineError}</div>}
            
            {/* REMOVIDO: a mensagem de progresso agora está no overlay
            {loadingPage && <p className="text-center text-lg text-emerald-400">{progressMessage}</p>} 
            */}

            {!loadingPage && results.length > 0 && <GreenResultsTable results={results} />}
            
            {!loadingPage && results.length === 0 && !pageError && !engineError && (
                <div className="text-center text-gray-500 py-16">
                    <p>Os resultados da sua análise aparecerão aqui.</p>
                </div>
            )}
        </div>
    );
}