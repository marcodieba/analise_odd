import React, { useState, useEffect } from 'react';
import InputField from '../components/InputField.jsx';
import ResultMetric from '../components/ResultMetric.jsx';
import ValueAnalysisCard from '../components/ValueAnalysisCard.jsx';
import H2HAnalysisCard from '../components/H2HAnalysisCard.jsx';
import MomentumAnalysisCard from '../components/MomentumAnalysisCard.jsx';
import AutoAnalysisModal from '../components/AutoAnalysisModal.jsx';
import LineupAnalysisCard from '../components/LineupAnalysisCard.jsx';
import StyleClashCard from '../components/StyleClashCard.jsx';
import BTTSAnalysisCard from '../components/BTTSAnalysisCard.jsx';
import SentimentAnalysisCard from '../components/SentimentAnalysisCard.jsx';
import TacticalAIAnalysisCard from '../components/TacticalAIAnalysisCard.jsx';
import { poisson, kellyCriterion } from '../utils/math.js';

// --- Constantes da API ---
const API_HOST = 'api-football-v1.p.rapidapi.com';
const CURRENT_SEASON = new Date().getFullYear();
const PREVIOUS_SEASON = CURRENT_SEASON - 1;
const BOOKMAKER_ID = 8; // ID para Bet365

// --- Componente Interno para a Tabela de Segurança ---
const SafetyMarketsTable = ({ markets, onRegister, fixtureName }) => (
    <div className="overflow-x-auto bg-gray-700/30 rounded-lg">
        <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
                <tr>
                    <th scope="col" className="px-4 py-3">Mercado</th>
                    <th scope="col" className="px-4 py-3 text-center">Prob. (%)</th>
                    <th scope="col" className="px-4 py-3 text-center">Odd Mercado</th>
                    <th scope="col" className="px-4 py-3 text-center">Valor (EV)</th>
                    <th scope="col" className="px-4 py-3 text-center">Ação</th>
                </tr>
            </thead>
            <tbody>
                {markets.map(([outcome, data]) => (
                    <tr key={outcome} className="border-b border-gray-700">
                        <th scope="row" className="px-4 py-3 font-medium text-white whitespace-nowrap">{outcome}</th>
                        <td className="px-4 py-3 text-center font-mono">{(data.prob * 100).toFixed(1)}%</td>
                        <td className="px-4 py-3 text-center font-mono text-white">{data.odd.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center font-mono text-green-400">+{data.value.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-center">
                            <button 
                                onClick={() => onRegister({
                                    market: outcome,
                                    odd: data.odd,
                                    stake: data.kellyStake * 100,
                                })}
                                className="bg-gray-600 hover:bg-gray-500 text-white text-xs font-bold py-1 px-2 rounded-md transition"
                            >
                                Registar
                            </button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// --- Componente Principal ---
export default function CalculatorPage({ onRegisterBet }) {
    const apiKey = import.meta.env.VITE_API_FOOTBALL_KEY; 
    const gnewsApiKey = import.meta.env.VITE_GNEWS_KEY;
    
    const [leagues, setLeagues] = useState([]);
    const [fixtures, setFixtures] = useState([]);
    const [selectedLeague, setSelectedLeague] = useState('');
    const [selectedFixtureId, setSelectedFixtureId] = useState('');
    const [loading, setLoading] = useState(false);
    const [h2hData, setH2hData] = useState(null);
    const [h2hSignal, setH2hSignal] = useState(null);
    const [momentumData, setMomentumData] = useState(null);
    const [contextData, setContextData] = useState(null);
    const [styleClash, setStyleClash] = useState(null);
    const [leagueContext, setLeagueContext] = useState(null);
    const [bttsAnalysis, setBttsAnalysis] = useState(null);
    const [sentimentAnalysis, setSentimentAnalysis] = useState(null);
    const [sentimentStatus, setSentimentStatus] = useState('idle');
    const [tacticalAnalysis, setTacticalAnalysis] = useState({ loading: false, data: null, error: false });
    const [activeMarketTab, setActiveMarketTab] = useState('1X2');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [bestBet, setBestBet] = useState(null);

    const [stats, setStats] = useState({
        homeAttack: 0, homeDefense: 0, awayAttack: 0, awayDefense: 0,
        leagueHomeAvg: 0, leagueAwayAvg: 0,
    });
    const [odds, setOdds] = useState({ '1X2': null, 'DoubleChance': null, 'OverUnder': null, 'Safety': null, 'BTTS': null });
    const [results, setResults] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => { 
        if (apiKey) fetchLeagues();
    }, [apiKey]);

    useEffect(() => {
        if (selectedLeague) {
            setFixtures([]);
            setSelectedFixtureId('');
            setStats({ homeAttack: 0, homeDefense: 0, awayAttack: 0, awayDefense: 0, leagueHomeAvg: 0, leagueAwayAvg: 0 });
            setResults(null);
            setOdds({ '1X2': null, 'DoubleChance': null, 'OverUnder': null, 'Safety': null, 'BTTS': null });
            setH2hSignal(null);
            setMomentumData(null);
            setContextData(null);
            setStyleClash(null);
            setLeagueContext(null);
            setBttsAnalysis(null);
            setSentimentAnalysis(null);
            setSentimentStatus('idle');
            setTacticalAnalysis({ loading: false, data: null, error: false });
            setActiveMarketTab('1X2');
            fetchFixtures(selectedLeague);
            fetchLeagueContext(selectedLeague);
        }
    }, [selectedLeague]);

    useEffect(() => {
        if (selectedFixtureId) {
            const fixture = fixtures.find(f => f.fixture.id.toString() === selectedFixtureId);
            if (fixture) fetchDataForFixture(fixture);
        }
    }, [selectedFixtureId]);

    useEffect(() => {
        if (results && h2hData) analyzeH2H(h2hData, results);
        else setH2hSignal(null);
    }, [results, h2hData]);

    const apiFetch = async (endpoint, isCritical = true) => {
        setLoading(true);
        if(isCritical) setError('');
        try {
            const response = await fetch(`https://${API_HOST}/${endpoint}`, {
                method: 'GET',
                headers: { 'x-rapidapi-host': API_HOST, 'x-rapidapi-key': apiKey },
            });
            const data = await response.json();
            if (data.errors && Object.keys(data.errors).length > 0) {
                if (typeof data.errors === 'string') throw new Error(data.errors);
                throw new Error(JSON.stringify(data.errors));
            }
            if (data.results === 0) return []; 
            return data.response;
        } catch (err) {
            const errorMessage = `Erro na API: ${err.message}.`;
            console.error(errorMessage, `Endpoint: ${endpoint}`);
            if (isCritical) {
                setError(errorMessage);
            }
            return null;
        } finally {
            setLoading(false);
        }
    };
    
    const fetchLeagues = async () => { 
        const data = await apiFetch(`v3/leagues?season=${CURRENT_SEASON}&type=league`);
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
    const fetchFixtures = async (leagueId) => { 
        const data = await apiFetch(`v3/fixtures?league=${leagueId}&season=${CURRENT_SEASON}&status=NS`);
        if (data) {
            setFixtures(data);
        }
    };

    const fetchDataForFixture = async (fixture) => {
        setResults(null);
        setH2hData(null);
        setH2hSignal(null);
        setMomentumData(null);
        setContextData(null);
        setStyleClash(null);
        setBttsAnalysis(null);
        setSentimentAnalysis(null);
        setSentimentStatus('loading');
        setTacticalAnalysis({ loading: true, data: null, error: false });
        setError('');
        const { teams, league, fixture: { id: fixtureId } } = fixture;
        const homeId = teams.home.id;
        const awayId = teams.away.id;

        const [statsData, oddsData, h2hResults, homeMomentum, awayMomentum, lineupData, injuryData, homeNews, awayNews] = await Promise.all([
            fetchStats(homeId, awayId, league.id),
            fetchOdds(fixtureId),
            apiFetch(`v3/fixtures/headtohead?h2h=${homeId}-${awayId}&last=5`, false),
            apiFetch(`v3/fixtures?team=${homeId}&last=10&league=${league.id}`, false),
            apiFetch(`v3/fixtures?team=${awayId}&last=10&league=${league.id}`, false),
            apiFetch(`v3/fixtures/lineups?fixture=${fixtureId}`, false),
            apiFetch(`v3/injuries?fixture=${fixtureId}`, false),
            fetchNews(teams.home.name),
            fetchNews(teams.away.name)
        ]);

        if (statsData) {
            setStats(statsData.strengths);
            analyzeStyleClash(statsData.style);
        }
        if (oddsData) setOdds(oddsData);
        setH2hData(h2hResults || []);
        if (homeMomentum && awayMomentum) {
            analyzeMomentum(homeMomentum, awayMomentum, homeId, awayId);
        }
        const currentContextData = {
            lineups: lineupData || [],
            injuries: injuryData || [],
            teamNames: { home: teams.home, away: teams.away }
        };
        setContextData(currentContextData);
        
        if (statsData && homeMomentum && awayMomentum) {
            analyzeBTTS(statsData.strengths, { home: homeMomentum, away: awayMomentum }, currentContextData.injuries);
        }
        
        if (homeNews || awayNews) {
            analyzeSentimentWithAI({ home: homeNews, away: awayNews }, { home: teams.home, away: teams.away });
        } else {
            setSentimentStatus('error');
        }

        if (h2hResults && h2hResults.length > 0) {
            analyzeH2HWithAI(h2hResults, teams);
        } else {
            setTacticalAnalysis({ loading: false, data: null, error: true });
        }
    };

    const fetchOdds = async (fixtureId) => { 
        const data = await apiFetch(`v3/odds?fixture=${fixtureId}&bookmaker=${BOOKMAKER_ID}`);
        const newOdds = { '1X2': null, 'DoubleChance': null, 'OverUnder': null, 'Safety': {}, 'BTTS': null };

        if (data && data.length > 0) {
            const bookmaker = data[0].bookmakers[0];
            
            const matchWinner = bookmaker.bets.find(b => b.id === 1);
            if (matchWinner) {
                newOdds['1X2'] = {
                    'Casa (1)': parseFloat(matchWinner.values.find(v => v.value === 'Home')?.odd),
                    'Empate (X)': parseFloat(matchWinner.values.find(v => v.value === 'Draw')?.odd),
                    'Visitante (2)': parseFloat(matchWinner.values.find(v => v.value === 'Away')?.odd)
                };
            }

            const doubleChance = bookmaker.bets.find(b => b.id === 12);
            if (doubleChance) {
                newOdds['DoubleChance'] = {
                    'Casa ou Empate (1X)': parseFloat(doubleChance.values.find(v => v.value === 'Home/Draw')?.odd),
                    'Empate ou Visitante (X2)': parseFloat(doubleChance.values.find(v => v.value === 'Draw/Away')?.odd),
                    'Casa ou Visitante (12)': parseFloat(doubleChance.values.find(v => v.value === 'Home/Away')?.odd)
                };
            }

            const overUnder = bookmaker.bets.find(b => b.id === 5);
            if (overUnder) {
                const over25 = overUnder.values.find(v => v.value === 'Over 2.5')?.odd;
                const under25 = overUnder.values.find(v => v.value === 'Under 2.5')?.odd;
                const over05 = overUnder.values.find(v => v.value === 'Over 0.5')?.odd;
                if(over25 && under25) {
                    newOdds['OverUnder'] = {
                        'Mais de 2.5': parseFloat(over25),
                        'Menos de 2.5': parseFloat(under25)
                    };
                }
                if(over05) newOdds['Safety']['Total Golos: Mais de 0.5'] = parseFloat(over05);
            }
            
            const asianHandicap = bookmaker.bets.find(b => b.id === 4);
            if (asianHandicap) {
                const home15 = asianHandicap.values.find(v => v.value === 'Home' && v.handicap === '+1.5')?.odd;
                const away15 = asianHandicap.values.find(v => v.value === 'Away' && v.handicap === '+1.5')?.odd;
                if(home15) newOdds['Safety']['Handicap Asiático: Casa +1.5'] = parseFloat(home15);
                if(away15) newOdds['Safety']['Handicap Asiático: Visitante +1.5'] = parseFloat(away15);
            }
            
            const bttsMarket = bookmaker.bets.find(b => b.id === 8);
            if (bttsMarket) {
                newOdds['BTTS'] = {
                    'Sim': parseFloat(bttsMarket.values.find(v => v.value === 'Yes')?.odd),
                    'Não': parseFloat(bttsMarket.values.find(v => v.value === 'No')?.odd)
                };
            }

            const cleanSheetHome = bookmaker.bets.find(b => b.id === 21);
            if (cleanSheetHome) {
                const homeScores = cleanSheetHome.values.find(v => v.value === 'No')?.odd;
                if(homeScores) newOdds['Safety']['Equipa a Marcar: Casa'] = parseFloat(homeScores);
            }
            const cleanSheetAway = bookmaker.bets.find(b => b.id === 22);
            if (cleanSheetAway) {
                const awayScores = cleanSheetAway.values.find(v => v.value === 'No')?.odd;
                if(awayScores) newOdds['Safety']['Equipa a Marcar: Visitante'] = parseFloat(awayScores);
            }
        }
        
        if (!newOdds['1X2']) {
             setError("Não foram encontradas odds para o mercado 1X2.");
        }
        return newOdds;
    };

    const fetchStats = async (homeId, awayId, leagueId) => {
        const currentHomeStats = await apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${homeId}&league=${leagueId}`);
        const currentAwayStats = await apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${awayId}&league=${leagueId}`);

        if (!currentHomeStats || !currentAwayStats) {
            setError("Não foi possível obter os dados da época atual para uma das equipas.");
            return null;
        }

        const gamesPlayed = currentHomeStats.fixtures.played.total;
        
        const processTeamStyle = (teamData) => {
            if (!teamData) return { possession: 50, shotsPerGame: 0, conversionRate: 0 };
            const totalShots = (teamData.shots?.on || 0) + (teamData.shots?.off || 0);
            const conversionRate = totalShots > 0 ? ((teamData.goals?.for?.total?.total || 0) / totalShots) : 0;
            return {
                possession: parseFloat(teamData.ball_possession?.replace('%', '')) || 50,
                shotsPerGame: teamData.fixtures.played.total > 0 ? (totalShots / teamData.fixtures.played.total) : 0,
                conversionRate: conversionRate,
            };
        };

        const calculateStrengths = (teamData, leagueAvgs, location) => {
            const goalsFor = teamData?.goals?.for?.average?.[location];
            const goalsAgainst = teamData?.goals?.against?.average?.[location];
            const leagueAvgFor = location === 'home' ? leagueAvgs.home : leagueAvgs.away;
            const leagueAvgAgainst = location === 'home' ? leagueAvgs.away : leagueAvgs.home;
            if (!goalsFor || !goalsAgainst || !leagueAvgFor || !leagueAvgAgainst) return { attack: 1, defenseRaw: 1 };
            const attack = parseFloat(goalsFor) / leagueAvgFor;
            const defenseRaw = parseFloat(goalsAgainst) / leagueAvgAgainst;
            return { attack, defenseRaw };
        };

        let finalStrengths;
        let relevantHomeStats, relevantAwayStats;

        if (gamesPlayed >= 10) {
            const leagueData = await apiFetch(`v3/leagues?id=${leagueId}&season=${CURRENT_SEASON}`);
            const leagueAvgs = {
                home: parseFloat(leagueData?.[0]?.seasons?.[0]?.goals?.for?.average?.home ?? 1.4),
                away: parseFloat(leagueData?.[0]?.seasons?.[0]?.goals?.for?.average?.away ?? 1.1)
            };
            const homeS = calculateStrengths(currentHomeStats, leagueAvgs, 'home');
            const awayS = calculateStrengths(currentAwayStats, leagueAvgs, 'away');
            finalStrengths = {
                homeAttack: parseFloat(homeS.attack.toFixed(2)),
                homeDefense: parseFloat((1 / homeS.defenseRaw).toFixed(2)),
                awayAttack: parseFloat(awayS.attack.toFixed(2)),
                awayDefense: parseFloat((1 / awayS.defenseRaw).toFixed(2)),
                leagueHomeAvg: leagueAvgs.home,
                leagueAwayAvg: leagueAvgs.away,
            };
            relevantHomeStats = currentHomeStats;
            relevantAwayStats = currentAwayStats;
        } else {
            const previousHomeStats = await apiFetch(`v3/teams/statistics?season=${PREVIOUS_SEASON}&team=${homeId}&league=${leagueId}`);
            const previousAwayStats = await apiFetch(`v3/teams/statistics?season=${PREVIOUS_SEASON}&team=${awayId}&league=${leagueId}`);

            if (!previousHomeStats || !previousAwayStats) {
                const leagueData = await apiFetch(`v3/leagues?id=${leagueId}&season=${CURRENT_SEASON}`);
                const leagueAvgs = {
                    home: parseFloat(leagueData?.[0]?.seasons?.[0]?.goals?.for?.average?.home ?? 1.4),
                    away: parseFloat(leagueData?.[0]?.seasons?.[0]?.goals?.for?.average?.away ?? 1.1)
                };
                const homeS = calculateStrengths(currentHomeStats, leagueAvgs, 'home');
                const awayS = calculateStrengths(currentAwayStats, leagueAvgs, 'away');
                setError("Aviso: Usando apenas dados da época atual devido à falta de histórico.");
                finalStrengths = {
                    homeAttack: parseFloat(homeS.attack.toFixed(2)),
                    homeDefense: parseFloat((1 / homeS.defenseRaw).toFixed(2)),
                    awayAttack: parseFloat(awayS.attack.toFixed(2)),
                    awayDefense: parseFloat((1 / awayS.defenseRaw).toFixed(2)),
                    leagueHomeAvg: leagueAvgs.home,
                    leagueAwayAvg: leagueAvgs.away,
                };
                relevantHomeStats = currentHomeStats;
                relevantAwayStats = currentAwayStats;
            } else {
                const prevLeagueData = await apiFetch(`v3/leagues?id=${leagueId}&season=${PREVIOUS_SEASON}`);
                const prevLeagueAvgs = {
                    home: parseFloat(prevLeagueData?.[0]?.seasons?.[0]?.goals?.for?.average?.home ?? 1.4),
                    away: parseFloat(prevLeagueData?.[0]?.seasons?.[0]?.goals?.for?.average?.away ?? 1.1)
                };
                
                const prevHomeS = calculateStrengths(previousHomeStats, prevLeagueAvgs, 'home');
                const prevAwayS = calculateStrengths(previousAwayStats, prevLeagueAvgs, 'away');
                const currentHomeS = calculateStrengths(currentHomeStats, prevLeagueAvgs, 'home');
                const currentAwayS = calculateStrengths(currentAwayStats, prevLeagueAvgs, 'away');

                const homeWeight = gamesPlayed > 0 ? 0.3 : 0;
                const prevWeight = 1 - homeWeight;

                const finalHomeAttack = (prevHomeS.attack * prevWeight) + (currentHomeS.attack * homeWeight);
                const finalHomeDefenseRaw = (prevHomeS.defenseRaw * prevWeight) + (currentHomeS.defenseRaw * homeWeight);
                const finalAwayAttack = (prevAwayS.attack * prevWeight) + (currentAwayS.attack * homeWeight);
                const finalAwayDefenseRaw = (prevAwayS.defenseRaw * prevWeight) + (currentAwayS.defenseRaw * homeWeight);
                
                finalStrengths = {
                    homeAttack: parseFloat(finalHomeAttack.toFixed(2)) || 1,
                    homeDefense: parseFloat((1 / finalHomeDefenseRaw).toFixed(2)) || 1,
                    awayAttack: parseFloat(finalAwayAttack.toFixed(2)) || 1,
                    awayDefense: parseFloat((1 / finalAwayDefenseRaw).toFixed(2)) || 1,
                    leagueHomeAvg: prevLeagueAvgs.home,
                    leagueAwayAvg: prevLeagueAvgs.away,
                };
                relevantHomeStats = previousHomeStats;
                relevantAwayStats = previousAwayStats;
            }
        }
        return {
            strengths: finalStrengths,
            style: {
                home: processTeamStyle(relevantHomeStats),
                away: processTeamStyle(relevantAwayStats)
            }
        };
    };

    const fetchLeagueContext = async (leagueId) => {
        const leagueData = await apiFetch(`v3/leagues?id=${leagueId}&season=${PREVIOUS_SEASON}`);
        if (leagueData && leagueData.length > 0) {
            const seasonData = leagueData[0].seasons.find(s => s.year === PREVIOUS_SEASON);
            if (seasonData?.goals?.for?.average?.total && seasonData?.fixtures?.wins?.home) {
                const leagueAvgGoals = parseFloat(seasonData.goals.for.average.total);
                const homeWinPercentage = parseFloat(seasonData.fixtures.wins.home);

                const goalCoefficient = 1 + ((leagueAvgGoals - 2.7) * 0.1);
                const homeAdvantageCoefficient = 1 + ((homeWinPercentage - 45) * 0.005);

                setLeagueContext({
                    goal: Math.max(0.9, Math.min(1.1, goalCoefficient)),
                    home: Math.max(0.95, Math.min(1.05, homeAdvantageCoefficient)),
                });
                return;
            }
        }
        setLeagueContext({ goal: 1.0, home: 1.0 });
    };

    const calculateValue = () => { 
        setError('');
        setResults(null);
        if (stats.homeDefense <= 0 || stats.awayDefense <= 0 || stats.homeAttack <= 0 || !leagueContext) {
            setError("Dados estatísticos ou contexto da liga inválidos para o cálculo.");
            return;
        }
        
        let homeExpectedGoals = (stats.homeAttack / stats.awayDefense) * stats.leagueHomeAvg;
        let awayExpectedGoals = (stats.awayAttack / stats.homeDefense) * stats.leagueAwayAvg;

        const coeffs = leagueContext;
        homeExpectedGoals *= coeffs.goal;
        awayExpectedGoals *= coeffs.goal;
        if (coeffs.home > 1.0) {
            homeExpectedGoals *= coeffs.home;
            awayExpectedGoals /= coeffs.home;
        }

        const maxGoals = 6;
        const homeGoalProbs = Array.from({ length: maxGoals + 1 }, (_, i) => poisson(homeExpectedGoals, i));
        const awayGoalProbs = Array.from({ length: maxGoals + 1 }, (_, i) => poisson(awayExpectedGoals, i));
        
        let scoreProbs = Array(maxGoals + 1).fill(0).map(() => Array(maxGoals + 1).fill(0));
        for (let i = 0; i <= maxGoals; i++) {
            for (let j = 0; j <= maxGoals; j++) {
                scoreProbs[i][j] = homeGoalProbs[i] * awayGoalProbs[j];
            }
        }

        let homeWinProb = 0, drawProb = 0, awayWinProb = 0;
        let awayWinByOne = 0, homeWinByOne = 0;
        for (let i = 0; i <= maxGoals; i++) {
            for (let j = 0; j <= maxGoals; j++) {
                if (i > j) homeWinProb += scoreProbs[i][j];
                else if (i === j) drawProb += scoreProbs[i][j];
                else awayWinProb += scoreProbs[i][j];
                if (j - i === 1) awayWinByOne += scoreProbs[i][j];
                if (i - j === 1) homeWinByOne += scoreProbs[i][j];
            }
        }
        const totalProb = homeWinProb + drawProb + awayWinProb;
        const finalHomeProb = homeWinProb / totalProb;
        const finalDrawProb = drawProb / totalProb;
        const finalAwayProb = awayWinProb / totalProb;

        const prob1X = finalHomeProb + finalDrawProb;
        const probX2 = finalAwayProb + finalDrawProb;
        const prob12 = finalHomeProb + finalAwayProb;

        let under25Prob = 0;
        for (let i = 0; i <= maxGoals; i++) {
            for (let j = 0; j <= maxGoals; j++) {
                if (i + j < 2.5) under25Prob += scoreProbs[i][j];
            }
        }
        const over25Prob = 1 - under25Prob;

        const over05Prob = 1 - scoreProbs[0][0];
        const homePlus15Prob = finalHomeProb + finalDrawProb + awayWinByOne;
        const awayPlus15Prob = finalAwayProb + finalDrawProb + homeWinByOne;
        const homeScoresProb = 1 - homeGoalProbs[0];
        const awayScoresProb = 1 - awayGoalProbs[0];
        
        const bttsProb = 1 - (homeGoalProbs[0] + awayGoalProbs[0] - (homeGoalProbs[0] * awayGoalProbs[0]));

        const allResults = {
            '1X2': {
                'Casa (1)': { prob: finalHomeProb, odd: odds['1X2']?.['Casa (1)'] },
                'Empate (X)': { prob: finalDrawProb, odd: odds['1X2']?.['Empate (X)'] },
                'Visitante (2)': { prob: finalAwayProb, odd: odds['1X2']?.['Visitante (2)'] }
            },
            'DoubleChance': {
                'Casa ou Empate (1X)': { prob: prob1X, odd: odds['DoubleChance']?.['Casa ou Empate (1X)'] },
                'Empate ou Visitante (X2)': { prob: probX2, odd: odds['DoubleChance']?.['Empate ou Visitante (X2)'] },
                'Casa ou Visitante (12)': { prob: prob12, odd: odds['DoubleChance']?.['Casa ou Visitante (12)'] }
            },
            'OverUnder': {
                'Mais de 2.5': { prob: over25Prob, odd: odds['OverUnder']?.['Mais de 2.5'] },
                'Menos de 2.5': { prob: under25Prob, odd: odds['OverUnder']?.['Menos de 2.5'] }
            },
            'BTTS': {
                'Sim': { prob: bttsProb, odd: odds['BTTS']?.['Sim'] },
                'Não': { prob: 1 - bttsProb, odd: odds['BTTS']?.['Não'] }
            },
            'Safety': {
                'Total Golos: Mais de 0.5': { prob: over05Prob, odd: odds['Safety']?.['Total Golos: Mais de 0.5'] },
                'Handicap Asiático: Casa +1.5': { prob: homePlus15Prob, odd: odds['Safety']?.['Handicap Asiático: Casa +1.5'] },
                'Handicap Asiático: Visitante +1.5': { prob: awayPlus15Prob, odd: odds['Safety']?.['Handicap Asiático: Visitante +1.5'] },
                'Equipa a Marcar: Casa': { prob: homeScoresProb, odd: odds['Safety']?.['Equipa a Marcar: Casa'] },
                'Equipa a Marcar: Visitante': { prob: awayScoresProb, odd: odds['Safety']?.['Equipa a Marcar: Visitante'] }
            },
            expectedGoals: { home: homeExpectedGoals, away: awayExpectedGoals }
        };

        for (const market in allResults) {
            if (market === 'expectedGoals') continue;
            for (const outcome in allResults[market]) {
                const { prob, odd } = allResults[market][outcome];
                if (prob && odd) {
                    allResults[market][outcome].fairOdd = 1 / prob;
                    allResults[market][outcome].value = (odd / (1 / prob)) - 1;
                    allResults[market][outcome].kellyStake = kellyCriterion(odd, prob);
                }
            }
        }
        setResults(allResults);
    };

    const analyzeH2H = (h2hFixtures, calculatedResults) => {
        if (!h2hFixtures || h2hFixtures.length === 0) {
            setH2hSignal({ signal: 'neutral', message: 'Não existem confrontos diretos recentes para análise.' });
            return;
        }
        const market1X2 = calculatedResults?.['1X2'];
        if (!market1X2) {
            setH2hSignal(null);
            return;
        }
        let bestBet = null;
        let maxEv = 0.01;
        const valueHome = market1X2['Casa (1)']?.value;
        const valueDraw = market1X2['Empate (X)']?.value;
        const valueAway = market1X2['Visitante (2)']?.value;
        if (valueHome > maxEv) { maxEv = valueHome; bestBet = 'Home'; }
        if (valueDraw > maxEv) { maxEv = valueDraw; bestBet = 'Draw'; }
        if (valueAway > maxEv) { maxEv = valueAway; bestBet = 'Away'; }
        if (!bestBet) {
            setH2hSignal(null);
            return;
        }
        const selectedFixture = fixtures.find(f => f.fixture.id.toString() === selectedFixtureId);
        const originalHomeId = selectedFixture.teams.home.id;
        let winsForBet = 0;
        const totalGames = h2hFixtures.length;
        h2hFixtures.forEach(fixture => {
            const isDraw = fixture.teams.home.winner === null && fixture.teams.away.winner === null;
            if (bestBet === 'Home' && fixture.teams.home.winner) winsForBet++;
            if (bestBet === 'Away' && fixture.teams.away.winner) winsForBet++;
            if (bestBet === 'Draw' && isDraw) winsForBet++;
        });
        const winRatio = winsForBet / totalGames;
        const betName = bestBet === 'Home' ? 'Casa' : (bestBet === 'Away' ? 'Visitante' : 'Empate');
        if (winRatio >= 0.6) {
            setH2hSignal({ signal: 'confirm', message: `O histórico recente favorece a aposta em ${betName}.` });
        } else if (winRatio <= 0.2) {
            setH2hSignal({ signal: 'alert', message: `O histórico recente é desfavorável à aposta em ${betName}.` });
        } else {
            setH2hSignal({ signal: 'neutral', message: 'O confronto direto não mostra um padrão claro.' });
        }
    };
    
    const analyzeMomentum = (homeFixtures, awayFixtures, homeId, awayId) => {
        const processFixtures = (fixtures, teamId) => {
            let points = 0;
            let goalsFor = 0;
            let goalsAgainst = 0;
            let formString = '';
            const sortedFixtures = fixtures.sort((a, b) => new Date(b.fixture.date) - new Date(a.fixture.date));
            sortedFixtures.forEach(f => {
                const isHome = f.teams.home.id === teamId;
                const isWinner = isHome ? f.teams.home.winner : f.teams.away.winner;
                const isDraw = f.teams.home.winner === null && f.teams.away.winner === null;
                if (isDraw) {
                    points += 1;
                    formString += 'E';
                } else if (isWinner) {
                    points += 3;
                    formString += 'V';
                } else {
                    points += 0;
                    formString += 'D';
                }
                goalsFor += isHome ? f.goals.home : f.goals.away;
                goalsAgainst += isHome ? f.goals.away : f.goals.home;
            });
            const goalDiff = goalsFor - goalsAgainst;
            let signal = 'stable';
            if (points >= 10) signal = 'high';
            if (points <= 5) signal = 'low';
            return { form: formString.split('').reverse().join(''), points, goalsFor, goalsAgainst, goalDiff, signal };
        };
        const homeData = processFixtures(homeFixtures, homeId);
        const awayData = processFixtures(awayFixtures, awayId);
        const selectedFixture = fixtures.find(f => f.fixture.id.toString() === selectedFixtureId);
        setMomentumData({
            home: homeData,
            away: awayData,
            teamNames: { home: selectedFixture.teams.home.name, away: selectedFixture.teams.away.name }
        });
    };

    const analyzeStyleClash = (styleData) => {
        const { home, away } = styleData;

        if (home.possession > 60 && away.possession < 40 && away.conversionRate > 0.15) {
            setStyleClash({
                signal: 'alert',
                title: 'Alerta: Domínio vs. Contra-Ataque',
                message: 'A equipa da casa domina a posse, mas o visitante é muito eficiente. Risco tático elevado de golo em contra-ataque. Considere o mercado "Ambas Marcam".'
            });
            return;
        }
        if (away.possession > 60 && home.possession < 40 && home.conversionRate > 0.15) {
            setStyleClash({
                signal: 'alert',
                title: 'Alerta: Domínio vs. Contra-Ataque',
                message: 'A equipa visitante domina a posse, mas a equipa da casa é muito eficiente. Risco tático elevado de golo em contra-ataque.'
            });
            return;
        }

        if (home.shotsPerGame < 10 && away.shotsPerGame < 10 && (home.possession > 45 && home.possession < 55)) {
            setStyleClash({
                signal: 'confirm',
                title: 'Confirmação: Jogo de Desgaste',
                message: 'Ambas as equipas criam poucas oportunidades. O confronto sugere um jogo tático e com poucos golos, reforçando a confiança em apostas de "Menos de 2.5 Golos".'
            });
            return;
        }
        
        setStyleClash({
            signal: 'neutral',
            title: 'Confronto Chave: Ataque vs. Defesa',
            message: 'O jogo será decidido pela batalha entre o ataque de uma equipa e a defesa da outra. A análise de "Forma" é crucial.'
        });
    };

    const analyzeBTTS = (strengths, bttsFixtures, injuries) => {
        const calculateBTTSFreq = (fixtures) => {
            if (!fixtures || fixtures.length === 0) return 0.5;
            const bttsCount = fixtures.filter(f => f.goals.home > 0 && f.goals.away > 0).length;
            return bttsCount / fixtures.length;
        };
        const homeBTTSFreq = calculateBTTSFreq(bttsFixtures.home);
        const awayBTTSFreq = calculateBTTSFreq(bttsFixtures.away);
        const historicalFactor = (homeBTTSFreq + awayBTTSFreq) / 2;

        const homeXG = (strengths.homeAttack / strengths.awayDefense) * strengths.leagueHomeAvg;
        const awayXG = (strengths.awayAttack / strengths.homeDefense) * strengths.leagueAwayAvg;
        const potentialFactor = (Math.min(homeXG, 2) / 2 + Math.min(awayXG, 2) / 2) / 2;

        let contextFactor = 0.5;
        const keyAttackers = injuries.filter(i => i.player.pos === 'F' || i.player.pos === 'M').length;
        const keyDefenders = injuries.filter(i => i.player.pos === 'D' || i.player.pos === 'G').length;
        if (keyAttackers > 1) contextFactor -= 0.15;
        if (keyDefenders > 1) contextFactor += 0.15;

        const finalProbability = (historicalFactor * 0.5) + (potentialFactor * 0.4) + (contextFactor * 0.1);

        setBttsAnalysis({
            finalProbability: finalProbability * 100,
            factors: {
                historical: historicalFactor,
                potential: potentialFactor,
                context: contextFactor,
            },
            conclusion: finalProbability > 0.65 ? "Alta probabilidade de ambas marcarem." : finalProbability < 0.45 ? "Baixa probabilidade de ambas marcarem." : "Probabilidade moderada de ambas marcarem."
        });
    };
    
    const fetchNews = async (teamName) => {
        if (!gnewsApiKey || gnewsApiKey === 'SUA_CHAVE_GNEWS_AQUI') return null;
        try {
            const response = await fetch(`https://gnews.io/api/v4/search?q="${teamName}"&lang=pt&max=5&token=${gnewsApiKey}`);
            const data = await response.json();
            return data.articles;
        } catch (err) {
            console.error("Erro ao buscar notícias:", err);
            return null;
        }
    };

    const analyzeSentimentWithAI = async (newsData, teamNames) => {
        const analyzeTeam = async (team, name) => {
            if (!newsData[team] || newsData[team].length === 0) {
                return { score: 0, summary: "Sem notícias recentes para análise.", error: "Sem notícias." };
            }

            const titles = newsData[team].map(article => article.title).join('\n');
            const prompt = `Você é um analista desportivo. Com base nestes títulos de notícias sobre a equipa "${name}", analise o sentimento geral. Considere pressão, harmonia, lesões e confiança. Devolva um JSON com uma pontuação de "moral" de -5 (muito negativo) a +5 (muito positivo) e um "resumo" de uma frase. O JSON deve ter o formato: {"score": <numero>, "summary": "<resumo>"}`;
            
            try {
                const payload = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { responseMimeType: "application/json" }
                };
                const geminiApiKey = "";
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) throw new Error(`Erro na API Gemini: ${response.statusText}`);
                
                const result = await response.json();
                const text = result.candidates[0].content.parts[0].text;
                return JSON.parse(text);

            } catch (err) {
                console.error("Erro na análise de sentimento com I.A.:", err);
                return { score: 0, summary: "Falha na análise de I.A.", error: "Erro na I.A." };
            }
        };
        
        const homeAnalysis = await analyzeTeam('home', teamNames.home.name);
        const awayAnalysis = await analyzeTeam('away', teamNames.away.name);

        setSentimentAnalysis({ home: homeAnalysis, away: awayAnalysis, teamNames });
        setSentimentStatus('success');
    };

    const runAutoAnalysis = () => {
        if (!results) return;

        let bestBet = null;
        let maxScore = -Infinity;

        const allBets = Object.entries(results)
            .filter(([market]) => market !== 'expectedGoals')
            .flatMap(([market, outcomes]) => 
                Object.entries(outcomes).map(([outcome, data]) => ({ market, outcome, ...data }))
            );

        allBets.forEach(bet => {
            if (!bet.value || bet.value <= 0.01 || !bet.kellyStake) return;

            let score = bet.kellyStake;
            let confidence = 'medium';

            if (bet.market === '1X2') {
                let confidenceScore = 0;
                if (h2hSignal?.signal === 'confirm') confidenceScore++;
                if (h2hSignal?.signal === 'alert') confidenceScore--;

                const team = bet.outcome.includes('Casa') ? 'home' : (bet.outcome.includes('Visitante') ? 'away' : null);
                if (team) {
                    if (momentumData?.[team]?.signal === 'high') confidenceScore++;
                    if (momentumData?.[team]?.signal === 'low') confidenceScore--;
                }

                if (confidenceScore > 0) {
                    score *= 1.2;
                    confidence = 'high';
                }
                if (confidenceScore < 0) {
                    score *= 0.8;
                    confidence = 'low';
                }
            }
            
            if (score > maxScore) {
                maxScore = score;
                bestBet = { ...bet, confidence };
            }
        });

        if (bestBet) {
            setBestBet(bestBet);
            setIsModalOpen(true);
        } else {
            setError("Nenhuma aposta com valor claro foi encontrada após a auto-análise.");
        }
    };

    const TabButton = ({ market, children }) => (
        <button
            onClick={() => setActiveMarketTab(market)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition ${
                activeMarketTab === market 
                ? 'bg-emerald-600 text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
        >
            {children}
        </button>
    );

    const valuableSafetyMarkets = results?.['Safety'] 
        ? Object.entries(results['Safety']).filter(([_, data]) => data.value > 0.01 && data.prob > 0.80) 
        : [];

    const fixtureName = selectedFixtureId ? fixtures.find(f => f.fixture.id.toString() === selectedFixtureId)?.teams.home.name + ' vs ' + fixtures.find(f => f.fixture.id.toString() === selectedFixtureId)?.teams.away.name : '';

    return (
        <>
            {isModalOpen && <AutoAnalysisModal bestBet={bestBet} onClose={() => setIsModalOpen(false)} onRegister={() => {
                onRegisterBet({
                    fixtureId: parseInt(selectedFixtureId),
                    fixture: fixtureName,
                    market: bestBet.outcome,
                    odd: bestBet.odd,
                    stake: bestBet.kellyStake * 100,
                });
                setIsModalOpen(false);
            }} />}
            <div className="bg-gray-900 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <header className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-emerald-400">Calculadora de Valor em Odds</h1>
                        <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                            Selecione um jogo para buscar estatísticas e odds automaticamente.
                        </p>
                    </header>
                    <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                            <div className="bg-gray-700/50 p-4 rounded-lg mb-6">
                                <h3 className="text-lg font-semibold text-emerald-400 mb-4">Busca Automática (API)</h3>
                                {!apiKey ? (
                                    <div className="text-center bg-yellow-500/10 text-yellow-300 p-3 rounded-md">
                                        Por favor, crie um ficheiro .env.local e adicione a sua chave da API-Football para começar.
                                    </div>
                                ) : (
                                    <div className="flex flex-col space-y-4">
                                        <select value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white">
                                            <option value="">Selecione uma Liga</option>
                                            {leagues.map(l => (
                                                <option key={l.league.id} value={l.league.id}>{l.country.name} - {l.league.name}</option>
                                            ))}
                                        </select>
                                        <select value={selectedFixtureId} onChange={(e) => setSelectedFixtureId(e.target.value)} disabled={!selectedLeague || fixtures.length === 0} className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white disabled:opacity-50">
                                            <option value="">Selecione um Jogo</option>
                                            {fixtures.map(f => (
                                                <option key={f.fixture.id} value={f.fixture.id}>{f.teams.home.name} vs {f.teams.away.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            {loading && <p className="text-center text-emerald-400">A carregar dados da API...</p>}
                            <div className="flex space-x-4 mt-8">
                                <button onClick={calculateValue} disabled={loading || !selectedFixtureId || !odds['1X2'] || !leagueContext} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                    Analisar Jogo
                                </button>
                                <button onClick={runAutoAnalysis} disabled={!results} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 px-4 rounded-lg text-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                    Auto-Análise ⚡
                                </button>
                            </div>
                            <div className="space-y-6 mt-8">
                                {contextData && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">Contexto do Jogo</h3>
                                        <LineupAnalysisCard lineups={contextData.lineups} injuries={contextData.injuries} teamNames={contextData.teamNames} />
                                    </div>
                                )}
                                {styleClash && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">Confronto de Estilos</h3>
                                        <StyleClashCard analysis={styleClash} />
                                    </div>
                                )}
                                {h2hSignal && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">Confronto Direto (H2H)</h3>
                                        <H2HAnalysisCard signal={h2hSignal.signal} message={h2hSignal.message} />
                                    </div>
                                )}
                                {momentumData && (
                                    <div>
                                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">Análise de Forma</h3>
                                        <MomentumAnalysisCard data={momentumData} teamNames={momentumData.teamNames} />
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                            <h2 className="text-2xl font-bold mb-6 text-white border-b border-gray-700 pb-2">Análise de Valor</h2>
                            {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-md">{error}</div>}
                            {results && (
                                <div className="space-y-6">
                                     <div>
                                        <h3 className="text-lg font-semibold text-emerald-400 mb-2">Golos Esperados (xG)</h3>
                                        <div className="grid grid-cols-2 gap-4">
                                            <ResultMetric label="xG Time da Casa" value={results.expectedGoals.home.toFixed(2)} />
                                            <ResultMetric label="xG Time Visitante" value={results.expectedGoals.away.toFixed(2)} />
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 border-b border-gray-700 pb-4">
                                        <TabButton market="1X2">1X2</TabButton>
                                        <TabButton market="DoubleChance">Dupla Chance</TabButton>
                                        <TabButton market="OverUnder">Golos +/- 2.5</TabButton>
                                        <TabButton market="BTTS">Ambas Marcam</TabButton>
                                        <TabButton market="Safety">Segurança</TabButton>
                                    </div>
                                    
                                    {activeMarketTab !== 'Safety' && activeMarketTab !== 'BTTS' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {results[activeMarketTab] && Object.entries(results[activeMarketTab]).map(([outcome, data]) => (
                                                <ValueAnalysisCard 
                                                    key={outcome}
                                                    market={outcome}
                                                    bookieOdd={data.odd || 0}
                                                    fairOdd={data.fairOdd || 0}
                                                    value={data.value || 0}
                                                    kellyStake={data.kellyStake || 0}
                                                    onRegister={() => onRegisterBet({
                                                        fixtureId: parseInt(selectedFixtureId),
                                                        fixture: fixtureName,
                                                        market: outcome,
                                                        odd: data.odd,
                                                        stake: data.kellyStake * 100,
                                                    })}
                                                />
                                            ))}
                                        </div>
                                    ) : activeMarketTab === 'Safety' ? (
                                        <div>
                                            {valuableSafetyMarkets.length > 0 ? (
                                                <SafetyMarketsTable 
                                                    markets={valuableSafetyMarkets} 
                                                    fixtureName={fixtureName}
                                                    onRegister={(betData) => onRegisterBet({
                                                        ...betData,
                                                        fixtureId: parseInt(selectedFixtureId),
                                                        fixture: fixtureName,
                                                    })}
                                                />
                                            ) : (
                                                <p className="text-gray-400 col-span-2">Nenhuma aposta de segurança com valor (&gt;1% EV e &gt;80% Prob.) encontrada.</p>
                                            )}
                                        </div>
                                    ) : ( // BTTS Tab
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {results[activeMarketTab] && Object.entries(results[activeMarketTab]).map(([outcome, data]) => (
                                                 <ValueAnalysisCard 
                                                    key={outcome}
                                                    market={`Ambas Marcam: ${outcome}`}
                                                    bookieOdd={data.odd || 0}
                                                    fairOdd={data.fairOdd || 0}
                                                    value={data.value || 0}
                                                    kellyStake={data.kellyStake || 0}
                                                    onRegister={() => onRegisterBet({
                                                        fixtureId: parseInt(selectedFixtureId),
                                                        fixture: fixtureName,
                                                        market: `Ambas Marcam: ${outcome}`,
                                                        odd: data.odd,
                                                        stake: data.kellyStake * 100,
                                                    })}
                                                />
                                            ))}
                                        </div>
                                    )}
                                    
                                    <div className="space-y-6">
                                        {sentimentStatus === 'loading' && <div><h3 className="text-lg font-semibold text-emerald-400 mb-2 mt-6">Moral da Equipa (Análise I.A.)</h3><p className="text-gray-400 text-sm">A analisar sentimento...</p></div>}
                                        {sentimentStatus === 'error' && <div><h3 className="text-lg font-semibold text-emerald-400 mb-2 mt-6">Moral da Equipa (Análise I.A.)</h3><p className="text-yellow-400 text-sm">Não foi possível realizar a análise de sentimento. Verifique a sua chave GNews.</p></div>}
                                        {sentimentStatus === 'success' && sentimentAnalysis && (
                                            <div>
                                                <h3 className="text-lg font-semibold text-emerald-400 mb-2 mt-6">Moral da Equipa (Análise I.A.)</h3>
                                                <SentimentAnalysisCard analysis={sentimentAnalysis} />
                                            </div>
                                        )}
                                        {bttsAnalysis && activeMarketTab === 'BTTS' && (
                                            <div>
                                                <h3 className="text-lg font-semibold text-emerald-400 mb-2 mt-6">Análise Detalhada "Ambas Marcam"</h3>
                                                <BTTSAnalysisCard analysis={bttsAnalysis} />
                                            </div>
                                        )}
                                        {tacticalAnalysis.loading && <div><h3 className="text-lg font-semibold text-emerald-400 mb-2 mt-6">Análise Tática (I.A.)</h3><p className="text-gray-400 text-sm">A I.A. está a analisar os confrontos diretos...</p></div>}
                                        {tacticalAnalysis.error && <div><h3 className="text-lg font-semibold text-emerald-400 mb-2 mt-6">Análise Tática (I.A.)</h3><p className="text-yellow-400 text-sm">Não foi possível realizar a análise tática.</p></div>}
                                        {tacticalAnalysis.data && (
                                            <div>
                                                <h3 className="text-lg font-semibold text-emerald-400 mb-2 mt-6">Análise Tática (I.A.)</h3>
                                                <TacticalAIAnalysisCard analysis={tacticalAnalysis} />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            {!results && !error && (
                                 <div className="text-center text-gray-400 py-16">
                                    <p>Selecione uma liga e um jogo para começar.</p>
                                </div>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </>
    );
}
