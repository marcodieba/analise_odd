// src/App.jsx

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { auth, db } from './firebase';

import NavBar from './components/NavBar.jsx';
import NotificationPanel from './components/NotificationPanel.jsx';
import DeepAnalysisPage from './pages/DeepAnalysisPage.jsx';
import MultipleBuilderPage from './pages/MultipleBuilderPage.jsx'; // Nome corrigido
import LiveAnalysisPage from './pages/LiveAnalysisPage.jsx';
import BetTrackerPage from './pages/BetTrackerPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import GreenAnalysisPage from './pages/GreenAnalysisPage.jsx';
import StatsCenterPage from './pages/StatsCenterPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';

const API_HOST = 'api-football-v1.p.rapidapi.com';

function App() {
  const [activePage, setActivePage] = useState('deepAnalysis');
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [bankroll, setBankroll] = useState(1000);
  const [bets, setBets] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);

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
        } else {
          setDoc(userDocRef, { bankroll: 1000, bets: [], alerts: [] });
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
    }
  }, [currentUser]);

  const handleSetData = async (data) => {
    if (!currentUser) return;
    const userDocRef = doc(db, 'users', currentUser.uid);
    await setDoc(userDocRef, data, { merge: true });
  };

  const handleAddBet = (newBet) => {
    const updatedBets = [
        ...bets,
        {
            id: Date.now(),
            ...newBet,
            result: 'Pendente',
            profit: 0,
        }
    ];
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

  const handleResolveBets = async (apiKey) => {
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

            // Lógica de resolução simplificada, adicione mais mercados se necessário
            switch (bet.market) {
                case 'Resultado Final':
                    if (bet.outcome === 'Casa') isBetWon = homeGoals > awayGoals;
                    else if (bet.outcome === 'Empate') isBetWon = homeGoals === awayGoals;
                    else if (bet.outcome === 'Visitante') isBetWon = homeGoals < awayGoals;
                    break;
                case 'Ambas Marcam':
                    if (bet.outcome === 'Sim') isBetWon = homeGoals > 0 && awayGoals > 0;
                    else if (bet.outcome === 'Não') isBetWon = homeGoals === 0 || awayGoals === 0;
                    break;
                // Adicione outros casos de mercado aqui
            }

            const stakeAmount = (bet.stake / 100) * bankroll;
            return {
                ...bet,
                result: isBetWon ? 'Ganha' : 'Perdida',
                profit: isBetWon ? (stakeAmount * bet.odd) - stakeAmount : -stakeAmount,
            };
        });
        
        const fixtureIdsRequested = pendingBets.map(b => b.fixtureId);
        const fixtureIdsResolved = resolvedFixtures.map(f => f.fixture.id);

        updatedBets = updatedBets.map(bet => {
            if (bet.result === 'Pendente' && fixtureIdsRequested.includes(bet.fixtureId) && !fixtureIdsResolved.includes(bet.fixtureId)) {
                return { ...bet, result: 'Erro' };
            }
            return bet;
        });

        handleSetData({ bets: updatedBets });
    } catch (err) {
        alert(`Erro ao resolver apostas: ${err.message}`);
    }
  };

  if (loadingAuth) {
    return <div className="bg-gray-900 min-h-screen flex items-center justify-center text-white">A carregar...</div>;
  }

  return (
      <div className="bg-gray-900 text-white min-h-screen font-sans p-4 sm:p-6 lg:p-8">
        {currentUser ? (
          <>
            <header className="flex justify-between items-center mb-4">
                <div className="flex-1"></div>
                <NavBar activePage={activePage} setActivePage={setActivePage} />
                <div className="flex-1 flex justify-end items-center space-x-4">
                    <NotificationPanel notifications={notifications} />
                    <span className="text-sm text-gray-400 hidden md:block">{currentUser.email}</span>
                    <button onClick={() => signOut(auth)} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded-md">Sair</button>
                </div>
            </header>
            <main>
              {activePage === 'deepAnalysis' && <DeepAnalysisPage onRegisterBet={handleAddBet} />}
              {activePage === 'green' && <GreenAnalysisPage />}
              {activePage === 'hunter' && <MultipleBuilderPage />}
              {activePage === 'stats' && <StatsCenterPage />}
              {activePage === 'live' && <LiveAnalysisPage />}
              {activePage === 'tracker' && <BetTrackerPage bets={bets} bankroll={bankroll} setBankroll={handleSetBankroll} onResolveBets={handleResolveBets} onDeleteBet={handleDeleteBet} setActivePage={setActivePage} />}
              {activePage === 'alerts' && <AlertsPage alerts={alerts} setAlerts={handleSetAlerts} />}
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