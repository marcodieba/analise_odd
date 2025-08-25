// src/functions/index.js

import { setGlobalOptions } from "firebase-functions/v2";
import { onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import logger from "firebase-functions/logger";
import admin from "firebase-admin";
import ort from "onnxruntime-node";
import fetch from "node-fetch"; // A importação correta para o seu ambiente
import os from "os";
import path from "path";

// ---------- FUNÇÕES AUXILIARES ----------
const factorial = (n) => {
  if (n < 0) return -1;
  if (n === 0) return 1;
  let res = 1;
  for (let i = 2; i <= n; i++) res *= i;
  return res;
};

const poisson = (lambda, k) =>
  (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);

const kellyCriterion = (odd, probability, fraction = 0.25) => {
  if (odd <= 1 || probability <= 0) return 0;
  const value = odd * probability - 1;
  if (value <= 0) return 0;
  const kellyFraction =
    ((odd - 1) * probability - (1 - probability)) / (odd - 1);
  return kellyFraction > 0 ? kellyFraction * fraction : 0;
};

// ---------- FIREBASE ADMIN ----------
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();

// ---------- CONFIGURAÇÕES ----------
setGlobalOptions({ maxInstances: 10 });
const API_HOST = "api-football-v1.p.rapidapi.com";
const API_KEY = process.env.APIFOOTBALL_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_KEY || "";
const CURRENT_SEASON = new Date().getFullYear();
const BOOKMAKER_ID = 8;

// ---------- MODELO ONNX VIA FIREBASE STORAGE ----------
let sessionPromise;
const MODEL_PATH = "ml-models/football_predictor.onnx";

const getModelSession = async () => {
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    try {
        logger.info("Baixando modelo ONNX do Firebase Storage...");

        const bucket = storage.bucket(); // Obtém o bucket padrão
        const file = bucket.file(MODEL_PATH);

        const [exists] = await file.exists();
        if (!exists) {
            throw new Error(`Modelo não encontrado em gs://${bucket.name}/${MODEL_PATH}`);
        }

        const [contents] = await file.download();
        const session = await ort.InferenceSession.create(contents, {
            executionProviders: ["cpu"], // Usar 'cpu' é mais seguro no servidor
        });

        logger.info("Modelo ONNX carregado com sucesso.");
        return session;
    } catch (error) {
        logger.error("ERRO CRÍTICO AO CARREGAR O MODELO:", error);
        sessionPromise = null; // Anula a promessa para permitir nova tentativa
        throw error;
    }
  })();

  return sessionPromise;
};

// ---------- FUNÇÃO ML ----------
export const predictFixtureWithML = onCall(async (request) => {
  const data = request.data;

  const session = await getModelSession();
  if (!session) {
    logger.error("Sessão do modelo ONNX indisponível.");
    throw new Error("Serviço de previsão indisponível.");
  }

  const expectedFeatures = [
    "home_form",
    "away_form",
    "home_avg_goals_for",
    "home_avg_goals_against",
    "away_avg_goals_for",
    "away_avg_goals_against",
    "B365H",
    "B365D",
    "B365A",
  ];

  if (!data || expectedFeatures.some((f) => typeof data[f] !== "number")) {
    throw new Error("Dados de entrada inválidos.");
  }

  try {
    const inputData = new Float32Array(expectedFeatures.map((f) => data[f]));
    const tensor = new ort.Tensor("float32", inputData, [1, expectedFeatures.length]);
    const results = await session.run({ float_input: tensor });

    const probabilities = results.output_probability.data;
    return {
      homeWinProb: probabilities[0],
      drawProb: probabilities[1],
      awayWinProb: probabilities[2],
    };
  } catch (error) {
    logger.error("Erro durante inferência ONNX:", error);
    throw new Error("Falha ao executar a previsão.");
  }
});

// ---------- GEMINI API ----------
const callGeminiAPI = async (prompt) => {
  if (!GEMINI_API_KEY) throw new Error("Chave da API Gemini não configurada.");
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: "application/json" },
  };
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorBody = await response.text();
    logger.error("Erro na API Gemini:", response.status, errorBody);
    throw new Error("Falha ao comunicar com Gemini API.");
  }
  const result = await response.json();
  const text = result.candidates[0].content.parts[0].text;
  return JSON.parse(text);
};

export const analyzeSentiment = onCall(async (request) => {
  const { newsTitles, teamName } = request.data;
  if (!newsTitles || !teamName) {
    throw new Error("Faltam os parâmetros 'newsTitles' ou 'teamName'.");
  }
  const prompt = `Você é um analista desportivo. Analise os seguintes títulos de notícias sobre ${teamName}: ${newsTitles.join(", ")}.`;
  return callGeminiAPI(prompt);
});

export const analyzeH2HTactics = onCall(async (request) => {
  const { formattedHistory, homeTeam, awayTeam } = request.data;
  if (!formattedHistory || !homeTeam || !awayTeam) {
    throw new Error("Faltam parâmetros necessários.");
  }
  const prompt = `Você é um tático de futebol. Analise confrontos entre ${homeTeam} e ${awayTeam}: ${formattedHistory}.`;
  return callGeminiAPI(prompt);
});

// ---------- API FOOTBALL ----------
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
    logger.error(`Erro na API para ${endpoint}:`, err);
    return null;
  }
};

// ---------- ANALISE PROBABILÍSTICA ----------
const runAnalysisForFixture = async (fixture) => {
  const { home_avg_goals_for, away_avg_goals_for } = fixture;
  const homeProb = poisson(home_avg_goals_for, 1);
  const awayProb = poisson(away_avg_goals_for, 1);
  const drawProb = 1 - homeProb - awayProb;
  return { homeProb, drawProb, awayProb };
};

// ---------- ALERTAS PROGRAMADOS ----------
const checkAlerts = (bet, activeAlerts) => {
  // TODO: implementar lógica de alertas
  return null;
};

export const scanGamesForAlerts = onSchedule(
  { schedule: "every 2 hours", timeoutSeconds: 300, memory: "1GiB" },
  async () => {
    logger.info("Iniciando verificação de alertas...");
    const alertsSnapshot = await db.collection("alerts").get();
    alertsSnapshot.forEach((doc) => {
      logger.info("Alerta encontrado:", doc.id, doc.data());
    });
    logger.info("Verificação de alertas concluída.");
  }
);