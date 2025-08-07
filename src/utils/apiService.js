import { getCache, setCache } from './cache.js';

// Lê o HOST e a KEY a partir das variáveis de ambiente
const API_HOST = import.meta.env.VITE_API_HOST;
const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY;

/**
 * Função centralizada para buscar dados da API-Football com cache.
 * @param {string} endpoint - O endpoint da API a ser chamado (ex: 'v3/leagues?season=2023').
 * @returns {Promise<any>} Os dados da resposta.
 * @throws {Error} Lança um erro se a chamada à API falhar.
 */
export const apiFetch = async (endpoint) => {
    const cacheKey = endpoint;
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
        console.log(`[Cache HIT] Dados para ${cacheKey} encontrados no cache.`);
        return cachedData;
    }

    console.log(`[Cache MISS] Buscando dados da API para: ${cacheKey}`);

    try {
        // A lógica de fetch agora usa a variável API_HOST lida do .env.local
        const response = await fetch(`https://${API_HOST}/${endpoint}`, {
            method: 'GET',
            headers: { 'x-rapidapi-host': API_HOST, 'x-rapidapi-key': API_KEY },
        });

        if (!response.ok) {
            throw new Error(`Erro de rede: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.errors && Object.keys(data.errors).length > 0) {
            const errorDetails = typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors);
            throw new Error(`Erro da API-Football: ${errorDetails}`);
        }

        const responseData = data.response || [];
        
        await setCache(cacheKey, responseData);
        
        return responseData;

    } catch (err) {
        console.error(`Falha na chamada da API para ${endpoint}:`, err);
        // CORREÇÃO: Lança o erro para que o chamador possa tratá-lo.
        throw err;
    }
};