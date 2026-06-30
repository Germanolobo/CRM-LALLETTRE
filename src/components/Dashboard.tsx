import React from 'react';
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
  TrendingDown
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
import { Lead, Product, Sale } from '../types';

interface DashboardProps {
  leads: Lead[];
  products: Product[];
  sales: Sale[];
  onNavigate: (tab: string) => void;
  onQuickAddLead: () => void;
  onQuickAddSale: () => void;
  funnelStages?: { id: string; label: string; color: string; bg: string }[];
}

export default function Dashboard({ 
  leads, 
  products, 
  sales, 
  onNavigate, 
  onQuickAddLead, 
  onQuickAddSale,
  funnelStages = []
}: DashboardProps) {

  // Calculations
  const totalLeads = leads.length;
  
  const totalStockUnits = products.reduce((acc, curr) => acc + curr.stock, 0);
  const lowStockCount = products.filter(p => p.stock < 5 && p.stock > 0).length;
  const outOfStockCount = products.filter(p => p.stock === 0).length;

  const paidSales = sales.filter(s => s.status === 'Pago');
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
  const recentSales = [...sales]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  // Format currency helper
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

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
