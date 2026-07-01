import React, { useState, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from '../types';
import { 
  KeyRound, 
  User as UserIcon, 
  Shield, 
  Mail, 
  Clock, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Camera,
  Trash2,
  Upload
} from 'lucide-react';

interface UserProfileProps {
  currentUser: User;
  onUpdateCurrentUser: (user: User) => void;
}

export default function UserProfile({ currentUser, onUpdateCurrentUser }: UserProfileProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Profile Picture States
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processAndUploadImage(file);
  };

  const processAndUploadImage = async (file: File) => {
    setError(null);
    setSuccess(null);

    if (!file.type.startsWith('image/')) {
      setError("Por favor, selecione um arquivo de imagem válido (PNG, JPG, etc.).");
      return;
    }

    setIsUploading(true);

    try {
      const compressedBase64 = await compressImage(file);
      
      // Update in Firestore
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        photoUrl: compressedBase64
      });

      // Update local state
      const updatedUser = {
        ...currentUser,
        photoUrl: compressedBase64
      };
      onUpdateCurrentUser(updatedUser);
      setSuccess("Foto de perfil atualizada com sucesso!");
    } catch (err) {
      console.error("Error uploading profile photo:", err);
      setError("Erro ao processar e salvar a imagem de perfil.");
    } finally {
      setIsUploading(false);
    }
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 150;
          const MAX_HEIGHT = 150;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Could not get 2D context"));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleRemovePhoto = async () => {
    setError(null);
    setSuccess(null);
    setIsUploading(true);
    try {
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        photoUrl: ''
      });

      const updatedUser = {
        ...currentUser,
        photoUrl: undefined
      };
      onUpdateCurrentUser(updatedUser);
      setSuccess("Foto de perfil removida com sucesso!");
    } catch (err) {
      console.error("Error removing profile photo:", err);
      setError("Erro ao remover a imagem de perfil.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await processAndUploadImage(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Todos os campos de senha são obrigatórios.");
      return;
    }

    if (currentPassword !== currentUser.password) {
      setError("A senha atual digitada está incorreta.");
      return;
    }

    if (newPassword.length < 6) {
      setError("A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("A nova senha e a confirmação não coincidem.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Update in Firestore
      const userRef = doc(db, 'users', currentUser.id);
      await updateDoc(userRef, {
        password: newPassword
      });

      // Update in local state/session
      const updatedUser = {
        ...currentUser,
        password: newPassword
      };
      onUpdateCurrentUser(updatedUser);

      // Reset fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess("Senha atualizada com sucesso! Use sua nova senha no próximo login.");
    } catch (err) {
      console.error("Error updating password: ", err);
      setError("Ocorreu um erro ao atualizar a senha no servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-brand-black" id="user-profile-container">
      {/* Header */}
      <div className="mb-8">
        <span className="text-[10px] font-mono uppercase tracking-widest text-terracotta-500 font-bold">Meu Perfil</span>
        <h2 className="font-serif text-2xl md:text-3.5xl font-light text-white mt-1">Configurações de Perfil</h2>
        <p className="text-xs text-gray-400 mt-1">
          Gerencie seus dados de acesso ao CRM e altere sua senha temporária ou atual.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Profile Card Summary */}
        <div 
          className={`lg:col-span-4 glass bg-white/[0.01] border rounded-2xl p-6 relative overflow-hidden flex flex-col items-center text-center transition-all duration-300 ${
            isDragging ? 'border-terracotta-500 bg-terracotta-500/5 scale-[1.02]' : 'border-white/5'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-[#B35B48]" />
          
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*" 
            className="hidden" 
          />

          <div className="relative group mb-4">
            {isUploading ? (
              <div className="h-20 w-20 rounded-full bg-brand-black/60 border-2 border-terracotta-500/30 flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-[#B35B48] animate-spin" />
              </div>
            ) : currentUser.photoUrl ? (
              <div className="relative h-20 w-20 rounded-full overflow-hidden border-2 border-terracotta-500/30 shadow-lg bg-brand-black flex items-center justify-center">
                <img 
                  src={currentUser.photoUrl} 
                  alt={currentUser.name} 
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity duration-300 cursor-pointer"
                >
                  <Camera className="h-4 w-4 text-white" />
                  <span className="text-[8px] text-white font-semibold">Alterar</span>
                </button>
              </div>
            ) : (
              <div className="relative h-20 w-20 rounded-full bg-terracotta-900/30 border-2 border-terracotta-500/30 flex items-center justify-center font-bold text-2xl text-[#B35B48] shadow-lg group-hover:border-terracotta-400 transition-colors">
                {currentUser.name.substring(0, 2).toUpperCase()}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition-opacity duration-300 cursor-pointer"
                >
                  <Camera className="h-4 w-4 text-white" />
                  <span className="text-[8px] text-white font-semibold">Adicionar</span>
                </button>
              </div>
            )}
          </div>

          <h3 className="font-serif text-lg font-medium text-white">{currentUser.name}</h3>
          
          <div className="mt-1 flex items-center gap-1 text-[10px] bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/5 text-amber-500 font-medium">
            <Shield className="h-3 w-3" />
            <span>{currentUser.role}</span>
          </div>

          {currentUser.photoUrl && (
            <button
              onClick={handleRemovePhoto}
              className="mt-3.5 flex items-center gap-1.5 px-3 py-1 bg-red-950/20 hover:bg-red-950/40 border border-red-900/20 hover:border-red-900/40 text-red-400 rounded-full text-[9px] font-mono uppercase tracking-wider cursor-pointer transition-all"
            >
              <Trash2 className="h-3 w-3" />
              <span>Remover Foto</span>
            </button>
          )}

          {!currentUser.photoUrl && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <Upload className="h-3 w-3" />
              <span>Upload ou solte imagem</span>
            </button>
          )}

          <div className="w-full border-t border-white/5 my-5" />

          {/* User Details */}
          <div className="w-full space-y-3.5 text-left text-xs text-gray-400">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-terracotta-500 shrink-0" />
              <div className="overflow-hidden">
                <span className="text-[9px] uppercase font-bold text-gray-600 block leading-none">E-mail</span>
                <span className="text-gray-300 font-mono truncate block">{currentUser.email}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-terracotta-500 shrink-0" />
              <div>
                <span className="text-[9px] uppercase font-bold text-gray-600 block leading-none">Membro Desde</span>
                <span className="text-gray-300 font-mono">
                  {currentUser.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('pt-BR') : 'Carga Inicial'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Password Change Section */}
        <div className="lg:col-span-8 glass bg-white/[0.01] border border-white/5 rounded-2xl p-6 relative">
          <h3 className="font-serif text-base text-white mb-1.5 flex items-center gap-2">
            <KeyRound className="h-4.5 w-4.5 text-[#B35B48]" />
            Alterar Senha do CRM
          </h3>
          <p className="text-xs text-gray-400 mb-6 leading-relaxed">
            Se você recebeu uma senha gerada aleatoriamente ou temporária por e-mail, por favor substitua-a aqui para garantir que somente você tenha acesso ao seu painel.
          </p>

          {error && (
            <div className="mb-5 p-4 bg-red-950/40 border border-red-900/50 rounded-lg text-xs text-red-400 flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-4 bg-emerald-950/40 border border-emerald-900/50 rounded-lg text-xs text-emerald-400 flex items-center gap-2.5">
              <CheckCircle className="h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5" id="change-password-form">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              
              {/* Current Password */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Senha Atual</label>
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Digite sua senha de acesso atual"
                    className="w-full bg-brand-black border border-white/10 focus:border-[#B35B48] rounded-lg px-4 py-2.5 text-xs text-gray-200 outline-none transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3.5 top-3.5 text-gray-500 hover:text-white"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Nova Senha</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full bg-brand-black border border-white/10 focus:border-[#B35B48] rounded-lg px-4 py-2.5 text-xs text-gray-200 outline-none transition-all duration-300"
                />
              </div>

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Confirmar Nova Senha</label>
                <input
                  type={showPasswords ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full bg-brand-black border border-white/10 focus:border-[#B35B48] rounded-lg px-4 py-2.5 text-xs text-gray-200 outline-none transition-all duration-300"
                />
              </div>

            </div>

            <div className="border-t border-white/5 pt-5 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-auto bg-[#B35B48] hover:bg-[#9c4c3b] disabled:bg-gray-800 text-white text-xs font-semibold px-6 py-3 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Salvando Nova Senha...</span>
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    <span>Atualizar Senha</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
