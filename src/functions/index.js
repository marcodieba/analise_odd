const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");

// A sua lógica de matemática deve estar em um arquivo `math.js` na mesma pasta
// const { poisson, kellyCriterion } = require("./math.js");
// Simulação das funções para o exemplo funcionar de forma autônoma:
const factorial = (n) => {
    if (n < 0) return -1;
    if (n === 0) return 1;
    let res = 1;
    for (let i = 2; i <= n; i++) res *= i;
    return res;
};
const poisson = (lambda, k) => (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
const kellyCriterion = (odd, probability, fraction = 0.25) => {
    if (odd <= 1 || probability <= 0) return 0;
    const value = (odd * probability) - 1;
    if (value <= 0) return 0;
    const kellyFraction = ((odd - 1) * probability - (1 - probability)) / (odd - 1);
    return kellyFraction > 0 ? kellyFraction * fraction : 0;
};


admin.initializeApp();
const db = admin.firestore();

// --- CONSTANTES E CONFIGURAÇÃO DA API ---
const API_HOST = "api-football-v1.p.rapidapi.com";
// A chave é lida de forma segura a partir da configuração das Funções
const API_KEY = functions.config().apifootball.key;
const CURRENT_SEASON = new Date().getFullYear();
const BOOKMAKER_ID = 8; // Bet365

/**
 * Função central para fazer chamadas à API-Football no ambiente Node.js
 */
const apiFetch = async (endpoint) => {
    try {
        const response = await fetch(`https://${API_HOST}/${endpoint}`, {
            method: "GET",
            headers: { "x-rapidapi-host": API_HOST, "x-rapidapi-key": API_KEY },
        });
        const data = await response.json();
        if (data.errors && Object.keys(data.errors).length > 0) {
            throw new Error(JSON.stringify(data.errors));
        }
        return data.response || [];
    } catch (err) {
        functions.logger.error(`Erro na API para ${endpoint}:`, err);
        return null;
    }
};

/**
 * Lógica de análise completa para um único jogo.
 * Retorna um objeto com todos os mercados e oportunidades de valor.
 */
const runAnalysisForFixture = async (fixture) => {
    const { teams, league, fixture: { id: fixtureId } } = fixture;

    const [homeStatsData, awayStatsData, oddsData] = await Promise.all([
        apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${teams.home.id}&league=${league.id}`),
        apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${teams.away.id}&league=${league.id}`),
        apiFetch(`v3/odds?fixture=${fixtureId}&bookmaker=${BOOKMAKER_ID}`),
    ]);

    if (!homeStatsData?.[0] || !awayStatsData?.[0] || !oddsData?.[0]) {
        return null; // Retorna nulo se faltarem dados essenciais
    }

    const homeStats = homeStatsData[0];
    const awayStats = awayStatsData[0];

    // Lógica simplificada para obter médias da liga (idealmente seria cacheado)
    const leagueAvgs = {
        home: parseFloat(homeStats.goals.for.average.home) || 1.4,
        away: parseFloat(homeStats.goals.for.average.away) || 1.1
    };

    const homeAttack = parseFloat(homeStats.goals.for.average.home) / parseFloat(leagueAvgs.home);
    const homeDefense = parseFloat(homeStats.goals.against.average.home) / parseFloat(leagueAvgs.away);
    const awayAttack = parseFloat(awayStats.goals.for.average.away) / parseFloat(leagueAvgs.away);
    const awayDefense = parseFloat(awayStats.goals.against.average.away) / parseFloat(leagueAvgs.home);

    const homeExpectedGoals = homeAttack * awayDefense * parseFloat(leagueAvgs.home);
    const awayExpectedGoals = awayAttack * homeDefense * parseFloat(leagueAvgs.away);

    // Cálculos de Poisson e Probabilidades
    const maxGoals = 6;
    let homeWinProb = 0, drawProb = 0, awayWinProb = 0;
    for (let i = 0; i <= maxGoals; i++) {
        for (let j = 0; j <= maxGoals; j++) {
            const scoreProb = poisson(homeExpectedGoals, i) * poisson(awayExpectedGoals, j);
            if (i > j) homeWinProb += scoreProb;
            else if (i === j) drawProb += scoreProb;
            else awayWinProb += scoreProb;
        }
    }
    const totalProb = homeWinProb + drawProb + awayWinProb;

    // Extrair Odds
    const bookmaker = oddsData[0].bookmakers[0];
    const matchWinnerBet = bookmaker.bets.find(b => b.id === 1);
    const odds = {
        '1X2': {
            'Casa (1)': parseFloat(matchWinnerBet.values.find(v => v.value === 'Home')?.odd),
            'Empate (X)': parseFloat(matchWinnerBet.values.find(v => v.value === 'Draw')?.odd),
            'Visitante (2)': parseFloat(matchWinnerBet.values.find(v => v.value === 'Away')?.odd),
        }
    };

    // Construir o objeto de resultados
    const allResults = {
        'Resultado Final': {
            'Casa': { prob: homeWinProb / totalProb, odd: odds['1X2']?.['Casa (1)'], market: 'Resultado Final', outcome: 'Casa' },
            'Empate': { prob: drawProb / totalProb, odd: odds['1X2']?.['Empate (X)'], market: 'Resultado Final', outcome: 'Empate' },
            'Visitante': { prob: awayWinProb / totalProb, odd: odds['1X2']?.['Visitante (2)'], market: 'Resultado Final', outcome: 'Visitante' }
        }
    };

    // Calcular valor e Kelly
    for (const market in allResults) {
        for (const outcome in allResults[market]) {
            const bet = allResults[market][outcome];
            if (bet.prob && bet.odd) {
                bet.value = (bet.odd * bet.prob) - 1;
                bet.kellyStake = kellyCriterion(bet.odd, bet.prob);
            }
        }
    }
    return allResults;
};

