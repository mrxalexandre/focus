import React, { useState, useEffect, useMemo } from 'react';
import { Send, Bot, Database, Loader2, Calendar } from 'lucide-react';
import { EngineResponse, User, Child } from '../types.ts';
import { RecordsTimeline } from './RecordsTimeline.tsx';
import { getAccessToken } from '../firebase.ts';

interface ClinicaFormProps {
  user: User;
  child?: Child;
}

export function ClinicaForm({ user, child }: ClinicaFormProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<EngineResponse | null>(null);
  const [inputData, setInputData] = useState('');
  
  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  const fetchRecords = () => {
      setLoadingRecords(true);
      fetch(`/api/records?childId=${child?.id}`)
        .then(res => res.json())
        .then(data => data.filter((r: any) => r.userId === user.id || (r.data?.Profissional && r.data.Profissional === user.name)))
        .then(data => data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()))
        .then(setRecords)
        .catch(console.error)
        .finally(() => setLoadingRecords(false));
  };

  useEffect(() => {
      if (activeTab === 'history') {
          fetchRecords();
      }
  }, [activeTab, child]);

  const filteredRecords = useMemo(() => {
     if (!filterDate) return records;
     return records.filter(r => new Date(r.date).toISOString().split('T')[0] === filterDate);
  }, [records, filterDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputData.trim()) return;
    
    setLoading(true);
    setResponse(null);

    const dataHora = new Date().toLocaleString('pt-BR');
    const autoContext = `CONTEXTO AUTOMÁTICO DO SISTEMA (Não ignorar):\nPaciente: ${child?.name || 'Não atribuído'}\nProfissional: ${user.name}\nEspecialidade: ${user.role}\nData/Hora: ${dataHora}\n\nRELATO DA SESSÃO:\n${inputData}`;

    try {
      const gToken = await getAccessToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (gToken) {
          headers['Authorization'] = `Bearer ${gToken}`;
      }

      const res = await fetch('/api/engine', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          intent: 'SALVAR_CLINICA',
          inputData: autoContext,
          childId: child?.id,
          childName: child?.name,
          userId: user.id,
          userName: user.name
        })
      });
      const content = await res.json();
      setResponse(content);
      if (!content.error) setInputData('');
    } catch (err: any) {
      setResponse({ error: err.message || 'Erro de conexão' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex px-1 bg-slate-100 rounded-xl w-fit p-1">
          <button 
              onClick={() => setActiveTab('form')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'form' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
              Novo Registro
          </button>
          <button 
              onClick={() => setActiveTab('history')}
              className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
              Meus Registros
          </button>
      </div>

      {activeTab === 'form' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">Registro Clínico Livre</h2>
        <p className="text-slate-500 text-sm mb-6">
          Escreva o resumo da sessão. O sistema já identifica automaticamente quem você é e com qual criança está trabalhando.
        </p>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Paciente</span>
              <span className="font-medium text-slate-800">{child?.name || 'Não atribuído'}</span>
            </div>
            <div>
              <span className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Profissional</span>
              <span className="font-medium text-slate-800">{user.name} <span className="text-slate-500 font-normal">({user.role})</span></span>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descreva o seu atendimento
            </label>
            <textarea
              className="w-full h-48 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none transition-shadow text-slate-700"
              placeholder="Ex: Hoje apliquei atividades de regulação emocional. Ele chegou irritado, mas conseguimos contornar..."
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading || !inputData.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-2.5 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {loading ? 'Processando...' : 'Processar e Salvar'}
          </button>
        </form>
      </div>

      <div className="lg:col-span-4 bg-indigo-900 rounded-3xl p-8 flex flex-col shadow-xl font-sans">
        <div className="mb-8">
          <span className="px-3 py-1 bg-indigo-800 text-indigo-300 text-[10px] font-bold rounded-full uppercase tracking-widest flex items-center w-fit gap-2">
            <Bot className="w-3 h-3" /> AI Generated
          </span>
          <h3 className="text-white text-2xl font-bold mt-4 leading-tight">Output da IA</h3>
        </div>
        
        <div className="flex-1 overflow-auto rounded-2xl bg-white/10 p-6 backdrop-blur-sm border border-white/10 text-indigo-100 text-sm">
          {loading ? (
            <div className="flex items-center gap-3 italic">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
              Analisando a entrada textual...
            </div>
          ) : response ? (
             <div className="space-y-4">
               {response.error && (
                 <div className="text-red-300 bg-red-900/30 p-3 rounded-xl border border-red-800/50">
                   <strong>Erro retornado:</strong> {response.error}
                 </div>
               )}
               {response.data && (
                 <div>
                   <div className="flex items-center gap-2 text-green-300 mb-3 text-xs font-semibold uppercase tracking-wider">
                     <Database className="w-4 h-4" />
                     Salvo na planilha com sucesso
                   </div>
                   <pre className="text-indigo-50 font-mono text-xs overflow-x-auto p-4 bg-black/20 rounded-xl">{JSON.stringify(response.data, null, 2)}</pre>
                 </div>
               )}
             </div>
          ) : (
            <div className="text-indigo-300/70 italic text-center mt-10">Nenhum dado processado ainda. Aguardando input.</div>
          )}
        </div>
      </div>
      </div>
      ) : (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-slate-800">Meus Registros</h2>
                    <p className="text-sm text-slate-500 mt-1">Histórico de evoluções inseridas por você para {child?.name}.</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <input 
                        type="date" 
                        value={filterDate}
                        onChange={e => setFilterDate(e.target.value)}
                        className="bg-transparent border-none text-sm font-medium text-slate-700 outline-none"
                    />
                    {filterDate && (
                        <button onClick={() => setFilterDate('')} className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold px-2">Limpar</button>
                    )}
                </div>
            </div>
            
            <RecordsTimeline 
                records={filteredRecords}
                loading={loadingRecords}
                emptyMessage={`Nenhum registro encontrado para ${child?.name} feito por você. ${filterDate ? 'Tente limpar os filtros.' : ''}`}
            />
        </div>
      )}
    </div>
  );
}
