// src/App.jsx

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { auth, db } from './firebase';

import NavBar from './components/NavBar.jsx';
import NotificationPanel from './components/NotificationPanel.jsx';
import GameAnalysisPage from './pages/GameAnalysisPage.jsx';
import MultipleBuilderPage from './pages/MultipleBuilderPage.jsx';
import LiveAnalysisPage from './pages/LiveAnalysisPage.jsx';
import BetTrackerPage from './pages/BetTrackerPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import GreenAnalysisPage from './pages/GreenAnalysisPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';

const API_HOST = 'api-football-v1.p.rapidapi.com';

// NOVO: Componente para exibir um erro claro se a chave da API não for encontrada
const ApiKeyError = () => (
    <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-2xl bg-red-900/50 border border-red-500/50 p-8 rounded-lg shadow-lg text-center">
            <h1 className="text-3xl font-bold text-red-300 mb-4">Erro de Configuração</h1>
            <p className="text-red-200 mb-6">
                A chave da API-Football não foi encontrada. A aplicação não pode buscar dados sem ela.
            </p>
            <div className="bg-gray-800 p-4 rounded-md text-left">
                <p className="font-bold text-white">Como corrigir:</p>
                <ol className="list-decimal list-inside mt-2 text-gray-300 space-y-2">
                    <li>Na pasta raiz do seu projeto (a mesma pasta de `package.json`), crie um arquivo chamado <code className="bg-gray-900 px-1 py-0.5 rounded text-emerald-400">.env.local</code>.</li>
                    <li>Dentro deste arquivo, adicione a seguinte linha, substituindo `SUA_CHAVE_AQUI` pela sua chave real da RapidAPI:</li>
                </ol>
                <pre className="bg-gray-900 text-emerald-400 p-3 rounded-md mt-4 overflow-x-auto">
                    <code>VITE_API_FOOTBALL_KEY=SUA_CHAVE_AQUI</code>
                </pre>
                <p className="mt-4 text-sm text-gray-400">Após salvar o arquivo, você **precisa reiniciar o servidor de desenvolvimento** (pare o processo no terminal e execute `npm run dev` novamente).</p>
            </div>
        </div>
    </div>
);


