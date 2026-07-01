import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Users, 
  Package, 
  BadgeDollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Plus, 
  Smartphone, 
  Share2, 
  HelpCircle,
  ArrowUpRight,
  TrendingDown,
  Target,
  Award,
  Calendar
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import { Lead, Product, Sale, User } from '../types';

interface DashboardProps {
  leads: Lead[];
  products: Product[];
  sales: Sale[];
  onNavigate: (tab: string) => void;
  onQuickAddLead: () => void;
  onQuickAddSale: () => void;
  funnelStages?: { id: string; label: string; color: string; bg: string }[];
  currentUser?: User | null;
}

export default function Dashboard({ 
  leads, 
  products, 
  sales, 
  onNavigate, 
  onQuickAddLead, 
  onQuickAddSale,
  funnelStages = [],
  currentUser
 }: DashboardProps) {

  const isSeller = currentUser?.role === 'Vendedor';
  const isAdmin = currentUser?.role === 'Acesso Total';

  const [sellerGoal, setSellerGoal] = useState<number>(() => {
    if (currentUser) {
      const saved = localStorage.getItem(`lallettre_goal_${currentUser.id}`);
      return saved ? Number(saved) : 5000;
    }
    return 5000;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(sellerGoal.toString());
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedSellerId, setSelectedSellerId] = useState<string>('todos');

  useEffect(() => {
    if (isAdmin) {
      const q = query(collection(db, 'users'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const usersList: User[] = [];
        snapshot.forEach((doc) => {
          usersList.push({ id: doc.id, ...doc.data() } as User);
        });
        setAllUsers(usersList);
      }, (error) => {
        console.error("Error fetching users in dashboard:", error);
      });
      return () => unsubscribe();
    }
  }, [isAdmin]);

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(tempGoal);
    if (!isNaN(parsed) && parsed > 0) {
      setSellerGoal(parsed);
      setIsEditingGoal(false);
      if (currentUser) {
        localStorage.setItem(`lallettre_goal_${currentUser.id}`, parsed.toString());
      }
    }
  };

  // Calculations
  const totalLeads = leads.length;
  
  const totalStockUnits = products.reduce((acc, curr) => acc + curr.stock, 0);
  const lowStockCount = products.filter(p => p.stock < 5 && p.stock > 0).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  const displayedSales = isSeller 
    ? sales.filter(s => s.sellerId === currentUser.id)
    : (selectedSellerId !== 'todos' ? sales.filter(s => s.sellerId === selectedSellerId) : sales);

  const paidSales = displayedSales.filter(s => s.status === 'Pago');
  const totalRevenue = paidSales.reduce((acc, curr) => acc + curr.totalPrice, 0);

  const leadsWon = leads.filter(l => l.totalSpent > 0 || l.status === 'fechado' || l.status === 'Vendido').length;
  const conversionRate = totalLeads > 0 ? (leadsWon / totalLeads) * 100 : 0;

  // Recharts: Leads status pipeline data dynamically built from stages settings
  const pipelineData = funnelStages.length > 0 
    ? funnelStages.map(stage => ({
        name: stage.label,
        qtd: leads.filter(l => l.status === stage.id).length
      }))
    : [
        { name: 'Novos', qtd: leads.filter(l => l.status === 'Novo' || l.status === 'nova_solicitacao').length },
        { name: 'Separado', qtd: leads.filter(l => l.status === 'separado').length },
        { name: 'Postado correio', qtd: leads.filter(l => l.status === 'postado_correio').length },
        { name: 'Fechados', qtd: leads.filter(l => l.status === 'fechado').length }
      ];

  // Recharts: Leads Source Data
  const sourceCounts = leads.reduce((acc: { [key: string]: number }, curr) => {
    acc[curr.source] = (acc[curr.source] || 0) + 1;
    return acc;
  }, {});

  const sourceData = Object.keys(sourceCounts).map(source => ({
    name: source,
    value: sourceCounts[source]
  }));

  // Terracotta & Charcoal colors for Pie Chart
  const COLORS = ['#B35B48', '#c6715f', '#813c2e', '#6b3226', '#f1bfb4', '#f8dbd5'];

  // Critical stock list (below 5 units)
  const criticalStockList = products.filter(p => p.stock < 5);

  // Recent Sales
  const recentSales = [...displayedSales]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  const totalItemsSold = paidSales.reduce((acc, curr) => acc + curr.quantity, 0);

  // Seller best selling products
  const sellerProductSales = products.map(prod => {
    const prodSales = displayedSales.filter(s => s.productId === prod.id && s.status === 'Pago');
    const totalQty = prodSales.reduce((acc, curr) => acc + curr.quantity, 0);
    const totalVal = prodSales.reduce((acc, curr) => acc + curr.totalPrice, 0);
    return {
      name: prod.name,
      quantidade: totalQty,
      faturamento: totalVal
    };
  }).filter(p => p.quantidade > 0)
    .sort((a, b) => b.quantidade - a.quantidade);

  // Seller sales over time Map
  const salesByDateMap: { [key: string]: number } = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    salesByDateMap[dateStr] = 0;
  }
  
  displayedSales.filter(s => s.status === 'Pago').forEach(s => {
    try {
      const dateStr = new Date(s.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (salesByDateMap[dateStr] !== undefined) {
        salesByDateMap[dateStr] += s.totalPrice;
      }
    } catch (e) {}
  });

  const salesOverTimeData = Object.keys(salesByDateMap).map(key => ({
    data: key,
    valor: salesByDateMap[key]
  }));

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  if (isSeller) {
    const goalPercentage = Math.min((totalRevenue / sellerGoal) * 100, 100);
    
    return (
      <div className="space-y-8 animate-fade-in p-4 md:p-8 max-w-7xl mx-auto" id="seller-dashboard-view">
        {/* Welcome Header */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-terracotta-500 font-bold">Painel do Vendedor</span>
            <h2 className="text-2xl font-light text-white mt-1">
              Olá, <span className="font-serif italic text-[#B35B48]">{currentUser?.name}</span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Acompanhe seu faturamento, progresso de metas e realize vendas no PDV.
            </p>
          </div>
          
          <button
            onClick={() => onNavigate('pdv')}
            className="px-5 py-2.5 bg-[#B35B48] text-white text-xs font-semibold rounded hover:bg-[#9c4c3b] cursor-pointer transition-all duration-300 flex items-center gap-2 shadow-md w-fit"
            id="pdv-direct-btn"
          >
            <span>Ir para o PDV (Frente de Loja)</span>
            <span>→</span>
          </button>
        </header>

        {/* Seller Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="seller-stats-grid">
          
          {/* Total Sales (Orders) */}
          <div className="glass rounded-lg p-6 hover:border-[#B35B48]/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase opacity-40 font-mono">Pedidos Registrados</span>
              <Award className="h-4 w-4 text-[#B35B48]" />
            </div>
            <div className="text-3xl font-light text-white">{displayedSales.length}</div>
            <p className="text-[10px] text-gray-400 mt-1 font-mono">Total de vendas efetuadas</p>
          </div>

          {/* Perfumes Sold */}
          <div className="glass rounded-lg p-6 hover:border-[#B35B48]/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase opacity-40 font-mono">Frascos Vendidos</span>
              <Package className="h-4 w-4 text-terracotta-400" />
            </div>
            <div className="text-3xl font-light text-white">{totalItemsSold}</div>
            <p className="text-[10px] text-gray-400 mt-1 font-mono">Lalletre Maison perfumes</p>
          </div>

          {/* Personal Revenue */}
          <div className="glass rounded-lg p-6 hover:border-[#B35B48]/30 transition-all duration-300">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase opacity-40 font-mono">Meu Faturamento</span>
              <BadgeDollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-light text-white">{formatCurrency(totalRevenue)}</div>
            <p className="text-[10px] text-emerald-400 mt-1 font-mono">Total pago e recebido</p>
          </div>

          {/* Goal Progress Tracker */}
          <div className="glass rounded-lg p-6 hover:border-[#B35B48]/30 transition-all duration-300 relative">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase opacity-40 font-mono">Meta Mensal</span>
              <Target className="h-4 w-4 text-amber-400 animate-pulse" />
            </div>
            
            {isEditingGoal ? (
              <form onSubmit={handleSaveGoal} className="flex items-center gap-1.5 mt-1">
                <input 
                  type="number"
                  required
                  value={tempGoal}
                  onChange={(e) => setTempGoal(e.target.value)}
                  className="bg-[#0A0A0A] border border-white/15 focus:border-[#B35B48] text-xs font-mono px-2 py-1 text-white rounded w-24 outline-none"
                  autoFocus
                />
                <button type="submit" className="text-[10px] bg-emerald-900/30 text-emerald-400 border border-emerald-900/50 px-2 py-1 rounded hover:bg-emerald-800/30">Salvar</button>
              </form>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-light text-white">{formatCurrency(sellerGoal)}</span>
                <button 
                  onClick={() => {
                    setTempGoal(sellerGoal.toString());
                    setIsEditingGoal(true);
                  }}
                  className="text-[9px] text-[#B35B48] hover:underline"
                >
                  Ajustar
                </button>
              </div>
            )}

            <div className="mt-3">
              <div className="flex justify-between text-[9px] text-gray-500 font-mono mb-1">
                <span>Progresso: {goalPercentage.toFixed(0)}%</span>
                <span>{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#B35B48] to-amber-500 h-1.5 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${goalPercentage}%` }}
                ></div>
              </div>
            </div>
          </div>

        </div>

        {/* Visual Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Revenue Evolution Chart */}
          <div className="glass rounded-lg p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xs uppercase tracking-widest opacity-60 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[#B35B48]" />
                  <span>Evolução das Minhas Vendas</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">Desempenho de faturamento nos últimos 7 dias</p>
              </div>
              <span className="text-[10px] font-mono opacity-40">Hoje: {new Date().toLocaleDateString('pt-BR')}</span>
            </div>

            <div className="h-64" id="seller-evolution-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesOverTimeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B35B48" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#B35B48" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="data" stroke="#666" fontSize={11} tickLine={false} />
                  <YAxis stroke="#666" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0A0A0A', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} 
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    itemStyle={{ color: '#B35B48' }}
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Faturamento']}
                  />
                  <Area type="monotone" dataKey="valor" stroke="#B35B48" fillOpacity={1} fill="url(#colorValor)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Seller Best Sellers list */}
          <div className="glass rounded-lg p-6">
            <div className="mb-6">
              <h3 className="text-xs uppercase tracking-widest opacity-60">Meus Perfumes Mais Vendidos</h3>
              <p className="text-xs text-gray-400 mt-1">Sua classificação pessoal de vendas por perfume</p>
            </div>

            <div className="space-y-4 max-h-64 overflow-y-auto pr-1">
              {sellerProductSales.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500 italic">
                  Nenhum perfume vendido ainda. Realize sua primeira venda no PDV!
                </div>
              ) : (
                sellerProductSales.map((prod, idx) => (
                  <div key={prod.name} className="flex items-center justify-between p-3 rounded border border-white/5 bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                      <div className="h-6 w-6 rounded-full bg-terracotta-900/20 text-terracotta-400 font-mono text-[10px] font-bold flex items-center justify-center border border-terracotta-500/10">
                        {idx + 1}
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-white">{prod.name}</h4>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{prod.quantidade} unidades vendidas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-white">{formatCurrency(prod.faturamento)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Recent sales and safety stock row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Recent Sales list */}
          <div className="glass rounded-lg p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs uppercase tracking-widest opacity-60">Suas Últimas Vendas Registradas</h3>
                <p className="text-xs text-gray-400 mt-1">Acompanhamento das suas faturas recentes</p>
              </div>
            </div>

            <div className="space-y-3" id="seller-recent-sales">
              {recentSales.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500 italic">
                  Nenhuma venda realizada recentemente.
                </div>
              ) : (
                recentSales.map((sale) => (
                  <div 
                    key={sale.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded border border-white/5 bg-white/[0.01] hover:border-[#B35B48]/30 transition-all duration-300 gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 border border-white/10 rounded text-[#B35B48]">
                        <BadgeDollarSign className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-white">{sale.clientName}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">{sale.productName} • Qtd: {sale.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-mono font-bold text-white">{formatCurrency(sale.totalPrice)}</span>
                        <p className="text-[9px] text-gray-500 font-mono mt-0.5">{new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        sale.status === 'Pago' 
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20' 
                          : 'bg-amber-950/40 text-amber-500 border border-amber-900/20'
                      }`}>
                        {sale.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Stock security warning list */}
          <div className="glass rounded-lg p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase tracking-widest opacity-60">Níveis de Estoque</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Acompanhe o estoque crítico de Lalletre Maison antes de registrar faturamentos no PDV:
              </p>

              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {criticalStockList.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-500 italic">
                    ✓ Todos os itens estão com níveis de estoque saudáveis.
                  </div>
                ) : (
                  criticalStockList.map(prod => (
                    <div key={prod.id} className="flex items-center justify-between p-2.5 rounded border border-white/5 bg-white/[0.01]">
                      <div>
                        <h4 className="text-xs font-semibold text-white">{prod.name}</h4>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">{prod.size}</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          prod.stock === 0 
                            ? 'bg-red-900/20 text-red-400 border border-red-900/30' 
                            : 'bg-orange-900/20 text-orange-400 border border-orange-900/30'
                        }`}>
                          {prod.stock === 0 ? '0 un.' : `${prod.stock} un.`}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="text-[10px] text-gray-500 leading-relaxed mt-4 pt-4 border-t border-white/5">
              Caso algum perfume esteja zerado, solicite reposição ao Administrador Master.
            </div>
          </div>

        </div>

      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in p-8 max-w-7xl mx-auto" id="dashboard-view">
      
      {/* Upper header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-light text-white">
            Visão Geral do <span className="font-serif italic text-[#B35B48]">Relacionamento</span>
          </h2>
          <p className="text-sm opacity-50 mt-1">
            Monitoramento centralizado de leads e disponibilidade
          </p>
        </div>
        
        {/* Quick actions buttons */}
        <div className="flex items-center gap-4">
          <button
            onClick={onQuickAddLead}
            className="px-4 py-2 border border-[#B35B48] text-[#B35B48] text-xs rounded hover:bg-[#B35B48] hover:text-white cursor-pointer transition-all duration-300"
            id="quick-add-lead-btn"
          >
            + Novo Lead
          </button>
          
          <button
            onClick={onQuickAddSale}
            className="px-4 py-2 bg-[#B35B48] text-white text-xs rounded hover:bg-[#9c4c3b] cursor-pointer transition-all duration-300"
            id="quick-add-sale-btn"
          >
            Registrar Venda
          </button>
        </div>
      </header>

      {/* Filter Bar for Admin */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded bg-white/[0.02] border border-white/5" id="admin-filter-bar">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#B35B48]" />
          <span className="text-xs text-gray-300">Visualizando informações de vendas de:</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">Filtrar por Vendedor:</span>
          <select
            id="seller-select"
            value={selectedSellerId}
            onChange={(e) => setSelectedSellerId(e.target.value)}
            className="bg-[#0A0A0A] text-xs text-white border border-white/10 rounded px-3 py-1.5 focus:border-[#B35B48] focus:outline-none cursor-pointer min-w-[200px]"
          >
            <option value="todos">Todos os Vendedores (Geral)</option>
            {allUsers.map(user => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.role === 'Vendedor' ? 'Vendedor' : user.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6" id="stats-grid">
        
        {/* Total Leads */}
        <div className="glass rounded-lg p-6 relative overflow-hidden hover:border-[#B35B48]/30 transition-all duration-300">
          <div className="text-[10px] uppercase opacity-40 mb-1">Total de Leads</div>
          <div className="text-3xl font-light text-white">{totalLeads}</div>
          <div className="text-[10px] text-[#B35B48] mt-1 font-mono">+12% este mês</div>
        </div>

        {/* Total Stock */}
        <div className="glass rounded-lg p-6 relative overflow-hidden hover:border-[#B35B48]/30 transition-all duration-300">
          <div className="text-[10px] uppercase opacity-40 mb-1">Frascos em Estoque</div>
          <div className="text-3xl font-light text-white">{totalStockUnits}</div>
          <div className="text-[10px] text-[#B35B48] font-semibold uppercase tracking-widest mt-1">
            {outOfStockCount > 0 ? `${outOfStockCount} ESGOTADO(S)` : 'ABASTECIDO'}
          </div>
        </div>

        {/* Revenue */}
        <div className="glass rounded-lg p-6 relative overflow-hidden hover:border-[#B35B48]/30 transition-all duration-300">
          <div className="text-[10px] uppercase opacity-40 mb-1">Valor em Estoque (Faturado)</div>
          <div className="text-3xl font-light text-white">{formatCurrency(totalRevenue)}</div>
          <div className="text-[10px] opacity-40 mt-1">Ativo: {products.length} SKUs</div>
        </div>

        {/* Conversion Rate */}
        <div className="glass rounded-lg p-6 relative overflow-hidden hover:border-[#B35B48]/30 transition-all duration-300">
          <div className="text-[10px] uppercase opacity-40 mb-1">Taxa de Conversão</div>
          <div className="text-3xl font-light text-white">{conversionRate.toFixed(1)}%</div>
          <div className="text-[10px] text-green-500 mt-1">Eficiência: {leadsWon} ganho(s)</div>
        </div>

      </div>

      {/* Bento Layout Part 1: Pipeline & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Pipeline Chart */}
        <div className="glass rounded-lg p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xs uppercase tracking-widest opacity-60">Funil de Relacionamento (Leads)</h3>
              <p className="text-xs text-gray-400 mt-1">Distribuição dos leads em cada estágio de negociação do perfume</p>
            </div>
            <span className="text-[10px] font-mono opacity-40">
              Sincronizado
            </span>
          </div>

          <div className="h-64" id="funnel-chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pipelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#666" fontSize={11} tickLine={false} />
                <YAxis stroke="#666" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0A0A0A', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} 
                  labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  itemStyle={{ color: '#B35B48' }}
                />
                <Bar dataKey="qtd" radius={[2, 2, 0, 0]}>
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Alert panel */}
        <div className="glass rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs uppercase tracking-widest opacity-60">Segurança de Estoque</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Os leads não podem registrar compras se o estoque de Lalletre estiver zerado. Fique de olho nos itens críticos:
            </p>

            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {criticalStockList.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-500 italic">
                  ✓ Não há produtos com estoque crítico (abaixo de 3 unidades).
                </div>
              ) : (
                criticalStockList.map(prod => (
                  <div key={prod.id} className="flex items-center justify-between p-2.5 rounded border border-white/5 bg-white/[0.01]">
                    <div>
                      <h4 className="text-xs font-semibold text-white">{prod.name}</h4>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">{prod.size} • SKU: {prod.sku}</p>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        prod.stock === 0 
                          ? 'bg-red-900/20 text-red-400 border border-red-900/30' 
                          : 'bg-orange-900/20 text-orange-400 border border-orange-900/30'
                      }`}>
                        {prod.stock === 0 ? '0 un.' : `${prod.stock} un.`}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => onNavigate('stock')}
            className="w-full mt-4 flex items-center justify-center gap-1.5 bg-white/[0.02] hover:bg-white/[0.08] text-xs font-medium text-[#B35B48] hover:text-white py-2 rounded border border-white/5 cursor-pointer transition-all duration-300"
          >
            <span>Gerenciar Estoque</span>
            <span>→</span>
          </button>
        </div>

      </div>

      {/* Bento Layout Part 2: Lead Sources & Recent Sales */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Lead Sources Pie Chart */}
        <div className="glass rounded-lg p-6">
          <div className="mb-4">
            <h3 className="text-xs uppercase tracking-widest opacity-60">Origem dos Leads</h3>
            <p className="text-xs text-gray-400 mt-1">Canais de captação de leads interessados</p>
          </div>

          {sourceData.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500 italic">
              Nenhum dado de origem cadastrado.
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sourceData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {sourceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0A0A0A', borderColor: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}
                      itemStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Legend */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 w-full text-[11px] text-gray-400">
                {sourceData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="truncate">{entry.name}: <strong className="text-white">{entry.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Sales List */}
        <div className="glass rounded-lg p-6 lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xs uppercase tracking-widest opacity-60">Últimas Vendas Registradas</h3>
                <p className="text-xs text-gray-400 mt-1">Fluxo recente de faturamento do perfume Lalletre</p>
              </div>
              <button
                onClick={() => onNavigate('sales')}
                className="text-xs text-[#B35B48] hover:text-[#c6715f] font-medium transition-all duration-300 flex items-center gap-1 cursor-pointer"
              >
                <span>Ver todas</span>
                <span>→</span>
              </button>
            </div>

            <div className="space-y-3" id="recent-sales-list">
              {recentSales.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-500 italic">
                  Nenhuma venda registrada ainda. Clique em "Registrar Venda" para começar.
                </div>
              ) : (
                recentSales.map((sale) => (
                  <div 
                    key={sale.id} 
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded border border-white/5 bg-white/[0.01] hover:border-[#B35B48]/30 transition-all duration-300 gap-2"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 border border-white/10 rounded text-[#B35B48]">
                        <BadgeDollarSign className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-white">{sale.clientName}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">{sale.productName} • Qtd: {sale.quantity}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-mono font-bold text-white">{formatCurrency(sale.totalPrice)}</span>
                        <p className="text-[9px] text-gray-500 font-mono mt-0.5">{new Date(sale.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        sale.status === 'Pago' 
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20' 
                          : 'bg-amber-950/40 text-amber-500 border border-amber-900/20'
                      }`}>
                        {sale.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] opacity-40 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Estoque integrado: vendas deduzem estoque automaticamente.</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
