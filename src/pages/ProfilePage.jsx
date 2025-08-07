import React, { useState, useEffect } from 'react';

export default function ProfilePage({ currentUser, onUpdateProfile }) {
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        // Preenche o campo com o nome atual do usuário quando a página carrega
        if (currentUser?.name) {
            setName(currentUser.name);
        }
    }, [currentUser]);

    const handleSave = () => {
        onUpdateProfile({ name });
        setMessage('Perfil atualizado com sucesso!');
        setTimeout(() => setMessage(''), 3000); // Limpa a mensagem após 3 segundos
    };

    return (
        <div className="max-w-4xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-emerald-400">👤 Meu Perfil</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                    Gira as suas informações e configurações da aplicação.
                </p>
            </header>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-white mb-4">Informações da Conta</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400">Email</label>
                        <p className="text-white text-lg">{currentUser?.email}</p>
                    </div>
                    <div>
                        <label htmlFor="name-input" className="block text-sm font-medium text-gray-400">Nome de Exibição</label>
                        <input
                            id="name-input"
                            type="text"
                            placeholder="Como gostaria de ser chamado?"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3"
                        />
                    </div>
                    <div className="text-right">
                         <button
                            onClick={handleSave}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg transition disabled:opacity-50"
                            disabled={!name || name === currentUser?.name}
                        >
                            Guardar Alterações
                        </button>
                    </div>
                     {message && (
                        <p className="mt-4 text-sm text-green-400 text-center">{message}</p>
                    )}
                </div>
            </div>
        </div>
    );
}