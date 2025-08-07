// functions/.eslintrc.js

module.exports = {
  root: true,
  env: {
    es6: true,
    node: true, // Esta é a linha mais importante que adicionámos!
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    quotes: ["error", "double"],
  },
  parserOptions: {
    "ecmaVersion": 2020, // Permite o uso de funcionalidades mais modernas do JavaScript
  },
};