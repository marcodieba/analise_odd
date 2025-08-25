// src/pages/AuthPage.jsx

import React, { useState } from 'react';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "firebase/auth";
import { auth } from '../firebase';
import styles from './AuthPage.module.css'; // Importa os nossos novos estilos

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
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
        } catch (err) {
            // Assegura que o erro é uma string para evitar problemas de renderização
            setError(err.message || 'Ocorreu um erro desconhecido.');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <h1 className={styles.title}>
                    {isLogin ? 'Iniciar Sessão' : 'Criar Conta'}
                </h1>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <label htmlFor="email" className={styles.label}>Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            className={styles.inputField}
                        />
                    </div>

                    <div className={styles.inputGroup}>
                        <label htmlFor="password" className={styles.label}>Palavra-passe</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength="6"
                            className={styles.inputField}
                        />
                    </div>
                    
                    <button 
                        type="submit"
                        className={styles.submitButton}
                    >
                        {isLogin ? 'Entrar' : 'Registar'}
                    </button>
                    {error && <p className={styles.errorText}>{error}</p>}
                </form>
                <p className={styles.toggleText}>
                    {isLogin ? 'Ainda não tem uma conta?' : 'Já tem uma conta?'}
                    <button 
                        type="button" // Adicionado para evitar submissão do formulário
                        onClick={() => setIsLogin(!isLogin)}
                        className={styles.toggleButton}
                    >
                        {isLogin ? 'Registe-se' : 'Inicie a sessão'}
                    </button>
                </p>
            </div>
        </div>
    );
}