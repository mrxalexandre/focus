import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Loader2, LayoutDashboard, Table as TableIcon, Filter, Download, Trash2 } from 'lucide-react';
import { User, Child } from '../types.ts';

interface DashboardProps {
    currentUser: User;
}

export function Dashboard({ currentUser }: DashboardProps) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterProf, setFilterProf] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const availableProfessionals = useMemo(() => {
    const profs = new Set<string>();
    records.forEach(r => {
        const p = r.type === 'SALVAR_CLINICA' ? (r.data?.Profissional || 'Clínica') : 'Professora';
        if (p) profs.add(p);
    });
    return Array.from(profs).sort();
  }, [records]);

  const mapSchoolCodeToScore = (code: string) => {
    if (!code) return 0;
    const codeStr = String(code).split(' ')[0].toUpperCase();
    if (['DR', 'AD', 'AT', 'AG', 'C', 'MH'].includes(codeStr)) return 4;
    if (['MD', 'MT', 'AL', 'OL', 'CP', 'DA'].includes(codeStr)) return 3;
    if (['MC', 'R', 'NF', 'NA', 'AO'].includes(codeStr)) return 2;
    if (['NC', 'DP', 'DI', 'M', 'AI'].includes(codeStr)) return 1;
    return 0;
  };
  const [viewMode, setViewMode] = useState<'charts' | 'table'>('charts');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = () => {
    setLoading(true);
    fetch('/api/records')
      .then(res => res.json())
      .then(data => setRecords(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id: string) => {
      if (!confirm('Tem certeza que deseja excluir este registro?')) return;
      try {
          await fetch(`/api/records/${id}`, { method: 'DELETE' });
          fetchRecords();
      } catch (e) {
          console.error(e);
      }
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      let matchProf = true;
      let matchDate = true;
      const profissionalNaClinica = r.data?.Profissional;
      const profissional = r.type === 'SALVAR_CLINICA' ? profissionalNaClinica : 'Professora'; // For school it doesn't always have professional name inside data, we'll just say Professora or check childName
      
      const pName = (profissional || '').toLowerCase();

      if (filterProf && !pName.includes(filterProf.toLowerCase())) {
        matchProf = false;
      }
      
      if (filterDate) {
        const rDate = new Date(r.date).toISOString().split('T')[0];
        if (rDate !== filterDate) {
          matchDate = false;
        }
      }
      
      return matchProf && matchDate;
    });
  }, [records, filterProf, filterDate]);

  const stats = useMemo(() => {
    const byType = {
      Clinica: 0,
      Escola: 0
    };
    const byProf: Record<string, number> = {};

    filteredRecords.forEach(r => {
      if (r.type === 'SALVAR_CLINICA') byType.Clinica++;
      if (r.type === 'SALVAR_ESCOLA') byType.Escola++;

      const prof = r.type === 'SALVAR_CLINICA' ? (r.data?.Profissional || 'Clínica') : 'Escola';
      byProf[prof] = (byProf[prof] || 0) + 1;
    });

    const profData = Object.keys(byProf).map(k => ({ name: k, value: byProf[k] }));

    return { byType: [ {name: 'Clínica', value: byType.Clinica}, {name: 'Escola', value: byType.Escola} ], profData };
  }, [filteredRecords]);

  const schoolMetrics = useMemo(() => {
    const discMap: Record<string, {name: string, items: number, foco: number, concentracao: number, org: number, concluiu: number, humor: number}> = {};
    
    filteredRecords.filter(r => r.type === 'SALVAR_ESCOLA').forEach(r => {
        const arr = Array.isArray(r.data) ? r.data : (r.data?.disciplinas || [r.data]);
        arr.forEach((d: any) => {
            const disc = d.Disciplina || d.disciplina;
            if (!disc) return;
            if (!discMap[disc]) {
                discMap[disc] = { name: disc, items: 0, foco: 0, concentracao: 0, org: 0, concluiu: 0, humor: 0 };
            }
            const codigos = d.Codigos || d.codigos || d;
            
            discMap[disc].items++;
            discMap[disc].foco += mapSchoolCodeToScore(codigos.Foco || codigos.foco);
            discMap[disc].concentracao += mapSchoolCodeToScore(codigos.Tempo || codigos.tempo || codigos.Concentracao || codigos.concentracao);
            discMap[disc].org += mapSchoolCodeToScore(codigos.Org || codigos.org || codigos.Organizacao || codigos.organizacao);
            discMap[disc].concluiu += mapSchoolCodeToScore(codigos.Concluiu || codigos.concluiu || codigos.Conclusao || codigos.conclusao);
            discMap[disc].humor += mapSchoolCodeToScore(codigos.Humor || codigos.humor);
        });
    });
    
    return Object.values(discMap).map(d => ({
        name: d.name,
        Foco: d.items > 0 ? Number((d.foco / d.items).toFixed(1)) : 0,
        Concentração: d.items > 0 ? Number((d.concentracao / d.items).toFixed(1)) : 0,
        Organização: d.items > 0 ? Number((d.org / d.items).toFixed(1)) : 0,
        Conclusão: d.items > 0 ? Number((d.concluiu / d.items).toFixed(1)) : 0,
        Humor: d.items > 0 ? Number((d.humor / d.items).toFixed(1)) : 0,
    }));
  }, [filteredRecords]);

  const renderDataGrid = (r: any) => {
      if (r.type === 'SALVAR_CLINICA') {
          return (
              <div className="flex flex-col gap-1 text-xs">
                  {Object.entries(r.data || {}).map(([k, v]) => (
                      k !== 'Profissional' && v ? (
                          <div key={k} className="flex gap-2">
                              <span className="font-semibold text-slate-700 max-w-[120px] truncate" title={k}>{k.replace(/_/g, ' ')}:</span>
                              <span className="text-slate-600 truncate max-w-[200px] xl:max-w-[300px]" title={String(v)}>{String(v)}</span>
                          </div>
                      ) : null
                  ))}
              </div>
          );
      }
      if (r.type === 'SALVAR_ESCOLA') {
          const arr = Array.isArray(r.data) ? r.data : (r.data?.disciplinas || [r.data]);
          return (
              <div className="flex flex-col gap-3">
                  {arr.map((d: any, idx: number) => {
                     const codigos = d.Codigos || d.codigos || d;
                     return (
                       <div key={idx} className="flex flex-col gap-1 border-l-2 border-emerald-200 pl-2">
                          <span className="font-bold text-slate-700 text-xs">{d.Disciplina || d.disciplina || 'Disciplina'}</span>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-2 gap-y-1 text-xs">
                             {codigos && Object.entries(codigos).filter(([k]) => k !== 'Disciplina').map(([k, v]) => (
                                 <div key={k} className="flex gap-1" title={String(v)}>
                                     <span className="font-medium text-slate-500">{k}:</span>
                                     <span className="text-slate-700 whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px]">{String(v).split(' ')[0]}</span>
                                 </div>
                             ))}
                          </div>
                       </div>
                     );
                  })}
              </div>
          );
      }
      return <span className="text-slate-500 text-xs tracking-wide">Dados não estruturados</span>;
  };

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 h-full flex flex-col font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" />
            Dashboard de Atendimentos
          </h2>
          <p className="text-slate-500 text-sm mt-1">Visão geral dos registros multidisciplinares</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('charts')} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'charts' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Gráficos
          </button>
          <button 
            onClick={() => setViewMode('table')} 
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Tabela
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Filtrar por Profissional</label>
          <select 
            value={filterProf} 
            onChange={e => setFilterProf(e.target.value)} 
            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm appearance-none bg-white"
          >
            <option value="">Todos os Profissionais</option>
            {availableProfessionals.map(p => (
                <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Filtrar por Data</label>
          <input 
            type="date" 
            value={filterDate} 
            onChange={e => setFilterDate(e.target.value)} 
            className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-indigo-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {viewMode === 'charts' ? (
            <div className="flex flex-col gap-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-600 mb-6 uppercase tracking-wider text-center">Registros por Origem</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                      <Pie
                        data={stats.byType}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {stats.byType.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-600 mb-6 uppercase tracking-wider text-center">Registros por Profissional</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.profData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {schoolMetrics.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-600 mb-2 uppercase tracking-wider text-center">Média de Desempenho Escolar por Disciplina</h3>
                  <p className="text-xs text-center text-slate-400 mb-6">Escala: 1 (Dificuldade/Atenção) a 4 (Adequado/Esperado)</p>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={schoolMetrics}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                        <YAxis domain={[0, 4]} ticks={[1,2,3,4]} axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                        <Tooltip cursor={{fill: '#f8fafc'}} />
                        <Legend wrapperStyle={{fontSize: 12, paddingTop: 10}} />
                        <Bar dataKey="Foco" fill="#4f46e5" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Concentração" fill="#10b981" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Organização" fill="#f59e0b" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Conclusão" fill="#0ea5e9" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="Humor" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm whitespace-nowrap min-w-max">
                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Criança</th>
                      <th className="px-4 py-3">Origem / Profissional</th>
                      <th className="px-4 py-3">Resumo dos Dados</th>
                      {currentUser.role === 'admin' && <th className="px-4 py-3 text-right">Ações</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={currentUser.role === 'admin' ? 5 : 4} className="px-4 py-8 text-center text-slate-400">Nenhum registro encontrado com os filtros atuais.</td>
                      </tr>
                    ) : filteredRecords.map(r => (
                      <tr key={r.id}>
                        <td className="px-4 py-3">{new Date(r.date).toLocaleDateString('pt-BR')}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{r.childName || 'N/A'}</td>
                        <td className="px-4 py-3 text-xs">
                          <span className={`px-2 py-1 rounded inline-block font-bold mb-1 mr-2 ${r.type === 'SALVAR_CLINICA' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {r.type === 'SALVAR_CLINICA' ? 'Clínica' : 'Escola'}
                          </span>
                          {r.data?.Profissional && <span className="text-slate-500">{r.data.Profissional}</span>}
                        </td>
                        <td className="px-4 py-3 align-top min-w-[250px] w-full max-w-lg">
                          {renderDataGrid(r)}
                        </td>
                        {currentUser.role === 'admin' && (
                            <td className="px-4 py-3 text-right">
                                <button 
                                    onClick={() => handleDelete(r.id)}
                                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Excluir Registro"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
