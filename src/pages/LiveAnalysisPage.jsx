import React, { useState, useEffect } from 'react';
import LiveDashboard from '../components/LiveDashboard.jsx';

// --- Constantes da API ---
const API_HOST = 'api-football-v1.p.rapidapi.com';

// --- Componente da Lista de Jogos ---
const LiveGamesList = ({ games, onGameSelect }) => (
    <div className="space-y-3">
        {games.map(game => (
            <div 
                key={game.fixture.id} 
                className="bg-gray-800 p-4 rounded-lg flex items-center justify-between hover:bg-gray-700/50 cursor-pointer transition"
                onClick={() => onGameSelect(game)}
            >
                <div className="flex items-center space-x-4">
                    <span className="font-bold text-emerald-400 text-lg">{game.fixture.status.elapsed}'</span>
                    <div>
                        <p className="font-bold text-white">{game.teams.home.name}</p>
                        <p className="font-bold text-white">{game.teams.away.name}</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-mono text-white">{game.goals.home}</p>
                    <p className="text-2xl font-mono text-white">{game.goals.away}</p>
                </div>
            </div>
        ))}
    </div>
);

export default function LiveAnalysisPage() {
    // A chave da API agora é lida do ficheiro .env.local
    const apiKey = import.meta.env.VITE_API_FOOTBALL_KEY; 

    const [allOpportunities, setAllOpportunities] = useState([]); // Guarda apenas os jogos que são oportunidades
    const [liveLeagues, setLiveLeagues] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [filteredGames, setFilteredGames] = useState([]);
    const [selectedGame, setSelectedGame] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchAllLiveOpportunities = async () => {
        if (!selectedGame) {
             setLoading(true);
        }
        setError('');
        try {
            const response = await fetch(`https://${API_HOST}/v3/fixtures?live=all`, {
                method: 'GET',
                headers: { 'x-rapidapi-host': API_HOST, 'x-rapidapi-key': apiKey },
            });
            const data = await response.json();
            if (data.errors && Object.keys(data.errors).length > 0) throw new Error(JSON.stringify(data.errors));
            
            const games = data.response || [];
            
            // FILTRO INTELIGENTE: A busca principal agora foca-se apenas nas oportunidades
            const opportunities = games.filter(game => {
                const isFirstHalf = game.fixture.status.short === '1H';
                const isZeroZero = game.goals.home === 0 && game.goals.away === 0;
                return isFirstHalf && isZeroZero;
            });

            setAllOpportunities(opportunities);

            // Cria a lista de ligas a partir das oportunidades encontradas
            const uniqueLeagues = opportunities.reduce((acc, game) => {
                if (!acc.some(league => league.id === game.league.id)) {
                    acc.push(game.league);
                }
                return acc;
            }, []);
            
            setLiveLeagues(uniqueLeagues.sort((a,b) => a.name.localeCompare(b.name)));

        } catch (err) {
            setError(`Erro ao buscar jogos ao vivo: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (apiKey) {
            fetchAllLiveOpportunities();
            const interval = setInterval(fetchAllLiveOpportunities, 60000);
            return () => clearInterval(interval);
        }
    }, [apiKey]);

    useEffect(() => {
        if (selectedLeague) {
            const gamesInLeague = allOpportunities.filter(game => game.league.id.toString() === selectedLeague);
            setFilteredGames(gamesInLeague);
        } else {
            // Se nenhuma liga estiver selecionada, mostra todas as oportunidades encontradas
            setFilteredGames(allOpportunities);
        }
    }, [selectedLeague, allOpportunities]);

    useEffect(() => {
        if (selectedGame) {
            const updatedGame = allOpportunities.find(g => g.fixture.id === selectedGame.fixture.id);
            if (!updatedGame) {
                setSelectedGame(null);
            }
        }
    }, [allOpportunities]);

    if (selectedGame) {
        return <LiveDashboard game={selectedGame} onBack={() => setSelectedGame(null)} apiKey={apiKey} />;
    }

    return (
        <div className="max-w-4xl mx-auto">
             <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-emerald-400">Análise Ao Vivo</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                    Encontre oportunidades para apostas de "Mais de 0.5 Golos no 1º Tempo". A lista mostra apenas jogos 0-0 no primeiro tempo e atualiza automaticamente.
                </p>
            </header>

            {!apiKey && (
                <div className="text-center bg-yellow-500/10 text-yellow-300 p-3 rounded-md">
                    Por favor, crie um ficheiro .env.local e adicione a sua chave da API-Football (VITE_API_FOOTBALL_KEY) para começar.
                </div>
            )}

            {apiKey && (
                 <div className="mb-8">
                    <label htmlFor="league-select" className="block mb-2 text-sm font-medium text-gray-300">Ligas com Oportunidades Ao Vivo</label>
                    <select 
                        id="league-select" 
                        value={selectedLeague}
                        onChange={(e) => setSelectedLeague(e.target.value)}
                        className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block w-full p-2.5"
                    >
                        <option value="">-- Todas as Ligas com Oportunidades --</option>
                        {liveLeagues.map(l => (
                            <option key={l.id} value={l.id}>{l.country} - {l.name}</option>
                        ))}
                    </select>
                </div>
            )}

            {loading && <p className="text-center text-lg text-emerald-400">A buscar oportunidades...</p>}
            {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md">{error}</div>}

            {!loading && !error && apiKey && (
                filteredGames.length > 0 ? (
                    <LiveGamesList games={filteredGames} onGameSelect={setSelectedGame} />
                ) : (
                    <p className="text-center text-gray-500 py-16">Nenhuma oportunidade (jogo 0-0 no 1ºT) encontrada no momento.</p>
                )
            )}
        </div>
    );
}
