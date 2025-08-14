import { getCache, setCache } from './cache.js';

// Lê o HOST e a KEY a partir das variáveis de ambiente
const API_HOST = import.meta.env.VITE_API_HOST || 'api-football-v1.p.rapidapi.com';
const API_KEY = import.meta.env.VITE_API_FOOTBALL_KEY;

/**
 * Função centralizada para buscar dados da API-Football com cache.
 * @param {string} endpoint - O endpoint da API a ser chamado (ex: 'v3/leagues').
 * @returns {Promise<any>} Os dados da resposta.
 * @throws {Error} Lança um erro se a chamada à API falhar ou se a chave da API não estiver configurada.
 */
export const apiFetch = async (endpoint) => {
    if (!API_KEY) {
        console.error("Chave da API (VITE_API_FOOTBALL_KEY) não está configurada.");
        // Lança um erro que pode ser capturado pelo chamador para exibir uma mensagem ao usuário.
        throw new Error("A chave da API não está configurada. Verifique o seu ficheiro .env.local.");
    }

    const cacheKey = endpoint;
    const cachedData = await getCache(cacheKey);

    if (cachedData) {
        console.log(`[Cache HIT] Dados para ${cacheKey} encontrados no cache.`);
        return cachedData;
    }

    console.log(`[Cache MISS] Buscando dados da API para: ${cacheKey}`);

    try {
        const response = await fetch(`https://${API_HOST}/${endpoint}`, {
            method: 'GET',
            headers: {
                'x-rapidapi-host': API_HOST,
                'x-rapidapi-key': API_KEY
            },
        });

        if (!response.ok) {
            // Tenta ler o corpo do erro para dar mais detalhes
            const errorBody = await response.json().catch(() => ({ message: response.statusText }));
            const errorMessage = errorBody?.message || errorBody?.errors?.all || JSON.stringify(errorBody.errors) || `Erro de rede: ${response.status}`;
            throw new Error(errorMessage);
        }

        const data = await response.json();

        // Tratamento de erros específicos da API-Football que vêm com status 200 OK
        if (data.errors && Object.keys(data.errors).length > 0) {
            const errorDetails = typeof data.errors === 'string' ? data.errors : JSON.stringify(data.errors);
            throw new Error(`Erro da API-Football: ${errorDetails}`);
        }

        const responseData = data.response || [];
        
        // Guarda os dados obtidos com sucesso no cache
        await setCache(cacheKey, responseData);
        
        return responseData;

    } catch (err) {
        console.error(`Falha na chamada da API para ${endpoint}:`, err);
        // Lança o erro novamente para que o hook ou componente que chamou a função possa tratá-lo (ex: mostrar no ecrã).
        throw err;
    }
};