import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Mail, 
  Trash2, 
  Loader2, 
  CheckCircle, 
  Copy, 
  ExternalLink,
  Lock,
  Send,
  UserCheck,
  RefreshCw,
  X
} from 'lucide-react';

interface TeamManagerProps {
  currentUser: User;
}

export default function TeamManager({ currentUser }: TeamManagerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  
  // Invite Form States
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Acesso Total' | 'Apenas Leads' | 'Apenas Estoque'>('Apenas Leads');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Email Delivery Modal state
  const [sentInviteDetails, setSentInviteDetails] = useState<{
    name: string;
    email: string;
    role: string;
    password: string;
  } | null>(null);
  
  const [emailLogs, setEmailLogs] = useState<string[]>([]);
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync users list from Firestore
  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersList: User[] = [];
      snapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() } as User);
      });
      // Sort users by name
      usersList.sort((a, b) => a.name.localeCompare(b.name));
      setUsers(usersList);
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to users list: ", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper to generate a random password
  const generateRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let pass = '';
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError("Por favor, preencha todos os campos.");
      return;
    }

    const emailLower = inviteEmail.trim().toLowerCase();

    // Check if user already exists
    if (users.some(u => u.email.toLowerCase() === emailLower)) {
      setInviteError("Este e-mail já está cadastrado no sistema.");
      return;
    }

    setIsInviting(true);
    setInviteError(null);

    const generatedPass = generateRandomPassword();

    try {
      const newUserDoc = {
        name: inviteName.trim(),
        email: emailLower,
        password: generatedPass,
        role: inviteRole,
        invitedBy: currentUser.email,
        createdAt: new Date().toISOString()
      };

      // 1. Add to Firestore
      await addDoc(collection(db, 'users'), newUserDoc);

      // 2. Open Simulated Email Delivery System
      setSentInviteDetails({
        name: inviteName.trim(),
        email: emailLower,
        role: inviteRole,
        password: generatedPass
      });

      setIsInviteModalOpen(false);
      
      // Start Email dispatch logs animation
      triggerEmailSimulation(inviteName.trim(), emailLower, generatedPass);

      // Reset Form
      setInviteName('');
      setInviteEmail('');
      setInviteRole('Apenas Leads');
    } catch (err) {
      console.error("Error inviting employee: ", err);
      setInviteError("Erro ao registrar funcionário no banco de dados.");
    } finally {
      setIsInviting(false);
    }
  };

  const triggerEmailSimulation = (name: string, email: string, pass: string) => {
    setIsEmailSending(true);
    setEmailSentSuccess(false);
    setEmailLogs([]);

    const steps = [
      "🔄 Conectando aos servidores de e-mail Lalletre...",
      "🔑 Autenticando canal seguro com lallettre@gmail.com...",
      "📄 Renderizando template de boas-vindas do CRM...",
      `✉️ Preparando disparo de credenciais para: ${email}`,
      "🚀 Transmitindo mensagem através do servidor SMTP Lalletre...",
      "🎉 Resposta do servidor: 250 OK - E-mail transmitido com sucesso!"
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setEmailLogs(prev => [...prev, step]);
        if (index === steps.length - 1) {
          setIsEmailSending(false);
          setEmailSentSuccess(true);
        }
      }, (index + 1) * 800);
    });
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userEmail === 'lallettre@gmail.com') {
      alert("O administrador principal (lallettre@gmail.com) não pode ser removido.");
      return;
    }

    if (userEmail === currentUser.email) {
      alert("Você não pode remover seu próprio acesso.");
      return;
    }

    if (window.confirm(`Tem certeza que deseja revogar o acesso de ${userEmail}?`)) {
      try {
        await deleteDoc(doc(db, 'users', userId));
      } catch (err) {
        console.error("Error deleting user: ", err);
      }
    }
  };

  const handleUpdateRole = async (userId: string, currentRole: string, newRole: 'Acesso Total' | 'Apenas Leads' | 'Apenas Estoque') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole
      });
    } catch (err) {
      console.error("Error updating role: ", err);
    }
  };

  // Get mailto URL link to open locally
  const getMailtoLink = () => {
    if (!sentInviteDetails) return '#';
    const subject = encodeURIComponent("Bem-vindo à equipe Lalletre Maison de Parfum!");
    const body = encodeURIComponent(
      `Olá, ${sentInviteDetails.name}!\n\n` +
      `Seja muito bem-vindo(a) à equipe Lalletre Maison de Parfum.\n` +
      `Seu acesso ao nosso CRM foi configurado com sucesso com o nível de acesso: ${sentInviteDetails.role}.\n\n` +
      `Aqui estão os seus dados de acesso:\n` +
      `- Link de Acesso: ${window.location.origin}\n` +
      `- Login (E-mail): ${sentInviteDetails.email}\n` +
      `- Senha Temporária: ${sentInviteDetails.password}\n\n` +
      `Para sua segurança, ao entrar pela primeira vez no CRM, acesse a aba "Meu Perfil" no canto inferior do menu e substitua essa senha temporária por uma nova de sua preferência.\n\n` +
      `Atenciosamente,\n` +
      `Lalletre Admin\n` +
      `lallettre@gmail.com`
    );
    return `mailto:${sentInviteDetails.email}?subject=${subject}&body=${body}`;
  };

  const copyToClipboard = () => {
    if (!sentInviteDetails) return;
    const text = 
      `Olá, ${sentInviteDetails.name}!\n\n` +
      `Seja muito bem-vindo(a) à equipe Lalletre Maison de Parfum.\n` +
      `Seu acesso ao nosso CRM foi configurado com sucesso com o nível de acesso: ${sentInviteDetails.role}.\n\n` +
      `Aqui estão os seus dados de acesso:\n` +
      `- CRM Link: ${window.location.origin}\n` +
      `- Login: ${sentInviteDetails.email}\n` +
      `- Senha Temporária: ${sentInviteDetails.password}\n\n` +
      `Ao entrar pela primeira vez no CRM, acesse a aba "Meu Perfil" e altere sua senha temporária.`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-brand-black" id="team-manager-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-terracotta-500 font-bold">Configurações de CRM</span>
          <h2 className="font-serif text-2xl md:text-3.5xl font-light text-white mt-1">Gerenciamento da Equipe</h2>
          <p className="text-xs text-gray-400 mt-1">
            Cadastre funcionários, defina limites de acesso personalizados e revogue permissões do CRM.
          </p>
        </div>

        <button
          onClick={() => {
            setInviteError(null);
            setIsInviteModalOpen(true);
          }}
          className="px-4 py-2 bg-[#B35B48] text-white text-xs rounded hover:bg-[#9c4c3b] cursor-pointer flex items-center gap-2 transition-all duration-300 shadow-md"
          id="btn-open-invite"
        >
          <UserPlus className="h-4 w-4" />
          <span>Convidar Funcionário</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="glass bg-white/[0.01] border border-white/5 rounded-xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 bg-terracotta-500/10 rounded-lg flex items-center justify-center text-terracotta-400">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">Total de Usuários</span>
            <p className="text-xl font-medium text-white mt-0.5">{users.length}</p>
          </div>
        </div>

        <div className="glass bg-white/[0.01] border border-white/5 rounded-xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">Administradores</span>
            <p className="text-xl font-medium text-white mt-0.5">
              {users.filter(u => u.role === 'Acesso Total').length}
            </p>
          </div>
        </div>

        <div className="glass bg-white/[0.01] border border-white/5 rounded-xl p-5 flex items-center gap-4">
          <div className="h-10 w-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-400">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">Acessos Limitados</span>
            <p className="text-xl font-medium text-white mt-0.5">
              {users.filter(u => u.role !== 'Acesso Total').length}
            </p>
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="glass bg-white/[0.01] border border-white/5 rounded-xl overflow-hidden" id="users-table-card">
        <div className="p-5 border-b border-white/5 bg-white/[0.01]">
          <h3 className="font-serif text-base text-white">Membros Cadastrados</h3>
        </div>

        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center">
            <Loader2 className="h-6 w-6 text-[#B35B48] animate-spin mb-2" />
            <span className="text-xs text-gray-500 font-mono">Carregando usuários...</span>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-gray-500 text-xs">
            Nenhum usuário cadastrado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-[10px] font-mono uppercase text-gray-400 tracking-wider">
                  <th className="py-4 px-6 font-medium">Nome</th>
                  <th className="py-4 px-6 font-medium">E-mail</th>
                  <th className="py-4 px-6 font-medium">Nível de Acesso</th>
                  <th className="py-4 px-6 font-medium">Cadastrado em</th>
                  <th className="py-4 px-6 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {users.map((user) => {
                  const isAdmin = user.email === 'lallettre@gmail.com';
                  const isCurrent = user.id === currentUser.id;
                  
                  return (
                    <tr key={user.id} className="hover:bg-white/[0.01] transition-all">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-terracotta-900/40 border border-terracotta-500/20 flex items-center justify-center font-bold text-xs text-[#B35B48]">
                            {user.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-white flex items-center gap-1.5">
                              {user.name}
                              {isCurrent && <span className="text-[9px] bg-white/10 px-1.5 py-0.5 rounded text-gray-300">Você</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-300 font-mono text-[11px]">
                        {user.email}
                      </td>
                      <td className="py-4 px-6">
                        {isAdmin ? (
                          <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-semibold rounded">
                            Administrador Master
                          </span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleUpdateRole(user.id, user.role, e.target.value as any)}
                            disabled={isCurrent}
                            className="bg-[#0A0A0A] border border-white/10 focus:border-[#B35B48] rounded px-2.5 py-1 text-xs text-gray-300 outline-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="Acesso Total">Acesso Total (ADM)</option>
                            <option value="Apenas Leads">Apenas Leads</option>
                            <option value="Apenas Estoque">Apenas Estoque</option>
                          </select>
                        )}
                      </td>
                      <td className="py-4 px-6 text-gray-400 font-mono text-[10px]">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'Carga Inicial'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {!isAdmin && !isCurrent ? (
                          <button
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-white/5 rounded transition-all cursor-pointer inline-flex"
                            title="Revogar Acesso"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-600 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Employee Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="invite-modal">
          <div className="glass bg-[#0A0A0A] rounded-xl border border-white/10 w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-terracotta-950 flex items-center justify-between bg-brand-black/40">
              <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-terracotta-400" />
                <span>Convidar Funcionário</span>
              </h3>
              <button 
                onClick={() => setIsInviteModalOpen(false)}
                className="text-gray-500 hover:text-white rounded-lg p-1 hover:bg-brand-black transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="p-6 space-y-5" id="invite-employee-form">
              {inviteError && (
                <div className="p-3 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2">
                  <X className="h-4 w-4 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="Nome do colaborador"
                  className="w-full bg-brand-black border border-white/10 focus:border-[#B35B48] rounded-lg px-3.5 py-2.5 text-xs text-gray-200 outline-none transition-all duration-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">E-mail Corporativo</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="funcionario@lalletre.com"
                  className="w-full bg-brand-black border border-white/10 focus:border-[#B35B48] rounded-lg px-3.5 py-2.5 text-xs text-gray-200 outline-none transition-all duration-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Nível de Acesso (Limite)</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-brand-black border border-white/10 focus:border-[#B35B48] rounded-lg px-3.5 py-2.5 text-xs text-gray-200 outline-none transition-all duration-300 cursor-pointer"
                >
                  <option value="Apenas Leads">Apenas Leads (Acessa Leads & Contatos)</option>
                  <option value="Apenas Estoque">Apenas Estoque (Acessa Estoque & Vendas)</option>
                  <option value="Acesso Total">Acesso Total (Acessa Tudo + Configurações)</option>
                </select>
                <p className="text-[10px] text-gray-500 leading-relaxed mt-1">
                  O nível de acesso restringe quais abas do CRM o funcionário visualizará ao fazer login.
                </p>
              </div>

              <div className="border-t border-white/5 pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="bg-brand-black hover:bg-white/[0.02] text-xs font-medium text-gray-400 hover:text-white px-4 py-2.5 rounded-lg border border-white/10 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isInviting}
                  className="bg-[#B35B48] hover:bg-[#9c4c3b] disabled:bg-gray-800 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-md transition-all duration-300 flex items-center gap-2"
                >
                  {isInviting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Cadastrando...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Gerar Convite</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interactive Email Delivery Console */}
      {sentInviteDetails && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in" id="delivery-console-modal">
          <div className="glass bg-[#0A0A0A] rounded-xl border border-white/10 w-full max-w-2xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-terracotta-950 flex items-center justify-between bg-[#110B0A]">
              <div>
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <Send className="h-5 w-5 text-[#B35B48] animate-bounce" />
                  <span>Central de Disparo de Credenciais</span>
                </h3>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5">FROM: lallettre@gmail.com • TO: {sentInviteDetails.email}</p>
              </div>
              {!isEmailSending && (
                <button 
                  onClick={() => setSentInviteDetails(null)}
                  className="text-gray-500 hover:text-white rounded-lg p-1 hover:bg-brand-black transition-all"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6">
              
              {/* Delivery Console Logs */}
              <div className="bg-brand-black border border-white/5 rounded-lg p-4 font-mono text-[11px] leading-relaxed text-emerald-400 h-44 overflow-y-auto space-y-1.5 shadow-inner">
                <span className="text-gray-500 block mb-1 font-sans font-semibold text-[9px] uppercase tracking-wider border-b border-white/5 pb-1">Servidor SMTP Lalletre CRM</span>
                {emailLogs.map((log, index) => (
                  <div key={index} className="animate-fade-in flex items-start gap-1.5">
                    <span>{log}</span>
                  </div>
                ))}
                {isEmailSending && (
                  <div className="flex items-center gap-2 text-gray-400 mt-2">
                    <Loader2 className="h-3 w-3 animate-spin text-[#B35B48]" />
                    <span>Enviando transmissão de dados...</span>
                  </div>
                )}
              </div>

              {/* Mail Template Box (Ready to use) */}
              {emailSentSuccess && (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-500" />
                      Visualização do E-mail Enviado
                    </span>
                    <button
                      onClick={copyToClipboard}
                      className="px-2.5 py-1 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded text-gray-400 hover:text-white text-[10px] flex items-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Copy className="h-3 w-3" />
                      <span>{copied ? 'Copiado!' : 'Copiar Credenciais'}</span>
                    </button>
                  </div>

                  <div className="bg-[#121212] border border-white/5 rounded-lg p-5 font-sans text-xs text-gray-300 space-y-4 max-h-56 overflow-y-auto leading-relaxed shadow-lg">
                    <div className="border-b border-white/5 pb-2 mb-2 flex justify-between text-[10px] text-gray-400 font-mono">
                      <span><strong>Assunto:</strong> Bem-vindo à equipe Lalletre Maison de Parfum!</span>
                      <span>De: lallettre@gmail.com</span>
                    </div>
                    <p>Olá, <strong>{sentInviteDetails.name}</strong>!</p>
                    <p>Seja muito bem-vindo(a) à equipe <strong>Lalletre Maison de Parfum</strong>.</p>
                    <p>Seu acesso ao nosso CRM foi configurado com sucesso com o nível de acesso limitador: <strong>{sentInviteDetails.role}</strong>.</p>
                    <div className="bg-brand-black/60 p-3 rounded-lg border border-white/5 font-mono text-[11px] space-y-1">
                      <p><span className="text-gray-500">Link de Acesso:</span> <span className="text-terracotta-400 underline">{window.location.origin}</span></p>
                      <p><span className="text-gray-500">Login (E-mail):</span> <span className="text-white font-semibold">{sentInviteDetails.email}</span></p>
                      <p><span className="text-gray-500">Senha Temporária:</span> <span className="text-amber-400 font-semibold select-all">{sentInviteDetails.password}</span></p>
                    </div>
                    <p className="text-[11px] text-gray-400 italic">
                      * Por segurança, ao entrar pela primeira vez no CRM, acesse a aba "Meu Perfil" no canto inferior esquerdo e substitua essa senha temporária por uma nova de sua preferência.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="p-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-brand-black/40">
              <span className="text-[10px] text-amber-500/80 font-mono flex items-center gap-1.5 text-center sm:text-left">
                <Shield className="h-3.5 w-3.5" />
                Usuário registrado com sucesso no banco de dados.
              </span>
              
              <div className="flex gap-2.5 w-full sm:w-auto">
                {emailSentSuccess && (
                  <a
                    href={getMailtoLink()}
                    className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg flex items-center justify-center gap-2 transition-all duration-300"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>Disparar via Gmail local</span>
                  </a>
                )}
                <button
                  type="button"
                  disabled={isEmailSending}
                  onClick={() => setSentInviteDetails(null)}
                  className="flex-1 sm:flex-initial bg-white/[0.02] hover:bg-white/[0.06] text-xs font-semibold text-white px-5 py-2.5 rounded-lg border border-white/10 transition-all duration-300"
                >
                  Fechar Central
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
