const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const { poisson, kellyCriterion } = require("./math"); // Copie o seu ficheiro math.js para a pasta functions

admin.initializeApp();
const db = admin.firestore();

// --- CONSTANTES DA API ---
// É uma boa prática guardar as chaves em variáveis de ambiente das Functions
// firebase functions:config:set apifootball.key="SUA_CHAVE_AQUI"
const API_HOST = "api-football-v1.p.rapidapi.com";
const API_KEY = functions.config().apifootball.key;
const CURRENT_SEASON = new Date().getFullYear();
const BOOKMAKER_ID = 8; // Bet365

// Função auxiliar para chamar a API
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

// Lógica de análise (simplificada a partir do seu useAnalysisEngine)
const runAnalysisForFixture = async (fixture, leagueContext) => {
    const { teams, league, fixture: { id: fixtureId } } = fixture;

    const [statsData, oddsData] = await Promise.all([
        // NOTA: Para um sistema real, seria mais eficiente buscar todos os stats da liga de uma vez
        apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${teams.home.id}&league=${league.id}`),
        apiFetch(`v3/teams/statistics?season=${CURRENT_SEASON}&team=${teams.away.id}&league=${league.id}`),
        apiFetch(`v3/odds?fixture=${fixtureId}&bookmaker=${BOOKMAKER_ID}`),
    ]);

    // ... (Aqui entraria a sua lógica completa de `fetchStats` e `calculateValue`)
    // Esta é uma versão simplificada para o exemplo. Adapte com a sua lógica completa.
    // O objetivo é retornar um objeto `allResults` como o que já tem no frontend.
    // Por brevidade, vamos simular um resultado.
    
    // SIMULAÇÃO: Substitua isto pela sua lógica de cálculo de valor real
    const allResults = {
        '1X2': {
            'Casa (1)': { prob: 0.5, odd: 1.9, value: 0.05, market: '1X2', outcome: 'Casa (1)' },
            'Visitante (2)': { prob: 0.2, odd: 4.5, value: 0.1, market: '1X2', outcome: 'Visitante (2)' },
        },
        // ... outros mercados
    };

    return allResults;
};


// Função principal que corre agendada
exports.scanGamesForAlerts = functions.pubsub.schedule("every 2 hours").onRun(async (context) => {
  functions.logger.info("Iniciando varrimento de jogos para alertas...");

  // 1. Obter todos os utilizadores e os seus alertas
  const usersSnapshot = await db.collection("users").get();
  if (usersSnapshot.empty) {
    functions.logger.info("Nenhum utilizador encontrado.");
    return null;
  }

  // 2. Obter todos os jogos do dia
  const today = new Date().toISOString().slice(0, 10);
  const fixtures = await apiFetch(`v3/fixtures?date=${today}&status=NS`);
  if (!fixtures || fixtures.length === 0) {
    functions.logger.info("Nenhum jogo encontrado para hoje.");
    return null;
  }

  // 3. Iterar sobre cada utilizador
  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data();
    const userId = userDoc.id;
    const activeAlerts = (userData.alerts || []).filter((a) => a.active);

    if (activeAlerts.length === 0) {
      continue; // Próximo utilizador se este não tiver alertas ativos
    }

    // 4. Iterar sobre cada jogo
    for (const fixture of fixtures) {
      const analysisResults = await runAnalysisForFixture(fixture, {}); // O contexto da liga deveria ser obtido aqui
      if (!analysisResults) continue;

      const allBets = Object.values(analysisResults).flatMap((outcomes) => Object.values(outcomes));

      // 5. Verificar cada aposta de valor contra os alertas do utilizador
      for (const bet of allBets) {
        if (!bet.value || bet.value <= 0) continue;

        for (const alert of activeAlerts) {
          let allRulesMatch = true;
          // ... (a sua lógica de `checkAlerts` de `OddsHunterPage copy.jsx` entraria aqui)
          // Exemplo simplificado:
          const evRule = alert.ruleData.find(r => r.metric === 'Valor (EV)');
          if (evRule && (bet.value * 100) > evRule.value) {
            
            functions.logger.info(`Alerta '${alert.name}' para o utilizador ${userId} no jogo ${fixture.teams.home.name} vs ${fixture.teams.away.name}`);

            // 6. Criar a notificação no Firestore
            await db.collection("users").doc(userId).collection("notifications").add({
                message: `Alerta "${alert.name}" acionado: ${bet.outcome} @${bet.odd.toFixed(2)} no jogo ${fixture.teams.home.name} vs ${fixture.teams.away.name}.`,
                fixtureId: fixture.fixture.id,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                read: false,
            });
          }
        }
      }
    }
  }

  functions.logger.info("Varrimento de alertas concluído.");
  return null;
});