/**
 * Verifica se uma aposta de valor corresponde a algum dos alertas de um utilizador.
 */
const checkAlerts = (bet, activeAlerts) => {
    for (const alert of activeAlerts) {
        let allRulesMatch = true;
        for (const rule of alert.ruleData) {
            if (bet.market !== rule.market || bet.outcome !== rule.outcome) {
                allRulesMatch = false;
                break;
            }
            const metricMap = {
                'Odd': bet.odd,
                'Valor (EV)': bet.value * 100,
                'Kelly Stake': bet.kellyStake * 100,
                'Probabilidade': bet.prob * 100,
            };
            const betValue = metricMap[rule.metric];
            if (betValue === undefined) { allRulesMatch = false; break; }

            let ruleMatches = false;
            switch (rule.operator) {
                case '>': if (betValue > rule.value) ruleMatches = true; break;
                case '<': if (betValue < rule.value) ruleMatches = true; break;
                case '>=': if (betValue >= rule.value) ruleMatches = true; break;
                case '<=': if (betValue <= rule.value) ruleMatches = true; break;
                case '=': if (betValue === rule.value) ruleMatches = true; break;
            }
            if (!ruleMatches) {
                allRulesMatch = false;
                break;
            }
        }
        if (allRulesMatch) {
            return alert.name;
        }
    }
    return null;
};

// --- A CLOUD FUNCTION PRINCIPAL ---

exports.scanGamesForAlerts = functions.runWith({ timeoutSeconds: 300, memory: '1GB' }).pubsub.schedule("every 2 hours").onRun(async (context) => {
    functions.logger.info("Iniciando varrimento de jogos para alertas...");

    const usersSnapshot = await db.collection("users").get();
    if (usersSnapshot.empty) {
        functions.logger.info("Nenhum utilizador encontrado.");
        return null;
    }

    const today = new Date().toISOString().slice(0, 10);
    const fixtures = await apiFetch(`v3/fixtures?date=${today}&status=NS`);
    if (!fixtures || fixtures.length === 0) {
        functions.logger.info("Nenhum jogo encontrado para hoje.");
        return null;
    }

    for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userId = userDoc.id;
        const activeAlerts = (userData.alerts || []).filter((a) => a.active);
        const userFCMToken = userData.fcmToken; // Pega o token do usuário para push notifications

        // Pula para o próximo usuário se não houver alertas ativos ou token de notificação
        if (activeAlerts.length === 0 || !userFCMToken) {
            continue;
        }

        for (const fixture of fixtures) {
            const analysisResults = await runAnalysisForFixture(fixture);
            if (!analysisResults) continue;

            const allValueBets = Object.values(analysisResults)
                .flatMap((outcomes) => Object.values(outcomes))
                .filter(bet => bet.value > 0.01);

            for (const bet of allValueBets) {
                const matchedAlertName = checkAlerts(bet, activeAlerts);
                if (matchedAlertName) {
                    const fixtureName = `${fixture.teams.home.name} vs ${fixture.teams.away.name}`;
                    const notificationBody = `Oportunidade para "${bet.outcome}" @${bet.odd.toFixed(2)} no jogo ${fixtureName}.`;
                    
                    functions.logger.info(`Notificação para ${userId}: ${notificationBody}`);

                    // 1. Cria a notificação na subcoleção do utilizador no Firestore
                    await db.collection("users").doc(userId).collection("notifications").add({
                        message: `Alerta "${matchedAlertName}": ${notificationBody}`,
                        fixtureId: fixture.fixture.id,
                        timestamp: admin.firestore.FieldValue.serverTimestamp(),
                        read: false,
                    });
                    
                    // 2. Envia a Notificação Push para o dispositivo do usuário
                    const payload = {
                        notification: {
                            title: `Alerta "${matchedAlertName}" Acionado!`,
                            body: notificationBody,
                            icon: '/vite.svg', // Opcional: URL para o ícone
                        },
                        token: userFCMToken
                    };

                    try {
                        await admin.messaging().send(payload);
                        functions.logger.info("Notificação Push enviada com sucesso!");
                    } catch (error) {
                        functions.logger.error("Erro ao enviar notificação Push:", error);
                        // Se o token for inválido, você pode querer removê-lo do Firestore aqui
                        if (error.code === 'messaging/registration-token-not-registered') {
                            await db.collection("users").doc(userId).update({ fcmToken: admin.firestore.FieldValue.delete() });
                        }
                    }
                }
            }
        }
    }

    functions.logger.info("Varrimento de alertas concluído.");
    return null;
});