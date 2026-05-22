import React, { useState, useEffect, useMemo } from 'react';
import { Bot, FileText, Loader2, Database, Table, Calendar } from 'lucide-react';
import { User, Child } from '../types.ts';
import { RecordsTimeline } from './RecordsTimeline.tsx';

interface PaisViewProps {
  user: User;
  child: Child;
}

export function PaisView({ user, child }: PaisViewProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    if (!child) return;
    setLoadingRecords(true);
    fetch(`/api/records?childId=${child.id}`)
      .then(res => res.json())
      .then(data => data.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()))
      .then(data => setRecords(data))
      .catch(err => console.error(err))
      .finally(() => setLoadingRecords(false));
  }, [child]);

  const filteredRecords = useMemo(() => {
     if (!filterDate) return records;
     return records.filter(r => new Date(r.date).toISOString().split('T')[0] === filterDate);
  }, [records, filterDate]);

  return (
    <div className="bg-white p-6 md:p-10 rounded-3xl shadow-sm border border-slate-200 flex flex-col h-full max-w-4xl mx-auto font-sans">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-10 gap-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Acompanhamento Familiar</h2>
          <p className="text-slate-500 text-sm mt-3 leading-relaxed max-w-2xl">
            Olá, <strong>{user.name}</strong>. Estes são os registros unificados do acompanhamento de <strong>{child?.name || 'seu filho(a)'}</strong>.
            Você pode visualizar o histórico amigável nesta tela ou baixar a planilha para visualizar no Excel/Google Sheets.
          </p>
        </div>
        <a
          href={`/api/export?childId=${child?.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 flex items-center justify-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700 px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-sm shadow-emerald-200 hover:shadow-md"
        >
          <Table className="w-5 h-5" />
          Baixar Planilha (CSV)
        </a>
      </div>

      <div className="flex items-center gap-2 mb-8 bg-slate-50 p-3 rounded-xl border border-slate-100 w-fit">
        <Calendar className="w-4 h-4 text-slate-400" />
        <span className="text-sm font-medium text-slate-600">Filtrar por data:</span>
        <input 
          type="date" 
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {filterDate && (
           <button onClick={() => setFilterDate('')} className="text-xs text-indigo-500 hover:text-indigo-700 font-semibold px-2">Limpar</button>
        )}
      </div>

      <div className="flex-1 space-y-6">
        <RecordsTimeline 
            records={filteredRecords} 
            loading={loadingRecords} 
            emptyMessage={`Nenhum registro encontrado para ${child?.name}. ${filterDate ? 'Tente limpar os filtros.' : ''}`}
        />
      </div>
    </div>
  );
}
