import React, { useState, useEffect } from 'react';
import { useAnalysisEngine } from '../hooks/useAnalysisEngine';
import BacktestResults from '../components/BacktestResults.jsx';

const RULE_OPTIONS = {
    market: ['Resultado Final', 'Dupla Chance', 'Total de Golos 2.5', 'Ambas Marcam'],
    outcome: {
        'Resultado Final': ['Casa', 'Empate', 'Visitante'],
        'Dupla Chance': ['Casa ou Empate', 'Visitante ou Empate', 'Casa ou Visitante'],
        'Total de Golos 2.5': ['Mais de 2.5', 'Menos de 2.5'],
        'Ambas Marcam': ['Sim', 'Não'],
    },
    metric: ['Odd', 'Valor (EV)', 'Probabilidade'],
    operator: ['>', '<', '>=', '<=', '='],
};

const AlertCard = ({ alert, onToggle, onDelete, onBacktest }) => (
    <div className="bg-gray-700/50 p-4 rounded-lg flex items-center justify-between flex-wrap gap-4">
        <div>
            <p className="font-bold text-white">{alert.name}</p>
            <p className="text-sm text-gray-400 font-mono">{alert.rules}</p>
        </div>
        <div className="flex items-center space-x-4">
            <button
                onClick={() => onBacktest(alert)}
                className="px-3 py-1 text-xs font-medium rounded-full bg-cyan-800 text-cyan-300 hover:bg-cyan-700"
            >
                Backtest
            </button>
            <button
                onClick={() => onToggle(alert.id)}
                className={`px-3 py-1 text-xs font-medium rounded-full ${alert.active ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'}`}
            >
                {alert.active ? 'Ativo' : 'Inativo'}
            </button>
            <button onClick={() => onDelete(alert.id)} className="text-red-500 hover:text-red-400 text-xl">
                🗑️
            </button>
        </div>
    </div>
);


