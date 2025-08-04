import React, { useState } from 'react';

// --- Opções para o Formulário ---
const RULE_OPTIONS = {
    market: ['1X2', 'Dupla Chance', 'Golos +/- 2.5', 'Ambas Marcam'],
    outcome: {
        '1X2': ['Casa (1)', 'Empate (X)', 'Visitante (2)'],
        'Dupla Chance': ['Casa ou Empate (1X)', 'Empate ou Visitante (X2)', 'Casa ou Visitante (12)'],
        'Golos +/- 2.5': ['Mais de 2.5', 'Menos de 2.5'],
        'Ambas Marcam': ['Sim', 'Não'],
    },
    metric: ['Odd', 'Valor (EV)', 'Kelly Stake', 'Probabilidade'],
    operator: ['>', '<', '>=', '<=', '='],
};

export default function AlertsPage({ alerts, setAlerts }) {
    const [newAlertName, setNewAlertName] = useState('');
    const [rules, setRules] = useState([
        { market: '1X2', outcome: 'Casa (1)', metric: 'Valor (EV)', operator: '>', value: 10 }
    ]);

    const handleAddRule = () => {
        setRules([...rules, { market: '1X2', outcome: 'Casa (1)', metric: 'Valor (EV)', operator: '>', value: 10 }]);
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
        const newRules = rules.filter((_, i) => i !== index);
        setRules(newRules);
    };

    const handleSaveAlert = () => {
        if (!newAlertName) {
            alert("Por favor, dê um nome ao seu alerta.");
            return;
        }

        const rulesText = rules.map(r => `${r.outcome} ${r.metric} ${r.operator} ${r.value}`).join(' E ');

        const newAlert = {
            id: Date.now(),
            name: newAlertName,
            rules: rulesText,
            ruleData: rules,
            active: true,
        };

        setAlerts(prevAlerts => [...prevAlerts, newAlert]);

        setNewAlertName('');
        setRules([{ market: '1X2', outcome: 'Casa (1)', metric: 'Valor (EV)', operator: '>', value: 10 }]);
    };

    const handleToggleAlert = (id) => {
        setAlerts(alerts.map(alert => 
            alert.id === id ? { ...alert, active: !alert.active } : alert
        ));
    };

    const handleDeleteAlert = (id) => {
        if (window.confirm("Tem a certeza de que quer apagar este alerta?")) {
            setAlerts(alerts.filter(alert => alert.id !== id));
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            <header className="text-center mb-8">
                <h1 className="text-4xl font-bold text-emerald-400">Sistema de Alertas</h1>
                <p className="text-gray-400 mt-2 max-w-2xl mx-auto">
                    Crie regras personalizadas e seja notificado quando o "Caçador de Odds" encontrar uma oportunidade que corresponda aos seus critérios.
                </p>
            </header>

            <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
                <h2 className="text-2xl font-bold text-white mb-4">Criar Novo Alerta</h2>
                <div className="space-y-4">
                    <input
                        type="text"
                        placeholder="Nome do Alerta (ex: Caçador de Underdogs)"
                        value={newAlertName}
                        onChange={(e) => setNewAlertName(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-md p-2"
                    />
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
                            <input
                                type="number"
                                value={rule.value}
                                onChange={(e) => handleRuleChange(index, 'value', parseFloat(e.target.value))}
                                className="bg-gray-600 rounded p-1 w-20"
                            />
                            {rules.length > 1 && (
                                <button onClick={() => handleRemoveRule(index)} className="text-red-500 hover:text-red-400 ml-auto text-lg">
                                    &times;
                                </button>
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
                    {alerts.map(alert => (
                        <div key={alert.id} className="bg-gray-700/50 p-4 rounded-lg flex items-center justify-between flex-wrap gap-4">
                            <div>
                                <p className="font-bold text-white">{alert.name}</p>
                                <p className="text-sm text-gray-400 font-mono">{alert.rules}</p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <button 
                                    onClick={() => handleToggleAlert(alert.id)}
                                    className={`px-3 py-1 text-xs font-medium rounded-full ${
                                        alert.active ? 'bg-green-900 text-green-300' : 'bg-gray-600 text-gray-300'
                                    }`}
                                >
                                    {alert.active ? 'Ativo' : 'Inativo'}
                                </button>
                                <button onClick={() => handleDeleteAlert(alert.id)} className="text-red-500 hover:text-red-400 text-xl">
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                    {alerts.length === 0 && (
                        <p className="text-center text-gray-500 py-8">Você ainda não criou nenhum alerta.</p>
                    )}
                 </div>
            </div>
        </div>
    );
}
