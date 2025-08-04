// src/pages/SettingsPage.jsx

import React, { useState } from 'react';
import { clearCache } from '../utils/cache';

export default function SettingsPage() {
    const [message, setMessage] = useState('');

    const handleClearCache = async () => {
        try {
            await clearCache();
            setMessage('O cache de dados da API foi limpo com sucesso!');
            setTimeout(() => setMessage(''), 3000); // Limpa a mensagem após 3 segundos
        } catch (error) {
            setMessage('Ocorreu um erro ao limpar o cache.');
            console.error('Erro ao limpar o cache:', error);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-emerald-400">Configurações</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                    Gira os dados em cache e outras configurações do aplicativo.
                </p>
            </header>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-white mb-4">Gestão de Cache</h2>
                <p className="text-gray-400 mb-4">
                    O aplicativo guarda os dados da API localmente por 24 horas para acelerar o carregamento e reduzir o uso da API. Se você acha que os dados (como listas de jogos ou estatísticas) estão desatualizados, pode forçar uma atualização limpando o cache.
                </p>
                <button
                    onClick={handleClearCache}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                    Limpar Cache de Dados da API
                </button>
                {message && (
                    <p className="mt-4 text-sm text-green-400">{message}</p>
                )}
            </div>
        </div>
    );
}
