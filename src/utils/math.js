export const factorial = (n) => {
    if (n < 0) return -1;
    if (n === 0) return 1;
    return n * factorial(n - 1);
};

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
