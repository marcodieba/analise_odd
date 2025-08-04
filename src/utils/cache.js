// src/utils/cache.js

import { openDB } from 'idb';

const DB_NAME = 'api-cache-db';
const STORE_NAME = 'api-responses';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

// Inicializa o banco de dados
const dbPromise = openDB(DB_NAME, 1, {
  upgrade(db) {
    db.createObjectStore(STORE_NAME);
  },
});

/**
 * Guarda dados no cache do IndexedDB.
 * @param {string} key - A chave única para os dados (ex: endpoint da API).
 * @param {any} data - Os dados a serem guardados.
 */
export const setCache = async (key, data) => {
  const db = await dbPromise;
  const value = {
    timestamp: Date.now(),
    data: data,
  };
  await db.put(STORE_NAME, value, key);
};

/**
 * Obtém dados do cache do IndexedDB.
 * @param {string} key - A chave dos dados a serem recuperados.
 * @returns {Promise<any|null>} Os dados em cache ou nulo se não existirem ou estiverem expirados.
 */
export const getCache = async (key) => {
  const db = await dbPromise;
  const value = await db.get(STORE_NAME, key);

  if (!value) {
    return null; // Cache miss
  }

  const isExpired = (Date.now() - value.timestamp) > CACHE_DURATION_MS;

  if (isExpired) {
    await db.delete(STORE_NAME, key); // Remove o cache expirado
    return null;
  }

  return value.data;
};

/**
 * Limpa todo o cache do IndexedDB.
 */
export const clearCache = async () => {
  const db = await dbPromise;
  await db.clear(STORE_NAME);
  console.log('Cache limpo com sucesso.');
};
