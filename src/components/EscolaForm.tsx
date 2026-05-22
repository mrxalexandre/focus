import React, { useState, useEffect, useMemo } from 'react';
import { Send, Bot, Database, Loader2, Plus, Trash2, Calendar } from 'lucide-react';
import { EngineResponse, User, Child } from '../types.ts';
import { RecordsTimeline } from './RecordsTimeline.tsx';

const DISCIPLINAS = ['Portugues', 'Matematica', 'Historia', 'Ciencias', 'Ensaio', 'Educação Física', 'Pratica textual', 'Líder em mim', 'Inglês'];

const OPCOES = {
  concentracao: [
    { value: 'MC', label: 'MC (Muito Curto)' },
    { value: 'MD', label: 'MD (Médio)' },
    { value: 'DR', label: 'DR (Dentro do Registo/Esperado)' },
    { value: 'NC', label: 'NC (Não Concentrou)' }
  ],
  foco: [
    { value: 'R', label: 'R (Reduzido)' },
    { value: 'MT', label: 'MT (Mantido com Esforço)' },
    { value: 'AD', label: 'AD (Adequado)' },
    { value: 'DP', label: 'DP (Disperso)' }
  ],
  espera: [
    { value: 'AT', label: 'AT (Atendeu)' },
    { value: 'AL', label: 'AL (Alta Limitação)' },
    { value: 'DI', label: 'DI (Dificuldade Intensa)' }
  ],
  organizacao: [
    { value: 'M', label: 'M (Mau)' },
    { value: 'OL', label: 'OL (Organizado com Lembrete)' },
    { value: 'NF', label: 'NF (Não Focado)' },
    { value: 'AG', label: 'AG (Adequado ao Grupo)' }
  ],
  conclusao: [
    { value: 'C', label: 'C (Concluída)' },
    { value: 'CP', label: 'CP (Concluída Parcialmente)' },
    { value: 'NA', label: 'NA (Não Apresentou)' },
    { value: 'NC', label: 'NC (Não Concluiu)' }
  ],
  humor: [
    { value: 'MH', label: 'MH (Muito Bom)' },
    { value: 'AO', label: 'AO (Agitado/Ansioso)' },
    { value: 'DA', label: 'DA (Desatento)' },
    { value: 'AI', label: 'AI (Alterado/Irritado)' }
  ]
};

type ChecklistRow = {
  id: string;
  disciplina: string;
  concentracao: string;
  foco: string;
  espera: string;
  organizacao: string;
  conclusao: string;
  humor: string;
  obs: string;
};

interface EscolaFormProps {
  user: User;
  child?: Child;
}

