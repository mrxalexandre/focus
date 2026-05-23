import React, { useState } from 'react';
import { Bot, User as UserIcon, Lock, ArrowRight } from 'lucide-react';
import { User } from '../types.ts';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

export function Login({ users, onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.toLowerCase() === 'admin' && password === 'admin') {
      const adminUser = users.find(u => u.username.toLowerCase() === 'admin') || {
        id: 'admin-1', username: 'admin', name: 'Administrador', role: 'admin'
      };
      onLogin(adminUser as User);
      return;
    }
    
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user) {
      const expectedPassword = user.password || user.username.toLowerCase();
      if (password === expectedPassword) {
        onLogin(user);
      } else {
        setError('A senha está incorreta.');
      }
    } else {
      setError('Usuário não encontrado. Verifique com o administrador.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans selection:bg-indigo-100">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        <div className="p-8 sm:p-12">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <span className="text-3xl font-bold font-sans">F</span>
            </div>
          </div>
          
          <div className="text-center mb-10">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Focus</h1>
            <p className="text-sm text-slate-500 mt-2 font-medium">Acesso à Plataforma Multidisciplinar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label htmlFor="username" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Nome de Usuário
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-5 h-5" />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setError(''); }}
                  placeholder="Ex: ana.psicologa"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="********"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm font-medium text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={!username.trim() || !password.trim()}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
            >
              Entrar <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 border-t border-slate-100 p-6 flex flex-col items-center justify-center text-center gap-2">
          <div className="flex items-center justify-center gap-2 text-indigo-400">
            <Bot className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-widest">Motor de IA Ativo</span>
          </div>
          <p className="text-xs text-slate-400 px-4">
             A senha inicial padrão é igual ao seu nome de usuário.
          </p>
        </div>
      </div>
    </div>
  );
}
