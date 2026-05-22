import React, { useState, useEffect } from 'react';
import { User, Child, TDAHRole } from '../types.ts';
import { Plus, Users, Baby, ShieldAlert, Database, Save, CheckCircle } from 'lucide-react';
import { getAccessToken } from '../firebase.ts';

interface AdminPanelProps {
  users: User[];
  children: Child[];
  onAddUser: (user: User) => void;
  onAddChild: (child: Child) => void;
  onUpdateUsers: (users: User[]) => void;
}

export function AdminPanel({ users, children, onAddUser, onAddChild, onUpdateUsers }: AdminPanelProps) {
  const [newChildName, setNewChildName] = useState('');
  
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    role: 'psicologa' as TDAHRole,
    childId: '',
    canViewDashboard: false
  });

  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
     fetch('/api/settings')
       .then(res => res.json())
       .then(data => {
           if (data.spreadsheetId) setSpreadsheetId(data.spreadsheetId);
       })
       .catch(console.error);
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
      e.preventDefault();
      setSavingSettings(true);
      try {
          await fetch('/api/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ spreadsheetId })
          });
          setSettingsSaved(true);
          setTimeout(() => setSettingsSaved(false), 3000);
      } catch (err) {
          console.error(err);
      } finally {
          setSavingSettings(false);
      }
  };

  const handleAddChild = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildName.trim()) return;
    
    const child: Child = {
      id: Math.random().toString(36).substr(2, 9),
      name: newChildName
    };
    onAddChild(child);
    setNewChildName('');
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username.trim() || !newUser.name.trim()) return;

    if (newUser.role !== 'admin' && !newUser.childId) {
      alert('Selecione uma criança para vincular ao profissional ou familiar.');
      return;
    }

    const user: User = {
      id: Math.random().toString(36).substr(2, 9),
      username: newUser.username.trim().toLowerCase(),
      name: newUser.name,
      role: newUser.role,
      childId: newUser.role === 'admin' ? undefined : newUser.childId,
      canViewDashboard: newUser.role === 'admin' ? true : newUser.canViewDashboard
    };

    onAddUser(user);
    setNewUser({ username: '', name: '', role: 'psicologa', childId: '', canViewDashboard: false });
  };

  const toggleDashboardAccess = (userId: string, currentAccess: boolean) => {
      const updatedUsers = users.map(u => u.id === userId ? { ...u, canViewDashboard: !currentAccess } : u);
      onUpdateUsers(updatedUsers);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 font-sans">
      <div className="lg:col-span-8 flex flex-col gap-8">
        
        {/* Google Sheets Config */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
               <h2 className="text-xl font-bold text-slate-800">Integração com Google Sheets</h2>
               <p className="text-sm text-slate-500">Configure a planilha onde <strong>todos</strong> os registros serão exportados em tempo real.</p>
            </div>
          </div>
          
          <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">ID da Planilha (Spreadsheet ID)</label>
              <input
                type="text"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-mono text-sm"
                placeholder="Ex: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              />
              <p className="text-xs text-slate-400 mt-2">Dica: Extraia o ID da URL da planilha. Importante certificar-se de ter conectado com o Google no Menu lateral.</p>
            </div>
            <div className="flex justify-end">
                <button
                type="submit"
                disabled={savingSettings}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold rounded-xl flex items-center gap-2 transition-colors w-fit"
                >
                {settingsSaved ? <><CheckCircle className="w-4 h-4" /> Salvo</> : <><Save className="w-4 h-4" /> Salvar Configuração</>}
                </button>
            </div>
          </form>
        </section>

        {/* Child Registration */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Baby className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Cadastrar Nova Criança</h2>
          </div>
          
          <form onSubmit={handleAddChild} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nome Completo</label>
              <input
                type="text"
                value={newChildName}
                onChange={(e) => setNewChildName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                placeholder="Ex: Enzo Gabriel Pereira"
              />
            </div>
            <button
              type="submit"
              disabled={!newChildName.trim()}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold rounded-xl flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" /> Adicionar
            </button>
          </form>

          {children.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">Crianças Cadastradas</h3>
              <div className="flex flex-wrap gap-3">
                {children.map(c => (
                  <div key={c.id} className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-lg text-sm font-medium">
                    {c.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* User Registration */}
        <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Cadastrar Profissional / Familiar</h2>
          </div>
          
          <form onSubmit={handleAddUser} className="space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nome de Usuário (Login)</label>
                <input
                  type="text"
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Ex: ana.psicologa"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Nome Completo de Exibição</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="Ex: Dra. Ana Silva"
                />
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Especialidade / Papel</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value as TDAHRole})}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer appearance-none"
                >
                  <option value="psicologa">Psicóloga</option>
                  <option value="psicopedagoga">Psicopedagoga</option>
                  <option value="fonoaudiologa">Fonoaudióloga</option>
                  <option value="professora">Professora</option>
                  <option value="pais">Pais / Responsável</option>
                  <option value="admin">Administrador do Sistema</option>
                </select>
             </div>

             {newUser.role !== 'admin' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Criança Vinculada</label>
                    <select
                      value={newUser.childId}
                      onChange={(e) => setNewUser({...newUser, childId: e.target.value})}
                      className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer appearance-none ${!newUser.childId ? 'border-red-300 ring-1 ring-red-100' : 'border-slate-200'}`}
                    >
                      <option value="" disabled>Selecione uma criança...</option>
                      {children.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                    {children.length === 0 && (
                       <p className="text-xs text-red-500 mt-2 font-medium">Cadastre uma criança primeiro.</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-4">
                     <input 
                        type="checkbox" 
                        id="canViewDashboard"
                        checked={newUser.canViewDashboard}
                        onChange={(e) => setNewUser({...newUser, canViewDashboard: e.target.checked})}
                        className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                     />
                     <label htmlFor="canViewDashboard" className="text-sm font-medium text-slate-700 cursor-pointer">
                        Permitir visualizar Dashboard de Métricas
                     </label>
                  </div>
                </div>
             )}
           </div>

            <button
              type="submit"
              disabled={!newUser.username.trim() || !newUser.name.trim() || (newUser.role !== 'admin' && !newUser.childId)}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" /> Cadastrar Usuário
            </button>
          </form>
        </section>

      </div>

      <div className="lg:col-span-4 bg-slate-900 rounded-3xl p-8 flex flex-col shadow-xl">
        <div className="mb-8 flex flex-col gap-4">
          <div>
            <span className="px-3 py-1 bg-slate-800 text-indigo-400 text-[10px] font-bold rounded-full uppercase tracking-widest flex items-center w-fit gap-2">
              <ShieldAlert className="w-3 h-3" /> System Admin
            </span>
            <h3 className="text-white text-2xl font-bold mt-4 leading-tight">Diretório de Acessos</h3>
          </div>
          
          <a
            href="/api/export"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 px-4 py-3 rounded-xl text-sm font-semibold transition-colors border border-emerald-500/30 w-full"
          >
             Baixar Planilha Completa (CSV)
          </a>
        </div>
        
        <div className="flex-1 overflow-auto space-y-4">
          {users.map(u => {
             const linkedChild = children.find(c => c.id === u.childId);
             return (
               <div key={u.id} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/5 flex flex-col gap-2">
                 <div className="flex justify-between items-start">
                   <div className="font-semibold text-white">{u.name}</div>
                   <div className="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded bg-indigo-500/30 text-indigo-200">
                     {u.role}
                   </div>
                 </div>
                 <div className="flex items-center gap-2 text-slate-400 text-xs">
                   <span className="bg-black/20 px-2 py-1 rounded font-mono">@{u.username}</span>
                   {linkedChild && <span>• Atende: <strong className="text-slate-200">{linkedChild.name}</strong></span>}
                 </div>
                 
                 {u.role !== 'admin' && (
                     <label className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10 cursor-pointer">
                         <input 
                             type="checkbox"
                             checked={u.canViewDashboard || false}
                             onChange={() => toggleDashboardAccess(u.id, !!u.canViewDashboard)}
                             className="w-3 h-3 rounded"
                         />
                         <span className="text-xs text-indigo-300 font-medium">Dashboard Permitido</span>
                     </label>
                 )}
               </div>
             )
          })}
        </div>
      </div>
    </div>
  );
}
