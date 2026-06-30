import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, limit, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { Sparkles, Loader2, Lock, Mail, Eye, EyeOff, KeyRound } from 'lucide-react';
import Logo from './Logo';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(''); // Only used for first admin registration
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isFirstAccess, setIsFirstAccess] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const adminEmail = "lallettre@gmail.com";

  // Check if an admin is already registered in 'users' collection
  useEffect(() => {
    async function checkAdminExists() {
      try {
        const usersRef = collection(db, 'users');
        const adminQuery = query(usersRef, where('email', '==', adminEmail), limit(1));
        const snap = await getDocs(adminQuery);
        
        if (snap.empty) {
          setIsFirstAccess(true);
          setEmail(adminEmail);
          setName('Lalletre Admin');
        } else {
          setIsFirstAccess(false);
        }
      } catch (err) {
        console.error("Error checking admin: ", err);
        setError("Erro ao verificar status do sistema. Verifique sua conexão.");
      } finally {
        setCheckingAdmin(false);
      }
    }
    checkAdminExists();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Por favor, preencha todos os campos.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', email.trim().toLowerCase()), limit(1));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("Usuário não encontrado ou sem permissão de acesso.");
        setIsSubmitting(false);
        return;
      }

      const userDoc = snap.docs[0];
      const userData = userDoc.data() as Omit<User, 'id'>;

      if (userData.password !== password) {
        setError("Senha incorreta. Tente novamente.");
        setIsSubmitting(false);
        return;
      }

      // Successful login
      const loggedUser: User = {
        id: userDoc.id,
        ...userData
      };
      onLoginSuccess(loggedUser);
    } catch (err) {
      console.error(err);
      setError("Ocorreu um erro ao fazer login. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Preencha todos os campos para configurar seu administrador.");
      return;
    }

    if (password.length < 6) {
      setError("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const usersRef = collection(db, 'users');
      const adminDoc = {
        name: name.trim(),
        email: adminEmail,
        password: password,
        role: 'Acesso Total' as const,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(usersRef, adminDoc);
      
      const loggedUser: User = {
        id: docRef.id,
        ...adminDoc
      };
      onLoginSuccess(loggedUser);
    } catch (err) {
      console.error(err);
      setError("Erro ao salvar credenciais do administrador.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen w-full bg-brand-black flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 text-[#DFBA73] animate-spin mb-4" />
        <p className="text-gray-400 font-mono text-xs tracking-widest uppercase">Inicializando Lallettre CRM...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-brand-black flex items-center justify-center p-4 relative overflow-hidden" id="login-container">
      {/* Abstract Background Accents */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#DFBA73]/5 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full filter blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0A0A0A] border border-white/5 rounded-2xl p-8 shadow-2xl relative z-10 glass transition-all duration-500">
        {/* Brand Header */}
        <div className="text-center mb-8 flex flex-col items-center">
          <Logo variant="login" />
          <p className="font-italiana text-[10px] tracking-[0.25em] text-[#DFBA73]/70 uppercase mt-3">
            Maison de Parfum • CRM
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2.5">
            <Lock className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isFirstAccess ? (
          /* First Access setup for lallettre@gmail.com */
          <form onSubmit={handleRegisterAdminSubmit} className="space-y-5" id="first-access-form">
            <div className="bg-[#B35B48]/10 border border-[#B35B48]/20 rounded-lg p-4 mb-2">
              <h3 className="font-serif text-sm font-semibold text-white mb-1 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Configuração Inicial de Admin
              </h3>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Bem-vindo! Este é o primeiro acesso ao CRM. Defina a sua senha de Administrador para o e-mail oficial <strong className="text-white">{adminEmail}</strong>. Uma vez configurado, o sistema será fechado e novos acessos só poderão ser feitos por convite.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Seu Nome</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 focus:border-[#B35B48] rounded-lg px-4 py-3 text-xs text-gray-200 outline-none transition-all duration-300"
                  placeholder="Nome Completo do Admin"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">E-mail de Acesso</label>
              <div className="relative">
                <input
                  type="email"
                  disabled
                  value={adminEmail}
                  className="w-full bg-brand-black/40 border border-white/5 rounded-lg px-4 py-3 text-xs text-gray-500 outline-none cursor-not-allowed"
                />
                <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-gray-600" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Definir Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 focus:border-[#B35B48] rounded-lg pl-4 pr-10 py-3 text-xs text-gray-200 outline-none transition-all duration-300"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Confirmar Senha</label>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-brand-black border border-white/10 focus:border-[#B35B48] rounded-lg px-4 py-3 text-xs text-gray-200 outline-none transition-all duration-300"
                placeholder="Confirme a senha definida"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#B35B48] hover:bg-[#9c4c3b] disabled:bg-gray-800 text-white text-xs font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Configurando Sistema...</span>
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" />
                  <span>Ativar CRM & Acessar</span>
                </>
              )}
            </button>
          </form>
        ) : (
          /* Standard login form */
          <form onSubmit={handleLoginSubmit} className="space-y-5" id="login-form">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">E-mail</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 focus:border-[#B35B48] rounded-lg pl-4 pr-10 py-3 text-xs text-gray-200 outline-none transition-all duration-300"
                  placeholder="seu.email@exemplo.com"
                />
                <Mail className="absolute right-3.5 top-3.5 h-4 w-4 text-gray-500" />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Senha</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-brand-black border border-white/10 focus:border-[#B35B48] rounded-lg pl-4 pr-10 py-3 text-xs text-gray-200 outline-none transition-all duration-300"
                  placeholder="Digite sua senha"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-gray-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#B35B48] hover:bg-[#9c4c3b] disabled:bg-gray-800 text-white text-xs font-semibold py-3 px-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 text-[#ffffff]" />
                  <span>Entrar no Sistema</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <p className="text-[10px] text-gray-500">
                Apenas funcionários convidados têm acesso a este CRM.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