function App() {
  // A chave da API é lida do ambiente uma única vez aqui.
  const apiKey = import.meta.env.VITE_API_FOOTBALL_KEY;

  const [activePage, setActivePage] = useState('gameAnalysis');
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  
  const [bankroll, setBankroll] = useState(1000);
  const [bets, setBets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userProfile, setUserProfile] = useState({});

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoadingAuth(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setBankroll(data.bankroll || 1000);
          setBets(data.bets || []);
          setAlerts(data.alerts || []);
          setUserProfile({ email: currentUser.email, name: data.name || '' });
        } else {
          setDoc(userDocRef, { name: '', bankroll: 1000, bets: [], alerts: [] });
        }
      });

      const notificationsRef = collection(db, 'users', currentUser.uid, 'notifications');
      const q = query(notificationsRef, orderBy('timestamp', 'desc'));
      const unsubscribeNotifications = onSnapshot(q, (querySnapshot) => {
        const notifs = [];
        querySnapshot.forEach((doc) => {
            notifs.push({ id: doc.id, ...doc.data() });
        });
        setNotifications(notifs);
      });

      return () => {
        unsubscribeUser();
        unsubscribeNotifications();
      };
    } else {
      setBankroll(1000);
      setBets([]);
      setAlerts([]);
      setNotifications([]);
      setUserProfile({});
    }
  }, [currentUser]);

  const handleSetData = async (data) => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, data, { merge: true });
  };
  
  const handleAddBet = (newBet) => {
    const updatedBets = [...bets, { id: Date.now(), ...newBet, result: 'Pendente', profit: 0 }];
    handleSetData({ bets: updatedBets });
    setActivePage('tracker'); 
  };

  const handleDeleteBet = (betId) => {
    if (window.confirm("Tem a certeza de que quer apagar esta aposta? A ação é irreversível.")) {
        const updatedBets = bets.filter(bet => bet.id !== betId);
        handleSetData({ bets: updatedBets });
    }
  };

  const handleSetBankroll = (newBankroll) => {
    handleSetData({ bankroll: newBankroll });
  };

  const handleSetAlerts = (newAlerts) => {
    handleSetData({ alerts: newAlerts });
  };
  
  const handleUpdateProfile = (profileData) => {
    handleSetData(profileData);
  };

  const handleResolveBets = async () => {
    if (!apiKey) {
      alert("A chave da API não está configurada no projeto.");
      return;
    }
    const pendingBets = bets.filter(bet => bet.result === 'Pendente' && bet.fixtureId);
    if (pendingBets.length === 0) {
        alert("Não há apostas pendentes para resolver.");
        return;
    }
    const fixtureIds = [...new Set(pendingBets.map(bet => bet.fixtureId))].join('-');
    
    try {
        const response = await fetch(`https://${API_HOST}/v3/fixtures?ids=${fixtureIds}`, {
            method: 'GET',
            headers: { 'x-rapidapi-host': API_HOST, 'x-rapidapi-key': apiKey },
        });
        const data = await response.json();
        if (data.results === 0) throw new Error("Não foi possível encontrar os jogos.");
        const resolvedFixtures = data.response;

        let updatedBets = bets.map(bet => {
            if (bet.result !== 'Pendente' || !bet.fixtureId) return bet;
            const resolvedFixture = resolvedFixtures.find(f => f.fixture.id === bet.fixtureId);
            if (!resolvedFixture || resolvedFixture.fixture.status.short !== 'FT') return bet;

            const { goals } = resolvedFixture;
            const homeGoals = goals.home;
            const awayGoals = goals.away;
            let isBetWon = false;
            
            // *** INÍCIO DA LÓGICA ATUALIZADA ***
            switch (bet.market) {
                case 'Resultado Final':
                    if (bet.outcome.includes('Casa')) isBetWon = homeGoals > awayGoals;
                    else if (bet.outcome.includes('Empate')) isBetWon = homeGoals === awayGoals;
                    else if (bet.outcome.includes('Visitante')) isBetWon = homeGoals < awayGoals;
                    break;
                
                case 'Dupla Chance':
                    if (bet.outcome.includes('Casa ou Empate')) isBetWon = homeGoals >= awayGoals;
                    else if (bet.outcome.includes('Visitante ou Empate')) isBetWon = awayGoals >= homeGoals;
                    else if (bet.outcome.includes('Casa ou Visitante')) isBetWon = homeGoals !== awayGoals;
                    break;

                case 'Total de Golos': // Assumindo o mercado "Total de Golos 2.5"
                    const totalGoals = homeGoals + awayGoals;
                    if (bet.outcome.includes('Mais de 2.5')) isBetWon = totalGoals > 2.5;
                    else if (bet.outcome.includes('Menos de 2.5')) isBetWon = totalGoals < 2.5;
                    break;
                
                case 'Ambas Marcam':
                    if (bet.outcome === 'Sim') isBetWon = homeGoals > 0 && awayGoals > 0;
                    else if (bet.outcome === 'Não') isBetWon = homeGoals === 0 || awayGoals === 0;
                    break;
                
                // Adicione outros mercados que você suporta aqui...
                default:
                    // Se o mercado não for reconhecido, mantém a aposta como pendente
                    console.warn(`Mercado não reconhecido para resolução: ${bet.market}`);
                    return bet;
            }
            // *** FIM DA LÓGICA ATUALIZADA ***

            const stakeAmount = (bet.stake / 100) * bankroll;
            return {
                ...bet,
                result: isBetWon ? 'Ganha' : 'Perdida',
                profit: isBetWon ? (stakeAmount * bet.odd) - stakeAmount : -stakeAmount,
            };
        });
        
        handleSetData({ bets: updatedBets });
    } catch (err) {
        alert(`Erro ao resolver apostas: ${err.message}`);
    }
  };

  if (loadingAuth) {
    return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">A carregar...</div>;
  }

  // NOVO: Verificação crucial da chave da API. Se não existir, mostra o erro.
  if (!apiKey) {
      return <ApiKeyError />;
  }

  return (
      <div className="bg-gray-900 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
        {currentUser ? (
          <>
            <header className="flex justify-between items-center mb-4">
                <div className="flex-1"></div>
                <NavBar activePage={activePage} setActivePage={setActivePage} />
                <div className="flex-1 flex justify-end items-center space-x-4">
                    <span className="text-sm text-gray-400 hidden md:block">{userProfile.name || currentUser.email}</span>
                    <NotificationPanel notifications={notifications} />
                    <button onClick={() => signOut(auth)} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md">Sair</button>
                </div>
            </header>
            <main>
              {activePage === 'gameAnalysis' && <GameAnalysisPage onRegisterBet={handleAddBet} />}
              {activePage === 'green' && <GreenAnalysisPage />}
              {activePage === 'hunter' && <MultipleBuilderPage />}
              {activePage === 'live' && <LiveAnalysisPage />}
              {activePage === 'tracker' && <BetTrackerPage bets={bets} bankroll={bankroll} setBankroll={handleSetBankroll} onResolveBets={handleResolveBets} onDeleteBet={handleDeleteBet} setActivePage={setActivePage} />}
              {activePage === 'alerts' && <AlertsPage alerts={alerts} setAlerts={handleSetAlerts} />}
              {activePage === 'profile' && <ProfilePage currentUser={userProfile} onUpdateProfile={handleUpdateProfile} />}
              {activePage === 'settings' && <SettingsPage />} 
            </main>
          </>
        ) : (
          <AuthPage />
        )}
      </div>
  );
}

export default App;