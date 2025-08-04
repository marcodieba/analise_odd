import React, { useState, useEffect } from 'react';

// --- Constantes da API ---
const API_HOST = 'api-football-v1.p.rapidapi.com';
const CURRENT_SEASON = new Date().getFullYear();

// --- Componentes Internos do Dashboard ---

const Scoreboard = ({ game }) => (
    <div className="bg-gray-900/50 rounded-lg p-4 flex items-center justify-between">
        <div className="text-center w-2/5">
            <img src={game.teams.home.logo} alt={game.teams.home.name} className="w-12 h-12 mx-auto mb-2" />
            <p className="font-bold text-white">{game.teams.home.name}</p>
        </div>
        <div className="text-center w-1/5">
            <p className="text-5xl font-bold font-mono text-white">{game.goals.home} - {game.goals.away}</p>
            <p className="text-lg font-bold text-emerald-400">{game.fixture.status.elapsed}'</p>
        </div>
        <div className="text-center w-2/5">
            <img src={game.teams.away.logo} alt={game.teams.away.name} className="w-12 h-12 mx-auto mb-2" />
            <p className="font-bold text-white">{game.teams.away.name}</p>
        </div>
    </div>
);

const StatBar = ({ stat, homeValue, awayValue }) => {
    const total = homeValue + awayValue;
    const homePercent = total > 0 ? (homeValue / total) * 100 : 50;
    
    return (
        <div>
            <div className="flex justify-between text-sm font-bold mb-1">
                <span className="text-white">{homeValue}{stat.includes('%') ? '%' : ''}</span>
                <span className="text-gray-400">{stat.replace('%', '')}</span>
                <span className="text-white">{awayValue}{stat.includes('%') ? '%' : ''}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div 
                    className="bg-emerald-500 h-2.5 rounded-l-full transition-all duration-500" 
                    style={{ width: `${homePercent}%` }}
                ></div>
            </div>
        </div>
    );
};

// --- COMPONENTE DE ANÁLISE PREDITIVA (REFEITO) ---
const PredictiveAnalysis = ({ game, liveStats, historicalStats }) => {
    const elapsed = game.fixture.status.elapsed;
    const status = game.fixture.status.short;
    const totalGoals = game.goals.home + game.goals.away;
    const firstHalfGoals = game.score.halftime.home + game.score.halftime.away;

    // Calcula o Índice de Pressão ao vivo
    const getStat = (stats, type) => parseInt(stats.find(s => s.type === type)?.value ?? 0) || 0;
    const homePressure = (getStat(liveStats.home, "Shots on Goal") * 2) + getStat(liveStats.home, "Shots off Goal") + (getStat(liveStats.home, "Corner Kicks") * 0.5);
    const awayPressure = (getStat(liveStats.away, "Shots on Goal") * 2) + getStat(liveStats.away, "Shots off Goal") + (getStat(liveStats.away, "Corner Kicks") * 0.5);
    const totalPressure = homePressure + awayPressure;
    const homePressurePercent = totalPressure > 0 ? Math.round((homePressure / totalPressure) * 100) : 50;

    // Feedback dinâmico
    if (status === '1H' || (status === 'HT' && elapsed <= 45)) {
        if (totalGoals > 0) {
            return <div className="bg-green-900/50 p-3 rounded-lg text-center h-full flex flex-col justify-center"><p className="text-green-300 font-bold">Golo Marcado! ✅</p><p className="text-sm text-gray-300">A oportunidade de golo no 1ºT foi concretizada.</p></div>;
        }
        if (status === 'HT') {
            return <div className="bg-red-900/50 p-3 rounded-lg text-center h-full flex flex-col justify-center"><p className="text-red-400 font-bold">Intervalo 0-0 ❌</p><p className="text-sm text-gray-300">O primeiro tempo terminou sem golos.</p></div>;
        }
        // Análise ao vivo
        return (
            <div className="space-y-4">
                <div>
                    <label className="text-sm text-gray-400">Tendência Histórica (Golos no 1ºT)</label>
                    <p className="text-2xl font-bold text-white">{historicalStats.prob.toFixed(1)}%</p>
                </div>
                <div>
                    <label className="text-sm text-gray-400">Índice de Pressão (Ao Vivo)</label>
                    <div className="w-full bg-gray-700 rounded-full h-4 mt-1">
                         <div className="bg-cyan-500 h-4 rounded-l-full text-right text-xs text-white pr-2" style={{ width: `${homePressurePercent}%` }}>
                            {homePressurePercent}% Casa
                        </div>
                    </div>
                </div>
                <div className="bg-cyan-900/50 p-3 rounded-lg text-center">
                    <p className="text-cyan-300 font-bold">Conclusão</p>
                    <p className="text-sm text-gray-300">
                        {homePressurePercent > 65 ? "A pressão da equipa da casa confirma a tendência de golo." : "O jogo está equilibrado, aguardar por um pico de pressão."}
                    </p>
                </div>
            </div>
        );
    }

    // Pós-Primeiro Tempo
    if (status === '2H' || status === 'FT' || elapsed > 45) {
        const message = firstHalfGoals > 0 
            ? { text: 'Análise 1ºT: Golo Marcado', color: 'bg-green-900/50 text-green-300' }
            : { text: 'Análise 1ºT: Sem Golos', color: 'bg-red-900/50 text-red-400' };
        return <div className={`${message.color} p-3 rounded-lg text-center h-full flex flex-col justify-center`}><p className="font-bold">{message.text}</p><p className="text-sm text-gray-400">A análise para o primeiro tempo foi concluída.</p></div>;
    }

    return <div className="bg-gray-700/50 p-3 rounded-lg text-center h-full flex flex-col justify-center"><p className="text-gray-300 font-bold">A Aguardar Início</p></div>;
};


