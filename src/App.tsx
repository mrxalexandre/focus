/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { LogOut, Menu, X, LayoutDashboard, KeyRound, Home as HomeIcon, CheckCircle } from 'lucide-react';
import { collection, onSnapshot, setDoc, doc, writeBatch } from 'firebase/firestore';
import { TDAHRole, User, Child } from './types.ts';
import { ClinicaForm } from './components/ClinicaForm.tsx';
import { EscolaForm } from './components/EscolaForm.tsx';
import { PaisView } from './components/PaisView.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { Login } from './components/Login.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { db } from './firebase.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'main' | 'dashboard'>('main');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    // Sincronização em tempo real do Firestore -> Users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const dbUsers: User[] = [];
      snapshot.forEach(doc => {
        dbUsers.push(doc.data() as User);
      });
      if (dbUsers.length > 0) {
        setUsers(dbUsers);
      } else {
        // Cria admin padrão de forma remota caso o BD esteja vazio
        const defaultAdmin: User = { id: 'admin-1', username: 'admin', name: 'Administrador', role: 'admin', password: 'admin' };
        setUsers([defaultAdmin]);
        setDoc(doc(db, 'users', defaultAdmin.id), defaultAdmin).catch(console.error);
      }
    }, (error) => {
      console.error("Erro ao escutar users no Firestore:", error);
    });

    // Sincronização em tempo real do Firestore -> Children
    const unsubscribeChildren = onSnapshot(collection(db, 'children'), (snapshot) => {
      const dbChildren: Child[] = [];
      snapshot.forEach(doc => {
        dbChildren.push(doc.data() as Child);
      });
      setChildren(dbChildren);
    }, (error) => {
      console.error("Erro ao escutar children no Firestore:", error);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeChildren();
    };
  }, []);

  const handleAddUser = async (user: User) => {
    // A UI atualiza automaticamente pelo onSnapshot, mas se quiser otimizar
    const newUsers = [...users, user];
    setUsers(newUsers);
    try {
      await setDoc(doc(db, 'users', user.id), user);
    } catch (e) {
      console.error("Erro ao adicionar usuário: ", e);
    }
  };
  
  const handleUpdateUsers = async (newUsers: User[]) => {
      // Como o update manda a lista completa, usamos um batch para sobrepor.
      setUsers(newUsers);
      try {
        const batch = writeBatch(db);
        newUsers.forEach(u => {
          batch.set(doc(db, 'users', u.id), u);
        });
        await batch.commit();
      } catch (e) {
        console.error("Erro ao atualizar usuários: ", e);
      }
  };

  const handleAddChild = async (child: Child) => {
    const newChildren = [...children, child];
    setChildren(newChildren);
    try {
      await setDoc(doc(db, 'children', child.id), child);
    } catch(e) {
      console.error("Erro ao adicionar criança: ", e);
    }
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