export default function AlertsPage({ alerts, setAlerts }) {
    const { loading: engineLoading, error: engineError, apiFetch, runBacktest } = useAnalysisEngine();
    
    const [newAlertName, setNewAlertName] = useState('');
    const [rules, setRules] = useState([
        { market: 'Resultado Final', outcome: 'Casa', metric: 'Valor (EV)', operator: '>', value: 10 }
    ]);
    const [isBacktestModalOpen, setIsBacktestModalOpen] = useState(false);
    const [backtestResults, setBacktestResults] = useState(null);
    const [currentAlert, setCurrentAlert] = useState(null);
    const [loadingBacktest, setLoadingBacktest] = useState(false);
    const [leagues, setLeagues] = useState([]);

    useEffect(() => {
        const fetchLeaguesForSelect = async () => {
            const data = await apiFetch('v3/leagues?season=' + new Date().getFullYear());
            if (data) {
                const sortedLeagues = data.sort((a, b) => a.country.name.localeCompare(b.country.name) || a.league.name.localeCompare(b.league.name));
                setLeagues(sortedLeagues);
            }
        };
        fetchLeaguesForSelect();
    }, [apiFetch]);

    const handleAddRule = () => {
        setRules([...rules, { market: 'Resultado Final', outcome: 'Casa', metric: 'Valor (EV)', operator: '>', value: 10 }]);
    };
    const handleRuleChange = (index, field, value) => {
        const newRules = [...rules];
        newRules[index][field] = value;
        if (field === 'market') {
            newRules[index]['outcome'] = RULE_OPTIONS.outcome[value][0];
        }
        setRules(newRules);
    };
    const handleRemoveRule = (index) => {
        setRules(rules.filter((_, i) => i !== index));
    };
    const handleSaveAlert = () => {
        if (!newAlertName) { alert("Por favor, dê um nome ao seu alerta."); return; }
        const rulesText = rules.map(r => `${r.outcome} ${r.metric} ${r.operator} ${r.value}`).join(' E ');
        const newAlert = { id: Date.now(), name: newAlertName, rules: rulesText, ruleData: rules, active: true };
        setAlerts(prevAlerts => [...prevAlerts, newAlert]);
        setNewAlertName('');
        setRules([{ market: 'Resultado Final', outcome: 'Casa', metric: 'Valor (EV)', operator: '>', value: 10 }]);
    };
    const handleToggleAlert = (id) => {
        setAlerts(alerts.map(alert => alert.id === id ? { ...alert, active: !alert.active } : alert));
    };
    const handleDeleteAlert = (id) => {
        if (window.confirm("Tem a certeza de que quer apagar este alerta?")) {
            setAlerts(alerts.filter(alert => alert.id !== id));
        }
    };

    const handleOpenBacktestModal = (alert) => {
        setCurrentAlert(alert);
        setIsBacktestModalOpen(true);
        setBacktestResults(null); // Limpa resultados antigos ao abrir
    };

    const handleRunBacktest = async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const leagueId = formData.get('leagueId');
        const startDate = formData.get('startDate');
        const endDate = formData.get('endDate');

        if (!currentAlert || !leagueId) return;
        
        setLoadingBacktest(true);
        const results = await runBacktest(currentAlert, startDate, endDate, leagueId);
        setBacktestResults(results);
        setLoadingBacktest(false);
    };
    
    return (
        <div className="max-w-7xl mx-auto">
            {isBacktestModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
                     <div className="bg-gray-800 rounded-xl shadow-2xl border border-cyan-500/50 w-full max-w-lg">
                        <div className="p-6 border-b border-gray-700">
                             <h2 className="text-xl font-bold text-cyan-400">Configurar Backtest</h2>
                             <p className="text-sm text-gray-400">Teste o alerta "{currentAlert?.name}" em dados históricos.</p>
                        </div>
                        <form onSubmit={handleRunBacktest} className="p-6 space-y-4">
                             <div>
                                <label htmlFor="leagueId" className="block text-sm font-medium text-gray-300 mb-1">Liga</label>
                                <select name="leagueId" id="leagueId" required className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2">
                                    <option value="">Selecione uma liga</option>
                                    {leagues.map(l => <option key={l.league.id} value={l.league.id}>{l.country.name} - {l.league.name}</option>)}
                                </select>
                            </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-300 mb-1">Data de Início</label>
                                    <input type="date" name="startDate" id="startDate" defaultValue={new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().slice(0, 10)} required className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" />
                                </div>
                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-300 mb-1">Data de Fim</label>
                                    <input type="date" name="endDate" id="endDate" defaultValue={new Date().toISOString().slice(0, 10)} required className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2" />
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 pt-4">
                                <button type="button" onClick={() => setIsBacktestModalOpen(false)} className="bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                                <button type="submit" disabled={loadingBacktest} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50">
                                    {loadingBacktest ? "A Analisar..." : "Executar Teste"}
                                </button>
                            </div>
                        </form>
                        {loadingBacktest && <div className="p-6 text-center text-emerald-400">Analisando jogos...</div>}
                        {backtestResults && <BacktestResults results={backtestResults} alertName={currentAlert?.name} onClose={() => setBacktestResults(null)} />}
                     </div>
                </div>
            )}
            
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-emerald-400">Sistema de Alertas</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">Crie regras, seja notificado e teste suas estratégias com dados históricos.</p>
            </header>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Criar Novo Alerta</h2>
                <div className="space-y-4">
                    <input type="text" placeholder="Nome do Alerta (ex: Caçador de Underdogs)" value={newAlertName} onChange={(e) => setNewAlertName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2"/>
                    {rules.map((rule, index) => (
                        <div key={index} className="flex flex-wrap items-center gap-2 bg-gray-700/50 p-3 rounded-lg">
                            <span className="font-bold text-gray-400">{index === 0 ? 'SE' : 'E'}</span>
                            <select value={rule.market} onChange={(e) => handleRuleChange(index, 'market', e.target.value)} className="bg-gray-600 rounded p-1">
                                {RULE_OPTIONS.market.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <select value={rule.outcome} onChange={(e) => handleRuleChange(index, 'outcome', e.target.value)} className="bg-gray-600 rounded p-1">
                                {RULE_OPTIONS.outcome[rule.market].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <select value={rule.metric} onChange={(e) => handleRuleChange(index, 'metric', e.target.value)} className="bg-gray-600 rounded p-1">
                                {RULE_OPTIONS.metric.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <select value={rule.operator} onChange={(e) => handleRuleChange(index, 'operator', e.target.value)} className="bg-gray-600 rounded p-1">
                                {RULE_OPTIONS.operator.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                            <input type="number" value={rule.value} onChange={(e) => handleRuleChange(index, 'value', parseFloat(e.target.value))} className="bg-gray-600 rounded p-1 w-20"/>
                            {rules.length > 1 && (
                                <button onClick={() => handleRemoveRule(index)} className="text-red-500 hover:text-red-400 ml-auto text-lg">&times;</button>
                            )}
                        </div>
                    ))}
                    <div className="flex justify-between items-center">
                        <button onClick={handleAddRule} className="text-sm text-emerald-400 hover:text-emerald-300">+ Adicionar Condição</button>
                        <button onClick={handleSaveAlert} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-lg">Guardar Alerta</button>
                    </div>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                 <h2 className="text-2xl font-bold text-white mb-4">Meus Alertas</h2>
                 <div className="space-y-4">
                    {(engineError) && <div className="bg-red-500/20 text-red-300 p-3 rounded-md mb-8">{engineError}</div>}
                    {alerts.map(alert => (
                        <AlertCard key={alert.id} alert={alert} onToggle={handleToggleAlert} onDelete={handleDeleteAlert} onBacktest={handleOpenBacktestModal}/>
                    ))}
                    {alerts.length === 0 && (
                        <p className="text-center text-gray-500 py-8">Você ainda não criou nenhum alerta.</p>
                    )}
                 </div>
            </div>
        </div>
    );
}