export default function LiveDashboard({ game, onBack, apiKey }) {
    const [liveStats, setLiveStats] = useState({ home: [], away: [] });
    const [historicalStats, setHistoricalStats] = useState({ prob: 0, loading: true });
    const [loadingStats, setLoadingStats] = useState(true);

    // Efeito para buscar as estatísticas históricas do 1º Tempo (uma vez)
    useEffect(() => {
        const fetchFirstHalfStats = async () => {
            try {
                const homePromise = fetch(`https://${API_HOST}/v3/teams/statistics?season=${CURRENT_SEASON}&team=${game.teams.home.id}&league=${game.league.id}`, { headers: { 'x-rapidapi-host': API_HOST, 'x-rapidapi-key': apiKey } });
                const awayPromise = fetch(`https://${API_HOST}/v3/teams/statistics?season=${CURRENT_SEASON}&team=${game.teams.away.id}&league=${game.league.id}`, { headers: { 'x-rapidapi-host': API_HOST, 'x-rapidapi-key': apiKey } });
                
                const [homeRes, awayRes] = await Promise.all([homePromise, awayPromise]);
                const homeData = await homeRes.json();
                const awayData = await awayRes.json();

                const homeGoalsFor = parseFloat(homeData.response?.goals?.for?.average?.first_half?.total ?? 0);
                const homeGoalsAgainst = parseFloat(homeData.response?.goals?.against?.average?.first_half?.total ?? 0);
                const awayGoalsFor = parseFloat(awayData.response?.goals?.for?.average?.first_half?.total ?? 0);
                const awayGoalsAgainst = parseFloat(awayData.response?.goals?.against?.average?.first_half?.total ?? 0);

                // Simples modelo de Poisson para a probabilidade de 0-0 no 1ºT
                const expectedGoalsHT = (homeGoalsFor + awayGoalsFor + homeGoalsAgainst + awayGoalsAgainst) / 2;
                const probZeroZeroHT = Math.exp(-expectedGoalsHT);
                const probOver05HT = (1 - probZeroZeroHT) * 100;

                setHistoricalStats({ prob: probOver05HT, loading: false });

            } catch (err) {
                console.error("Erro ao buscar estatísticas do 1º tempo:", err);
                setHistoricalStats({ prob: 0, loading: false });
            }
        };
        fetchFirstHalfStats();
    }, [game.fixture.id, apiKey]);

    // Efeito para buscar as estatísticas ao vivo (a cada minuto)
    useEffect(() => {
        const fetchLiveStats = async () => {
            setLoadingStats(true);
            const fixtureId = game.fixture.id;
            try {
                const response = await fetch(`https://${API_HOST}/v3/fixtures/statistics?fixture=${fixtureId}`, {
                    method: 'GET',
                    headers: { 'x-rapidapi-host': API_HOST, 'x-rapidapi-key': apiKey },
                });
                const data = await response.json();
                if (data.results > 0) {
                    setLiveStats({
                        home: data.response.find(s => s.team.id === game.teams.home.id)?.statistics || [],
                        away: data.response.find(s => s.team.id === game.teams.away.id)?.statistics || []
                    });
                } else {
                    setLiveStats({ home: [], away: [] });
                }
            } catch (err) {
                console.error("Erro ao buscar estatísticas ao vivo:", err);
                setLiveStats({ home: [], away: [] });
            } finally {
                setLoadingStats(false);
            }
        };

        fetchLiveStats();
        const interval = setInterval(fetchLiveStats, 60000);
        return () => clearInterval(interval);
    }, [game.fixture.id, apiKey]);

    const getStat = (stats, type) => parseInt(stats.find(s => s.type === type)?.value ?? 0) || 0;

    return (
        <div className="max-w-4xl mx-auto">
            <button onClick={onBack} className="mb-4 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg">
                &larr; Voltar à Lista de Jogos
            </button>

            <Scoreboard game={game} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div className="bg-gray-800 p-4 rounded-lg space-y-4">
                    <h3 className="font-bold text-lg text-white">Estatísticas Ao Vivo</h3>
                    {loadingStats ? (
                        <p className="text-center text-gray-400">A carregar estatísticas...</p>
                    ) : (
                        <>
                            <StatBar stat="Remates à Baliza" homeValue={getStat(liveStats.home, "Shots on Goal")} awayValue={getStat(liveStats.away, "Shots on Goal")} />
                            <StatBar stat="Remates para Fora" homeValue={getStat(liveStats.home, "Shots off Goal")} awayValue={getStat(liveStats.away, "Shots off Goal")} />
                            <StatBar stat="Cantos" homeValue={getStat(liveStats.home, "Corner Kicks")} awayValue={getStat(liveStats.away, "Corner Kicks")} />
                            <StatBar stat="Posse de Bola %" homeValue={getStat(liveStats.home, "Ball Possession")} awayValue={getStat(liveStats.away, "Ball Possession")} />
                        </>
                    )}
                </div>

                <div className="bg-gray-800 p-4 rounded-lg">
                    <h3 className="font-bold text-lg text-white mb-4">Análise Preditiva (1º Tempo)</h3>
                    {historicalStats.loading ? (
                         <p className="text-center text-gray-400">A carregar análise histórica...</p>
                    ) : (
                        <PredictiveAnalysis game={game} liveStats={liveStats} historicalStats={historicalStats} />
                    )}
                </div>
            </div>
        </div>
    );
};
