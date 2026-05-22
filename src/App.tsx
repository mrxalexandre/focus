/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { LogOut, Menu, X, LayoutDashboard, KeyRound, Home as HomeIcon, CheckCircle } from 'lucide-react';
import { TDAHRole, User, Child } from './types.ts';
import { ClinicaForm } from './components/ClinicaForm.tsx';
import { EscolaForm } from './components/EscolaForm.tsx';
import { PaisView } from './components/PaisView.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { Login } from './components/Login.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { initAuth, googleSignIn } from './firebase.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [googleAuthToken, setGoogleAuthToken] = useState<string | null>(null);
  
  const [currentView, setCurrentView] = useState<'main' | 'dashboard'>('main');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => setGoogleAuthToken(token),
      () => setGoogleAuthToken(null)
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const storedUsers = localStorage.getItem('tdah_users');
    const storedChildren = localStorage.getItem('tdah_children');

    if (storedUsers) {
      setUsers(JSON.parse(storedUsers));
    } else {
      const defaultAdmin: User = { id: 'admin-1', username: 'admin', name: 'Administrador', role: 'admin' };
      setUsers([defaultAdmin]);
      localStorage.setItem('tdah_users', JSON.stringify([defaultAdmin]));
    }

    if (storedChildren) {
      setChildren(JSON.parse(storedChildren));
    }
  }, []);

  const handleAddUser = (user: User) => {
    const newUsers = [...users, user];
    setUsers(newUsers);
    localStorage.setItem('tdah_users', JSON.stringify(newUsers));
  };
  
  const handleUpdateUsers = (newUsers: User[]) => {
      setUsers(newUsers);
      localStorage.setItem('tdah_users', JSON.stringify(newUsers));
  };

  const handleAddChild = (child: Child) => {
    const newChildren = [...children, child];
    setChildren(newChildren);
    localStorage.setItem('tdah_children', JSON.stringify(newChildren));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentView('main');
  };

  const handleChangePassword = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPassword.trim() || !currentUser) return;
      const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, password: newPassword } : u);
      handleUpdateUsers(updatedUsers);
      setCurrentUser({ ...currentUser, password: newPassword });
      setShowPasswordModal(false);
      setNewPassword('');
  };

  if (!currentUser) {
    return <Login users={users} onLogin={setCurrentUser} />;
  }

  const linkedChild = children.find(c => c.id === currentUser.childId);
  const canSeeDashboard = currentUser.role === 'admin' || currentUser.canViewDashboard;

  const renderContent = () => {
    if (currentView === 'dashboard') {
        return <Dashboard currentUser={currentUser} />;
    }

    switch (currentUser.role) {
      case 'admin':
        return <AdminPanel users={users} children={children} onAddUser={handleAddUser} onAddChild={handleAddChild} onUpdateUsers={handleUpdateUsers} />;
      case 'psicologa':
      case 'psicopedagoga':
      case 'fonoaudiologa':
        return <ClinicaForm user={currentUser} child={linkedChild} />;
      case 'professora':
        return <EscolaForm user={currentUser} child={linkedChild} />;
      case 'pais':
        return <PaisView user={currentUser} child={linkedChild} />;
      default:
        return null;
    }
  };

  const getRoleDisplayName = (role: TDAHRole) => {
    const map: Record<TDAHRole, string> = {
      admin: 'Administração',
      psicologa: 'Psicologia',
      psicopedagoga: 'Psicopedagogia',
      fonoaudiologa: 'Fonoaudiologia',
      professora: 'Escolar (Profª)',
      pais: 'Portal dos Pais'
    };
    return map[role];
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-slate-900 flex flex-col shrink-0 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">F</span>
              </div>
              <h1 className="text-white font-semibold text-lg tracking-tight">Focus</h1>
            </div>
            <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
              <X className="w-6 h-6" />
            </button>
          </div>
          <nav className="space-y-1 flex-1">
            <div className="px-3 py-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2">
              Menu Principal
            </div>
            
            <button 
                onClick={() => { setCurrentView('main'); setSidebarOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-3 ${currentView === 'main' ? 'bg-indigo-600/20 text-white border-l-2 border-indigo-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <HomeIcon className="w-4 h-4" /> Início ({getRoleDisplayName(currentUser.role)})
            </button>

            {canSeeDashboard && (
                <button 
                  onClick={() => { setCurrentView('dashboard'); setSidebarOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 mt-1 rounded-xl text-sm font-medium transition-colors flex items-center gap-3 ${currentView === 'dashboard' ? 'bg-indigo-600/20 text-white border-l-2 border-indigo-400' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                    <LayoutDashboard className="w-4 h-4" /> Dashboard de Métricas
                </button>
            )}

            {(currentUser.role === 'admin' || currentUser.role === 'pais') && (
              <div className="mt-8 px-3">
                {googleAuthToken ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold px-2 py-2 bg-emerald-400/10 rounded-lg">
                        <CheckCircle className="w-4 h-4" /> Conta Google Conectada
                    </div>
                ) : (
                    <button 
                        onClick={() => googleSignIn().catch(console.error)}
                        className="w-full flex items-center justify-center gap-2 bg-white text-slate-900 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
                    >
                       <svg className="w-4 h-4" viewBox="0 0 48 48">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                       </svg>
                       Conectar ao Google
                    </button>
                )}
              </div>
            )}
          </nav>
          
          <div className="pt-4 border-t border-white/10 space-y-2">
            <button 
              onClick={() => { setShowPasswordModal(true); setSidebarOpen(false); }}
              className="w-full text-left px-3 py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors flex items-center gap-3"
            >
              <KeyRound className="w-4 h-4" /> Alterar Senha
            </button>
            <button 
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors flex items-center gap-3"
            >
              <LogOut className="w-4 h-4" /> Sair
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden w-full relative">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 md:px-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <button className="md:hidden text-slate-600 hover:text-slate-900" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
              <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-600 font-bold uppercase text-xs md:text-base">
                {currentUser.name.substring(0, 2)}
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-slate-900 font-semibold truncate text-sm md:text-base">{currentUser.name}</h2>
              {linkedChild ? (
                <p className="text-slate-500 text-xs tracking-wide truncate">Vinculado a: <strong>{linkedChild.name}</strong></p>
              ) : currentUser.role === 'admin' ? (
                <p className="text-slate-500 text-xs tracking-wide truncate">Visão de Administração</p>
              ) : (
                <p className="text-red-500 text-xs tracking-wide truncate">Paciente não atribuído</p>
              )}
            </div>
          </div>
          <div className="hidden sm:flex gap-2 text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {getRoleDisplayName(currentUser.role)}
          </div>
        </header>

        {/* Content Wrapper */}
        <div className="p-4 md:p-8 flex-1 overflow-auto">
          {renderContent()}
        </div>
      </main>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
                <h3 className="text-xl font-bold text-slate-900 mb-2">Alterar Senha</h3>
                <p className="text-slate-500 text-sm mb-6">Digite sua nova senha para acessar a plataforma.</p>
                
                <form onSubmit={handleChangePassword}>
                    <input 
                        type="password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Nova senha..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none mb-6"
                        required
                    />
                    <div className="flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={() => setShowPasswordModal(false)}
                            className="px-5 py-2.5 text-slate-600 font-semibold bg-slate-100 hover:bg-slate-200 cursor-pointer rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            disabled={!newPassword.trim()}
                            className="px-5 py-2.5 text-white font-semibold flex cursor-pointer items-center justify-center rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                            Salvar Nova Senha
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
}