export function EscolaForm({ user, child }: EscolaFormProps) {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<EngineResponse | null>(null);
  
  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  const fetchRecords = () => {
      setLoadingRecords(true);
      fetch(`/api/records?childId=${child?.id}`)
        .then(res => res.json())
        .then(data => data.filter((r: any) => r.userId === user.id || r.type === 'SALVAR_ESCOLA'))
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

  const [rows, setRows] = useState<ChecklistRow[]>(
    DISCIPLINAS.map((d) => ({
      id: d, // Using discipline name as unique ID
      disciplina: d,
      concentracao: OPCOES.concentracao[0].value,
      foco: OPCOES.foco[0].value,
      espera: OPCOES.espera[0].value,
      organizacao: OPCOES.organizacao[0].value,
      conclusao: OPCOES.conclusao[0].value,
      humor: OPCOES.humor[0].value,
      obs: ''
    }))
  );

  const handleChangeRow = (id: string, field: keyof ChecklistRow, value: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rows.length === 0) return;
    
    setLoading(true);
    setResponse(null);

    const formattedData = rows.map(r => `Disciplina: ${r.disciplina}\nTempo: ${r.concentracao}, Foco: ${r.foco}, Espera: ${r.espera}, Org: ${r.organizacao}, Concluiu: ${r.conclusao}, Humor: ${r.humor}\nObs: ${r.obs}`).join('\n\n');

    const dataHora = new Date().toLocaleString('pt-BR');
    const autoContext = `CONTEXTO AUTOMÁTICO DO SISTEMA (Não ignorar):\nPaciente (Aluno): ${child?.name || 'Não atribuído'}\nProfissional: ${user.name} (Professora)\nData/Hora: ${dataHora}\n\nDADOS DA ESCOLA (Códigos/Checklist):\n${formattedData}`;

    try {
      const res = await fetch('/api/engine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent: 'SALVAR_ESCOLA',
          inputData: autoContext,
          childId: child?.id,
          childName: child?.name,
          userId: user.id,
          userName: user.name
        })
      });
      const content = await res.json();
      setResponse(content);
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
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
            <h2 className="text-xl font-semibold mb-4 text-slate-800">Checklist Diário Escolar</h2>
        <p className="text-slate-500 text-sm mb-6">
          Preencha a tabela selecionando as métricas e códigos fornecidos na legenda para o aluno.
        </p>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Aluno</span>
              <span className="font-medium text-slate-800">{child?.name || 'Não atribuído'}</span>
            </div>
            <div>
              <span className="block text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Professora</span>
              <span className="font-medium text-slate-800">{user.name}</span>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-4">
          <div className="flex-1 overflow-x-auto border border-slate-200 rounded-xl mb-4 bg-slate-50">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
              <thead className="bg-slate-100 text-slate-500 font-medium">
                <tr>
                  <th className="px-3 py-2 border-b border-slate-200">Disciplina</th>
                  <th className="px-3 py-2 border-b border-slate-200">Concentração</th>
                  <th className="px-3 py-2 border-b border-slate-200">Foco</th>
                  <th className="px-3 py-2 border-b border-slate-200">Espera</th>
                  <th className="px-3 py-2 border-b border-slate-200">Organização</th>
                  <th className="px-3 py-2 border-b border-slate-200">Conclusão</th>
                  <th className="px-3 py-2 border-b border-slate-200">Humor</th>
                  <th className="px-3 py-2 border-b border-slate-200">Observação</th>
                  <th className="px-3 py-2 border-b border-slate-200"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="p-2 font-medium text-slate-700">
                      {row.disciplina}
                    </td>
                    <td className="p-2">
                      <select value={row.concentracao} onChange={(e) => handleChangeRow(row.id, 'concentracao', e.target.value)} className="w-full p-1.5 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-700 bg-white shadow-sm">
                        {OPCOES.concentracao.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select value={row.foco} onChange={(e) => handleChangeRow(row.id, 'foco', e.target.value)} className="w-full p-1.5 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-700 bg-white shadow-sm">
                        {OPCOES.foco.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select value={row.espera} onChange={(e) => handleChangeRow(row.id, 'espera', e.target.value)} className="w-full p-1.5 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-700 bg-white shadow-sm">
                        {OPCOES.espera.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select value={row.organizacao} onChange={(e) => handleChangeRow(row.id, 'organizacao', e.target.value)} className="w-full p-1.5 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-700 bg-white shadow-sm">
                        {OPCOES.organizacao.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select value={row.conclusao} onChange={(e) => handleChangeRow(row.id, 'conclusao', e.target.value)} className="w-full p-1.5 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-700 bg-white shadow-sm">
                        {OPCOES.conclusao.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <select value={row.humor} onChange={(e) => handleChangeRow(row.id, 'humor', e.target.value)} className="w-full p-1.5 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-indigo-500 text-xs text-slate-700 bg-white shadow-sm">
                        {OPCOES.humor.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </td>
                    <td className="p-2">
                      <input 
                        type="text" 
                        value={row.obs} 
                        onChange={(e) => handleChangeRow(row.id, 'obs', e.target.value)} 
                        placeholder="Opcional..."
                        className="w-32 p-1.5 border border-slate-200 rounded outline-none focus:ring-2 focus:ring-indigo-500 text-xs bg-white shadow-sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="submit"
            disabled={loading || rows.length === 0}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-medium py-2.5 px-4 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors mt-4"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {loading ? 'Validando e Processando...' : 'Validar e Salvar Checklist'}
          </button>
        </form>
      </div>

      <div className="lg:col-span-4 bg-indigo-900 rounded-3xl p-8 flex flex-col shadow-xl font-sans">
        <div className="mb-8">
          <span className="px-3 py-1 bg-indigo-800 text-indigo-300 text-[10px] font-bold rounded-full uppercase tracking-widest flex items-center w-fit gap-2">
            <Bot className="w-3 h-3" /> AI Generated
          </span>
          <h3 className="text-white text-2xl font-bold mt-4 leading-tight">Output da IA (Validação)</h3>
        </div>
        
        <div className="flex-1 overflow-auto rounded-2xl bg-white/10 p-6 backdrop-blur-sm border border-white/10 text-indigo-100 text-sm">
          {loading ? (
            <div className="flex items-center gap-3 italic">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
              Validando os códigos de legenda...
            </div>
          ) : response ? (
             <div className="space-y-4">
               {response.error && (
                 <div className="text-red-300 border border-red-800/50 bg-red-900/30 p-4 rounded-xl">
                   <strong className="block mb-1 text-red-200">Validação da IA (Erro):</strong> {response.error}
                 </div>
               )}
               {response.data && (
                 <div>
                   <div className="flex items-center gap-2 text-green-300 mb-3 text-xs font-semibold uppercase tracking-wider">
                     <Database className="w-4 h-4" />
                     Códigos aceitos e salvos na planilha
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
                    <p className="text-sm text-slate-500 mt-1">Histórico de checklists inseridos por você para {child?.name}.</p>
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
