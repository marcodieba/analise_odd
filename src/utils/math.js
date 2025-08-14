// src/utils/math.js

/**
 * Calcula o fatorial de um número de forma iterativa (mais eficiente).
 * @param {number} n - O número para o qual calcular o fatorial.
 * @returns {number} O resultado do fatorial.
 */
export const factorial = (n) => {
    if (n < 0) return -1; // Fatorial de número negativo não existe.
    if (n === 0) return 1; // Fatorial de 0 é 1.
    
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
};

/**
 * Calcula a probabilidade de Poisson.
 * @param {number} lambda - A média de ocorrências (ex: golos esperados).
 * @param {number} k - O número de ocorrências que se quer calcular a probabilidade.
 * @returns {number} A probabilidade de Poisson.
 */
export const poisson = (lambda, k) => {
    return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
};

/**
 * Calcula o Critério de Kelly Fracionado.
 * @param {number} odd - A odd decimal.
 * @param {number} probability - A nossa probabilidade calculada.
 * @param {number} fraction - A fração do Kelly a ser usada (ex: 0.25 para 1/4).
 * @returns {number} A fração da banca a ser apostada.
 */
export const kellyCriterion = (odd, probability, fraction = 0.25) => {
    if (odd <= 1 || probability <= 0) return 0;

    const value = (odd * probability) - 1;
    if (value <= 0) return 0;

    const kellyFraction = ((odd - 1) * probability - (1 - probability)) / (odd - 1);

    // Retorna a fração de Kelly multiplicada pelo nosso fator de segurança
    return kellyFraction > 0 ? kellyFraction * fraction : 0;
};