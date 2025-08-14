import React, { createContext, useState, useEffect } from 'react';
// *** INÍCIO DAS NOVAS IMPORTAÇÕES ***
import { getFunctions, httpsCallable } from 'firebase/functions';
// *** FIM DAS NOVAS IMPORTAÇÕES ***
import { poisson, kellyCriterion } from '../utils/math.js';
import { getCache, setCache } from '../utils/cache.js';

export const AnalysisContext = createContext();

const API_HOST = 'api-football-v1.p.rapidapi.com';
const CURRENT_SEASON = new Date().getFullYear();
const PREVIOUS_SEASON = CURRENT_SEASON - 1;
const BOOKMAKER_ID = 8; // ID para Bet365

// *** INÍCIO DA NOVA CONFIGURAÇÃO ***
// Inicializa as Firebase Functions
const functions = getFunctions();
const analyzeSentimentFn = httpsCallable(functions, 'analyzeSentiment');
const analyzeH2HTacticsFn = httpsCallable(functions, 'analyzeH2HTactics');
// *** FIM DA NOVA CONFIGURAÇÃO ***

export const AnalysisProvider = ({ children }) => {
  const [analysisState, setAnalysisState] = useState({
    leagues: [],
    fixtures: [],
    selectedLeague: '',
    selectedFixtureId: '',
    loading: false,
    h2hData: null,
    h2hSignal: null,
    momentumData: null,
    contextData: null,
    styleClash: null,
    leagueContext: null,
    bttsAnalysis: null,
    sentimentAnalysis: null,
    sentimentStatus: 'idle',
    tacticalAnalysis: { loading: false, data: null, error: false },
    greenAnalysis: null,
    highProbAnalysis: null,
    stats: {
        homeAttack: 0, homeDefense: 0, awayAttack: 0, awayDefense: 0,
        leagueHomeAvg: 0, leagueAwayAvg: 0,
    },
    odds: { '1X2': null, 'DoubleChance': null, 'OverUnder': null, 'Safety': null, 'BTTS': null },
    results: null,
    error: '',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [bestBet, setBestBet] = useState(null);

  const apiKey = import.meta.env.VITE_API_FOOTBALL_KEY; 
  const gnewsApiKey = import.meta.env.VITE_GNEWS_KEY;

  const updateAnalysisState = (newState) => {
    setAnalysisState(prevState => ({ ...prevState, ...newState }));
  };

  // --- Lógica movida de DeepAnalysisPage ---

  const apiFetch = async (endpoint, isCritical = true) => {
    const cacheKey = endpoint;
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
        console.log(`Dados encontrados no cache para: ${cacheKey}`);
        return cachedData;
    }
    console.log(`Buscando dados da API para: ${cacheKey}`);
    updateAnalysisState({ loading: true });
    if(isCritical) updateAnalysisState({ error: '' });
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
        const responseData = data.response || [];
        await setCache(cacheKey, responseData);
        return responseData;
    } catch (err) {
        const errorMessage = `Erro na API: ${err.message}.`;
        console.error(errorMessage, `Endpoint: ${endpoint}`);
        if (isCritical) updateAnalysisState({ error: errorMessage });
        return null;
    } finally {
        updateAnalysisState({ loading: false });
    }
  };

  const fetchLeagues = async () => { 
    const data = await apiFetch(`v3/leagues?season=${CURRENT_SEASON}`);
    if (data) {
        const sortedLeagues = data.sort((a, b) => a.country.name.localeCompare(b.country.name) || a.league.name.localeCompare(b.league.name));
        updateAnalysisState({ leagues: sortedLeagues });
    }
  };

  const fetchFixtures = async (leagueId) => { 
    const data = await apiFetch(`v3/fixtures?league=${leagueId}&season=${CURRENT_SEASON}&status=NS`);
    if (data) updateAnalysisState({ fixtures: data });
  };
  
  // ... (todas as outras funções de análise: fetchStats, calculateValue, etc. devem ser coladas aqui)
    const {
        leagues, fixtures, selectedLeague, selectedFixtureId, loading,
        h2hData, h2hSignal, momentumData, contextData, styleClash,
        leagueContext, bttsAnalysis, sentimentAnalysis, sentimentStatus,
        tacticalAnalysis, greenAnalysis, highProbAnalysis, stats,
        odds, results, error
    } = analysisState;


    useEffect(() => { 
        if (apiKey && leagues.length === 0) fetchLeagues();
    }, [apiKey, leagues.length]);

    useEffect(() => {
        if (selectedFixtureId && !results) {
            const fixture = fixtures.find(f => f.fixture.id.toString() === selectedFixtureId);
            if (fixture) {
                fetchDataForFixture(fixture);
            }
        }
    }, [selectedFixtureId, results, fixtures]);


    useEffect(() => {
        if (results && h2hData) analyzeH2H(h2hData, results);
        else updateAnalysisState({ h2hSignal: null });
    }, [results, h2hData]);

    useEffect(() => {
        if (stats.homeAttack > 0 && odds['1X2'] && leagueContext && !loading) {
            calculateValue();
        }
    }, [stats, odds, leagueContext, loading]);

    const handleLeagueChange = (leagueId) => {
        updateAnalysisState({ selectedLeague: leagueId });
        if (leagueId) {
            const newState = {
                fixtures: [],
                selectedFixtureId: '',
                stats: { homeAttack: 0, homeDefense: 0, awayAttack: 0, awayDefense: 0, leagueHomeAvg: 0, leagueAwayAvg: 0 },
                results: null,
                odds: { '1X2': null, 'DoubleChance': null, 'OverUnder': null, 'Safety': null, 'BTTS': null },
                h2hData: null, h2hSignal: null, momentumData: null, contextData: null,
                styleClash: null, leagueContext: null, bttsAnalysis: null,
                sentimentAnalysis: null, sentimentStatus: 'idle',
                tacticalAnalysis: { loading: false, data: null, error: false },
                greenAnalysis: null, highProbAnalysis: null, error: ''
            };
            updateAnalysisState(newState);
            fetchFixtures(leagueId);
            fetchLeagueContext(leagueId);
        } else {
             updateAnalysisState({ fixtures: [], selectedFixtureId: '', results: null });
        }
    };
    
    const fetchDataForFixture = async (fixture) => {
        updateAnalysisState({
            results: null, h2hData: null, h2hSignal: null, momentumData: null,
            contextData: null, styleClash: null, bttsAnalysis: null,
            sentimentAnalysis: null, sentimentStatus: 'loading',
            tacticalAnalysis: { loading: true, data: null, error: false },
            error: ''
        });

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
            updateAnalysisState({ stats: statsData.strengths });
            analyzeStyleClash(statsData.style);
        }
        if (oddsData) updateAnalysisState({ odds: oddsData });
        updateAnalysisState({ h2hData: h2hResults || [] });
        if (homeMomentum && awayMomentum) {
            analyzeMomentum(homeMomentum, awayMomentum, homeId, awayId);
        }
        const currentContextData = {
            lineups: lineupData || [],
            injuries: injuryData || [],
            teamNames: { home: teams.home, away: teams.away }
        };
        updateAnalysisState({ contextData: currentContextData });
        
        if (statsData && homeMomentum && awayMomentum) {
            analyzeBTTS(statsData.strengths, { home: homeMomentum, away: awayMomentum }, currentContextData.injuries);
        }
        
        if (homeNews || awayNews) {
            analyzeSentimentWithAI({ home: homeNews, away: awayNews }, { home: teams.home, away: teams.away });
        } else {
            updateAnalysisState({ sentimentStatus: 'error' });
        }

        if (h2hResults && h2hResults.length > 0) {
            analyzeH2HWithAI(h2hResults, teams);
        } else {
            updateAnalysisState({ tacticalAnalysis: { loading: false, data: null, error: true } });
        }
    };

    const fetchOdds = async (fixtureId) => { 
        const data = await apiFetch(`v3/odds?fixture=${fixtureId}&bookmaker=${BOOKMAKER_ID}`);
        const newOdds = { '1X2': null, 'DoubleChance': null, 'OverUnder': null, 'Safety': {}, 'BTTS': null };

        if (data && data.length > 0 && data[0].bookmakers.length > 0) {
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
             updateAnalysisState({ error: "Não foram encontradas odds para o mercado 1X2." });
        }
        return newOdds;
    };

    const fetchStats = async (homeId, awayId, leagueId) => {
        const currentHomeStats = await apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${homeId}&league=${leagueId}`);
        const currentAwayStats = await apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${awayId}&league=${leagueId}`);

        if (!currentHomeStats || !currentAwayStats) {
            updateAnalysisState({ error: "Não foi possível obter os dados da época atual para uma das equipas." });
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
                updateAnalysisState({ error: "Aviso: Usando apenas dados da época atual devido à falta de histórico." });
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

                updateAnalysisState({
                    leagueContext: {
                        goal: Math.max(0.9, Math.min(1.1, goalCoefficient)),
                        home: Math.max(0.95, Math.min(1.05, homeAdvantageCoefficient)),
                    }
                });
                return;
            }
        }
        updateAnalysisState({ leagueContext: { goal: 1.0, home: 1.0 } });
    };

    const calculateValue = () => { 
        updateAnalysisState({ error: '' });
        if (stats.homeDefense <= 0 || stats.awayDefense <= 0 || stats.homeAttack <= 0 || !leagueContext) {
            updateAnalysisState({ error: "Dados estatísticos ou contexto da liga inválidos para o cálculo." });
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
        updateAnalysisState({ results: allResults });
        analyzeForGreen(allResults);
        analyzeForHighProbability(allResults, stats);
    };

    const analyzeH2H = (h2hFixtures, calculatedResults) => {
        if (!h2hFixtures || h2hFixtures.length === 0) {
            updateAnalysisState({ h2hSignal: { signal: 'neutral', message: 'Não existem confrontos diretos recentes para análise.' } });
            return;
        }
        const market1X2 = calculatedResults?.['1X2'];
        if (!market1X2) {
            updateAnalysisState({ h2hSignal: null });
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
            updateAnalysisState({ h2hSignal: null });
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
            updateAnalysisState({ h2hSignal: { signal: 'confirm', message: `O histórico recente favorece a aposta em ${betName}.` } });
        } else if (winRatio <= 0.2) {
            updateAnalysisState({ h2hSignal: { signal: 'alert', message: `O histórico recente é desfavorável à aposta em ${betName}.` } });
        } else {
            updateAnalysisState({ h2hSignal: { signal: 'neutral', message: 'O confronto direto não mostra um padrão claro.' } });
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
        updateAnalysisState({
            momentumData: {
                home: homeData,
                away: awayData,
                teamNames: { home: selectedFixture.teams.home.name, away: selectedFixture.teams.away.name }
            }
        });
    };

    const analyzeStyleClash = (styleData) => {
        const { home, away } = styleData;

        if (home.possession > 60 && away.possession < 40 && away.conversionRate > 0.15) {
            updateAnalysisState({ styleClash: {
                signal: 'alert',
                title: 'Alerta: Domínio vs. Contra-Ataque',
                message: 'A equipa da casa domina a posse, mas o visitante é muito eficiente. Risco tático elevado de golo em contra-ataque. Considere o mercado "Ambas Marcam".'
            }});
            return;
        }
        if (away.possession > 60 && home.possession < 40 && home.conversionRate > 0.15) {
            updateAnalysisState({ styleClash: {
                signal: 'alert',
                title: 'Alerta: Domínio vs. Contra-Ataque',
                message: 'A equipa visitante domina a posse, mas a equipa da casa é muito eficiente. Risco tático elevado de golo em contra-ataque.'
            }});
            return;
        }

        if (home.shotsPerGame < 10 && away.shotsPerGame < 10 && (home.possession > 45 && home.possession < 55)) {
            updateAnalysisState({ styleClash: {
                signal: 'confirm',
                title: 'Confirmação: Jogo de Desgaste',
                message: 'Ambas as equipas criam poucas oportunidades. O confronto sugere um jogo tático e com poucos golos, reforçando a confiança em apostas de "Menos de 2.5 Golos".'
            }});
            return;
        }
        
        updateAnalysisState({ styleClash: {
            signal: 'neutral',
            title: 'Confronto Chave: Ataque vs. Defesa',
            message: 'O jogo será decidido pela batalha entre o ataque de uma equipa e a defesa da outra. A análise de "Forma" é crucial.'
        }});
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

        const homeXG = (strengths.homeAttack / strengths.awayDefense) * stats.leagueHomeAvg;
        const awayXG = (strengths.awayAttack / strengths.homeDefense) * stats.leagueAwayAvg;
        const potentialFactor = (Math.min(homeXG, 2) / 2 + Math.min(awayXG, 2) / 2) / 2;

        let contextFactor = 0.5;
        const keyAttackers = injuries.filter(i => i.player.pos === 'F' || i.player.pos === 'M').length;
        const keyDefenders = injuries.filter(i => i.player.pos === 'D' || i.player.pos === 'G').length;
        if (keyAttackers > 1) contextFactor -= 0.15;
        if (keyDefenders > 1) contextFactor += 0.15;

        const finalProbability = (historicalFactor * 0.5) + (potentialFactor * 0.4) + (contextFactor * 0.1);

        updateAnalysisState({
            bttsAnalysis: {
                finalProbability: finalProbability * 100,
                factors: {
                    historical: historicalFactor,
                    potential: potentialFactor,
                    context: contextFactor,
                },
                conclusion: finalProbability > 0.65 ? "Alta probabilidade de ambas marcarem." : finalProbability < 0.45 ? "Baixa probabilidade de ambas marcarem." : "Probabilidade moderada de ambas marcarem."
            }
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
            
            // *** INÍCIO DA LÓGICA ALTERADA ***
            try {
                // Chama a Firebase Function em vez da API diretamente
                const result = await analyzeSentimentFn({ newsTitles: titles, teamName: name });
                return result.data; // A Firebase Function retorna um objeto com uma propriedade `data`
            } catch (err) {
                console.error("Erro na análise de sentimento com I.A.:", err);
                return { score: 0, summary: "Falha na análise de I.A.", error: "Erro na I.A." };
            }
            // *** FIM DA LÓGICA ALTERADA ***
        };
        
        const homeAnalysis = await analyzeTeam('home', teamNames.home.name);
        const awayAnalysis = await analyzeTeam('away', teamNames.away.name);

        updateAnalysisState({
            sentimentAnalysis: { home: homeAnalysis, away: awayAnalysis, teamNames },
            sentimentStatus: 'success'
        });
    };

    const analyzeH2HWithAI = async (h2hData, teams) => {
        const formattedHistory = h2hData.map(f => 
            `Jogo: ${f.teams.home.name} ${f.goals.home} - ${f.goals.away} ${f.teams.away.name}`
        ).join('; ');

        // *** INÍCIO DA LÓGICA ALTERADA ***
        try {
            const result = await analyzeH2HTacticsFn({
                formattedHistory,
                homeTeam: teams.home.name,
                awayTeam: teams.away.name,
            });
            updateAnalysisState({ tacticalAnalysis: { loading: false, data: result.data, error: false } });
        } catch (err) {
            console.error("Erro na análise tática com I.A.:", err);
            updateAnalysisState({ tacticalAnalysis: { loading: false, data: null, error: true } });
        }
        // *** FIM DA LÓGICA ALTERADA ***
    };

    const runAutoAnalysis = () => {
        if (!results) return;

        let bestBet = null;
        let highestProb = 0;

        const allBets = Object.entries(results)
            .filter(([market]) => market !== 'expectedGoals')
            .flatMap(([market, outcomes]) => 
                Object.entries(outcomes).map(([outcome, data]) => ({ market, outcome, ...data }))
            );

        const valueBets = allBets.filter(bet => bet.value > 0.01 && bet.prob);

        if (valueBets.length === 0) {
            updateAnalysisState({ error: "Nenhuma aposta com valor foi encontrada para a Auto-Análise." });
            return;
        }

        valueBets.sort((a, b) => b.prob - a.prob);
        bestBet = valueBets[0];

        if (bestBet) {
            setBestBet(bestBet);
            setIsModalOpen(true);
        }
    };

    const analyzeForGreen = (allResults) => {
        let bestGreenBet = null;
        
        const allBets = Object.entries(allResults)
            .filter(([market]) => market !== 'expectedGoals')
            .flatMap(([market, outcomes]) => 
                Object.entries(outcomes).map(([outcome, data]) => ({ market, outcome, ...data }))
            );

        const valueBets = allBets.filter(bet => bet.value > 0.01 && bet.prob);

        if (valueBets.length === 0) {
            updateAnalysisState({ greenAnalysis: null });
            return;
        }

        valueBets.sort((a, b) => b.prob - a.prob);

        updateAnalysisState({
            greenAnalysis: {
                bestBet: valueBets[0],
                secondBestBet: valueBets.length > 1 ? valueBets[1] : null,
            }
        });
    };
    
    const analyzeForHighProbability = (allResults, currentStats) => {
        let bestBet = null;
        let highestProb = 0;

        const allBets = Object.entries(allResults)
            .filter(([market]) => market !== 'expectedGoals')
            .flatMap(([market, outcomes]) => 
                Object.entries(outcomes).map(([outcome, data]) => ({ market, outcome, ...data }))
            );

        allBets.forEach(bet => {
            if (bet.prob > highestProb) {
                highestProb = bet.prob;
                bestBet = bet;
            }
        });

        let justification = "Este resultado é estatisticamente o mais provável de acontecer.";
        if (bestBet) {
            if (bestBet.outcome.includes('Casa')) {
                justification = "Justificado pelo forte ataque da casa contra a defesa vulnerável do visitante.";
            } else if (bestBet.outcome.includes('Visitante')) {
                justification = "Justificado pelo forte ataque do visitante contra a defesa vulnerável da casa.";
            }
        }

        updateAnalysisState({ highProbAnalysis: { bestBet, justification } });
    };

  return (
    <AnalysisContext.Provider value={{ 
        analysisState, 
        updateAnalysisState,
        handleLeagueChange,
        runAutoAnalysis,
        isModalOpen,
        setIsModalOpen,
        bestBet
    }}>
      {children}
    </AnalysisContext.Provider>
  );
};