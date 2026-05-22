import React from 'react';
import { Bot, FileText, Loader2 } from 'lucide-react';

interface RecordsTimelineProps {
  records: any[];
  loading: boolean;
  emptyMessage: string;
}

export function RecordsTimeline({ records, loading, emptyMessage }: RecordsTimelineProps) {
  const renderData = (r: any) => {
    if (r.type === 'SALVAR_CLINICA') {
        const text = r.data?.Resumo_Sessao || r.data?.Resumo || r.data?.resumo || JSON.stringify(r.data, null, 2);
        return (
            <div className="text-sm text-slate-700 bg-white p-5 rounded-xl border border-slate-200 shadow-sm whitespace-pre-wrap leading-relaxed mt-4">
                {(r.data?.Profissional || r.data?.Especialidade) && (
                    <div className="font-semibold text-slate-900 mb-3 pb-3 border-b border-slate-100">
                        {r.data?.Profissional} <span className="text-slate-500 font-normal">({r.data?.Especialidade})</span>
                    </div>
                )}
                {text}
            </div>
        );
    }
    
    if (r.type === 'SALVAR_ESCOLA') {
        const arr = Array.isArray(r.data) ? r.data : (r.data?.disciplinas || [r.data]);
        return (
            <div className="grid grid-cols-1 gap-4 mt-4">
                {arr.map((d: any, idx: number) => {
                   if (!d || typeof d !== 'object') return <pre key={idx} className="text-xs bg-white p-3 rounded-xl border border-slate-200">{JSON.stringify(d)}</pre>;
                   const codigos = d.Codigos || d.codigos || d;
                   return (
                     <div key={idx} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm text-sm">
                       {d.Disciplina && <strong className="block text-indigo-900 font-bold mb-3 pb-2 border-b border-slate-100">{d.Disciplina}</strong>}
                       <ul className="grid grid-cols-1 gap-y-2 gap-x-4 text-slate-600 mt-2">
                         {codigos && Object.entries(codigos).map(([k, v]) => {
                            if (typeof v === 'object') return null;
                            return (
                                <li key={k} className="flex justify-between items-center border-b border-slate-50 pb-1 last:border-0 last:pb-0">
                                    <span className="font-medium text-slate-500 capitalize">{k.replace(/_/g, ' ')}:</span> 
                                    <span className="text-slate-900 font-semibold">{String(v)}</span>
                                </li>
                            )
                         })}
                       </ul>
                     </div>
                   );
                })}
            </div>
        );
    }

    return <pre className="text-xs bg-white p-4 rounded-xl border border-slate-200 overflow-x-auto mt-4">{JSON.stringify(r.data, null, 2)}</pre>;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-indigo-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm font-medium animate-pulse">Carregando histórico...</span>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="text-center py-20 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center gap-4">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center">
          <FileText className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-slate-500 font-medium">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-200">
      {records.map((r, i) => (
        <div key={r.id} className="relative flex items-start justify-between md:justify-normal md:odd:flex-row-reverse group">
          <div className="flex items-center justify-center w-10 h-10 mt-1 rounded-full border-4 border-white bg-indigo-100 text-indigo-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
            {r.type === 'SALVAR_CLINICA' ? <Bot className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          </div>
          <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-slate-50 border border-slate-200 p-6 rounded-2xl shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-2">
              <span className="inline-flex w-fit items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-white border border-slate-200 text-slate-600">
                {r.type === 'SALVAR_CLINICA' ? 'Reg. Clínico' : 'Reg. Escolar'}
              </span>
              <time className="text-xs font-semibold text-slate-400">
                {new Date(r.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </time>
            </div>
            {renderData(r)}
          </div>
        </div>
      ))}
    </div>
  );
}
