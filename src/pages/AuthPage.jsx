import React, { useState } from 'react';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "firebase/auth";
import { auth } from '../firebase'; // Importa a configuração do Firebase

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                // O login bem-sucedido será detetado pelo listener no App.jsx
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
                // O registo bem-sucedido também fará o login automático
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg">
                <h1 className="text-3xl font-bold text-center text-emerald-400 mb-6">
                    {isLogin ? 'Iniciar Sessão' : 'Criar Conta'}
                </h1>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <input
                        type="password"
                        placeholder="Palavra-passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength="6"
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button 
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-lg transition"
                    >
                        {isLogin ? 'Entrar' : 'Registar'}
                    </button>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                </form>
                <p className="text-center text-gray-400 text-sm mt-6">
                    {isLogin ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}
                    <button 
                        onClick={() => setIsLogin(!isLogin)}
                        className="font-medium text-emerald-400 hover:underline ml-2"
                    >
                        {isLogin ? 'Registe-se' : 'Inicie a sessão'}
                    </button>
                </p>
            </div>
        </div>
    );
}
