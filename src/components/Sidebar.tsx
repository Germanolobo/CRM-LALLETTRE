import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Package, 
  BadgePercent, 
  History, 
  LogOut,
  Sparkles,
  AlertTriangle,
  UserCheck,
  ShieldAlert,
  User
} from 'lucide-react';
import { Product, User as UserType } from '../types';
import Logo from './Logo';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  products: Product[];
  currentUser: UserType | null;
  onLogout: () => void;
}

export default function Sidebar({ currentTab, setCurrentTab, products, currentUser, onLogout }: SidebarProps) {
  const lowStockItems = products.filter(p => p.stock < 5 && p.stock > 0);
  const outOfStockItems = products.filter(p => p.stock === 0);

  // Filter menu items by user permissions
  const getMenuItems = () => {
    if (!currentUser) return [];

    const allItems = [
      { id: 'dashboard', name: 'Painel Geral', icon: LayoutDashboard, roles: ['Acesso Total', 'Apenas Leads', 'Apenas Estoque'] },
      { id: 'leads', name: 'Leads & Clientes', icon: Users, roles: ['Acesso Total', 'Apenas Leads'] },
      { id: 'stock', name: 'Controle de Estoque', icon: Package, roles: ['Acesso Total', 'Apenas Estoque'] },
      { id: 'sales', name: 'Registro de Vendas', icon: BadgePercent, roles: ['Acesso Total', 'Apenas Estoque'] },
      { id: 'interactions', name: 'Histórico de Contatos', icon: History, roles: ['Acesso Total', 'Apenas Leads'] },
      { id: 'team', name: 'Equipe & Acessos', icon: UserCheck, roles: ['Acesso Total'] },
      { id: 'profile', name: 'Meu Perfil', icon: User, roles: ['Acesso Total', 'Apenas Leads', 'Apenas Estoque'] },
    ];

    return allItems.filter(item => item.roles.includes(currentUser.role));
  };

  const menuItems = getMenuItems();

  return (
    <div className="w-[220px] shrink-0 bg-[#0A0A0A] border-r border-terracotta-500/20 flex flex-col h-screen sticky top-0" id="sidebar">
      {/* Brand Header */}
      <div className="p-6 mb-4 flex flex-col justify-start border-b border-white/5 pb-5" id="sidebar-brand-header">
        <Logo variant="sidebar" className="self-start" />
        <p className="font-italiana text-[9px] tracking-[0.22em] text-[#DFBA73]/70 uppercase mt-2 self-start pl-1">
          Maison de Parfum
        </p>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
        <div className="text-[10px] font-semibold text-[#B35B48] opacity-80 uppercase tracking-widest mb-3 pl-2">
          Gestão
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`tab-btn-${item.id}`}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 rounded-lg text-xs font-normal transition-all duration-300 text-left cursor-pointer ${
                isActive
                  ? 'text-[#B35B48] border-l-2 border-[#B35B48] bg-white/[0.03] pl-3.5'
                  : 'text-[#F5F5F5] opacity-60 hover:opacity-100 hover:text-[#B35B48] hover:pl-3.5'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-80" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      {/* Stock Summary Badge at Bottom (only visible to role with Stock access) */}
      {currentUser && (currentUser.role === 'Acesso Total' || currentUser.role === 'Apenas Estoque') && (
        <div className="p-4 mx-4 mb-4 glass rounded-lg" id="sidebar-stock-status">
          <div className="flex items-center gap-2 mb-1.5">
            <Package className="h-3.5 w-3.5 text-terracotta-500" />
            <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Status do Estoque</span>
          </div>
          
          {outOfStockItems.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-red-400 mt-1 font-mono">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>{outOfStockItems.length} {outOfStockItems.length === 1 ? 'esgotado' : 'esgotados'}!</span>
            </div>
          )}

          {lowStockItems.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-500 mt-1 font-mono">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              <span>{lowStockItems.length} {lowStockItems.length === 1 ? 'estoque baixo' : 'estoques baixos'}</span>
            </div>
          )}

          {outOfStockItems.length === 0 && lowStockItems.length === 0 && (
            <div className="text-[11px] text-emerald-500 mt-1 font-mono">
              ✓ Saudável
            </div>
          )}
        </div>
      )}

      {/* User profile section */}
      {currentUser && (
        <div className="p-4 border-t border-white/5 bg-brand-black/20 flex flex-col gap-2.5">
          <div className="flex items-center gap-3 overflow-hidden">
            {currentUser.photoUrl ? (
              <img 
                src={currentUser.photoUrl} 
                alt={currentUser.name} 
                className="h-8 w-8 rounded-full object-cover border border-[#B35B48]/30 shrink-0"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-[#B35B48] flex items-center justify-center font-bold text-xs text-white shrink-0">
                {currentUser.name.substring(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-white truncate" title={currentUser.name}>{currentUser.name}</span>
              <span className="text-[9px] text-[#B35B48] font-mono leading-tight">{currentUser.role}</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 py-1.5 px-2 rounded hover:bg-red-950/20 text-gray-500 hover:text-red-400 text-[10px] font-mono uppercase tracking-wider text-left transition-all cursor-pointer border border-transparent hover:border-red-900/30"
            id="logout-btn"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      )}
    </div>
  );
}
