import React, { useState, useEffect } from 'react';
import { 
  BadgePercent, 
  Plus, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles, 
  Clock, 
  X,
  TrendingUp,
  Package,
  ArrowRight
} from 'lucide-react';
import { Lead, Product, Sale } from '../types';

interface SalesManagerProps {
  sales: Sale[];
  leads: Lead[];
  products: Product[];
  onAddSale: (sale: Omit<Sale, 'id' | 'date'>) => Promise<void>;
  preselectedLeadId?: string;
  onClearPreselectedLead?: () => void;
  isAddSaleOpenDirectly?: boolean;
  setIsAddSaleOpenDirectly?: (open: boolean) => void;
}

export default function SalesManager({ 
  sales, 
  leads, 
  products, 
  onAddSale,
  preselectedLeadId,
  onClearPreselectedLead,
  isAddSaleOpenDirectly,
  setIsAddSaleOpenDirectly
}: SalesManagerProps) {

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form states
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [saleStatus, setSaleStatus] = useState<'Pago' | 'Pendente'>('Pago');

  const [stockError, setStockError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync modal state if triggered from external components
  useEffect(() => {
    if (preselectedLeadId) {
      setSelectedClientId(preselectedLeadId);
      setIsAddModalOpen(true);
    }
  }, [preselectedLeadId]);

  useEffect(() => {
    if (isAddSaleOpenDirectly) {
      setIsAddModalOpen(true);
      if (setIsAddSaleOpenDirectly) setIsAddSaleOpenDirectly(false);
    }
  }, [isAddSaleOpenDirectly]);

  // Find active selections for live display
  const activeProduct = products.find(p => p.id === selectedProductId);
  const activeLead = leads.find(l => l.id === selectedClientId);

  // Live stock validator
  useEffect(() => {
    if (activeProduct) {
      if (activeProduct.stock === 0) {
        setStockError(`O estoque de "${activeProduct.name}" está esgotado.`);
      } else if (activeProduct.stock < quantity) {
        setStockError(`Estoque insuficiente. Apenas ${activeProduct.stock} unidade(s) disponível(is).`);
      } else {
        setStockError('');
      }
    } else {
      setStockError('');
    }
  }, [selectedProductId, quantity, activeProduct]);

  const handleOpenAddModal = () => {
    // Reset form
    setSelectedClientId('');
    setSelectedProductId('');
    setQuantity(1);
    setSaleStatus('Pago');
    setStockError('');
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    if (onClearPreselectedLead) {
      onClearPreselectedLead();
    }
  };

  const handleAddSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedProductId || !activeProduct) return;
    
    // Final check for stock safety
    if (activeProduct.stock < quantity) {
      setStockError(`Estoque insuficiente! O item tem apenas ${activeProduct.stock} unidades.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const totalPrice = activeProduct.price * quantity;

      await onAddSale({
        clientId: selectedClientId,
        clientName: activeLead?.name || 'Cliente',
        productId: selectedProductId,
        productName: `${activeProduct.name} (${activeProduct.size})`,
        quantity,
        unitPrice: activeProduct.price,
        totalPrice,
        status: saleStatus as any
      });

      handleCloseAddModal();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered sales history
  const filteredSales = sales.filter(s => 
    s.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.productName.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto" id="sales-manager-view">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-light text-white">
            Registro de <span className="font-serif italic text-[#B35B48]">Vendas</span>
          </h2>
          <p className="text-sm opacity-50 mt-1">
            Lance pedidos concluídos, fature e atualize o estoque de perfumes Lalletre de forma 100% automatizada.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-[#B35B48] text-white text-xs rounded hover:bg-[#9c4c3b] cursor-pointer transition-all duration-300"
          id="record-sale-btn"
        >
          + Registrar Venda
        </button>
      </div>

      {/* Main layout: History table */}
      <div className="glass rounded-lg overflow-hidden">
        <div className="p-4 bg-white/[0.01] border-b border-white/5">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por nome do cliente ou perfume vendido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0A0A0A] border border-white/10 focus:border-[#B35B48] rounded pl-10 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 outline-none transition-all duration-300"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-sans font-medium tracking-wider text-gray-500 uppercase bg-white/[0.01]">
                <th className="py-4 px-6 font-normal">Cliente</th>
                <th className="py-4 px-6 font-normal">Produto / Volume</th>
                <th className="py-4 px-6 font-normal">Qtd</th>
                <th className="py-4 px-6 font-normal">Valor Unitário</th>
                <th className="py-4 px-6 text-right font-normal">Faturamento Total</th>
                <th className="py-4 px-6 font-normal">Data da Venda</th>
                <th className="py-4 px-6 text-center font-normal">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500 font-mono">
                    Nenhuma venda encontrada no histórico.
                  </td>
                </tr>
              ) : (
                filteredSales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-white/[0.02] transition-all duration-200">
                    <td className="py-4 px-6 font-semibold text-white">{sale.clientName}</td>
                    <td className="py-4 px-6 text-gray-300 font-medium">{sale.productName}</td>
                    <td className="py-4 px-6 font-mono text-gray-400">{sale.quantity}</td>
                    <td className="py-4 px-6 font-mono text-gray-400">{formatCurrency(sale.unitPrice)}</td>
                    <td className="py-4 px-6 text-right font-mono font-bold text-white">
                      {formatCurrency(sale.totalPrice)}
                    </td>
                    <td className="py-4 px-6 font-mono text-gray-400">
                      {new Date(sale.date).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                        sale.status === 'Pago' 
                          ? 'bg-emerald-950/10 text-emerald-400 border border-emerald-900/10' 
                          : 'bg-amber-950/10 text-amber-500 border border-amber-900/10'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Sale Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="add-sale-modal">
          <div className="glass bg-[#0A0A0A] rounded-lg border border-white/10 w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-terracotta-950 flex items-center justify-between bg-brand-black/40">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-terracotta-400 animate-pulse" />
                <span>Registrar Nova Venda</span>
              </h3>
              <button 
                onClick={handleCloseAddModal}
                className="text-gray-500 hover:text-white rounded-lg p-1 hover:bg-brand-black transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSaleSubmit} className="p-6 space-y-4">
              
              {/* Lead/Client Selector */}
              <div>
                <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Selecionar Cliente/Lead *</label>
                <select
                  required
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-300 outline-none transition-all duration-300"
                >
                  <option value="">-- Escolha um Cliente --</option>
                  {leads.map(lead => (
                    <option key={lead.id} value={lead.id}>
                      {lead.name} ({lead.status})
                    </option>
                  ))}
                </select>
                {activeLead && (
                  <span className="text-[10px] text-gray-400 mt-1 block">
                    Obs: Registrar a compra alterará o status deste lead automaticamente para <strong className="text-terracotta-400">Vendido</strong>.
                  </span>
                )}
              </div>

              {/* Product Selector */}
              <div>
                <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Selecionar Perfume Lalletre *</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-300 outline-none transition-all duration-300"
                >
                  <option value="">-- Escolha a Fragrância --</option>
                  {products.map(prod => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} ({prod.size}) - {formatCurrency(prod.price)} [Estoque: {prod.stock} un]
                    </option>
                  ))}
                </select>
                
                {/* Product Stock Live Preview Banner */}
                {activeProduct && (
                  <div className="flex items-center justify-between text-[11px] font-mono mt-1.5 px-2 py-1 rounded bg-brand-black/60 border border-terracotta-950/30">
                    <span className="text-gray-500">Disponível em estoque:</span>
                    <span className={`font-bold ${
                      activeProduct.stock === 0 ? 'text-red-400' : activeProduct.stock <= 3 ? 'text-amber-500' : 'text-emerald-400'
                    }`}>
                      {activeProduct.stock} unidades
                    </span>
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Quantidade *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-200 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Status do Pagamento</label>
                  <select
                    value={saleStatus}
                    onChange={(e) => setSaleStatus(e.target.value as any)}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-300 outline-none"
                  >
                    <option value="Pago">Pago</option>
                    <option value="Pendente">Pendente</option>
                  </select>
                </div>
              </div>

              {/* Total Summary Preview */}
              {activeProduct && (
                <div className="bg-brand-black border border-terracotta-950/60 p-4 rounded-xl flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-mono text-gray-500 uppercase block">Total do Pedido</span>
                    <span className="text-xl font-mono font-extrabold text-white">
                      {formatCurrency(activeProduct.price * quantity)}
                    </span>
                  </div>
                  <div className="text-right text-[10px] text-gray-400 font-mono">
                    <span>{quantity}x {activeProduct.name}</span>
                  </div>
                </div>
              )}

              {/* Live stock error banner */}
              {stockError && (
                <div className="bg-red-950/30 border border-red-900/40 rounded-xl p-3 flex items-start gap-2.5 text-xs text-red-400 font-mono">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-red-400 mt-0.5 animate-pulse" />
                  <div>
                    <span className="font-bold block">Ação Bloqueada:</span>
                    <span>{stockError} Abasteça o estoque antes de concluir esta venda.</span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-terracotta-950/40">
                <button
                  type="button"
                  onClick={handleCloseAddModal}
                  className="bg-brand-black hover:bg-brand-card-light text-xs font-medium text-gray-400 hover:text-white px-4 py-2.5 rounded-lg border border-terracotta-950 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !!stockError || !selectedClientId || !selectedProductId}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-5 py-2.5 rounded-lg shadow-md transition-all duration-300 ${
                    stockError || !selectedClientId || !selectedProductId
                      ? 'bg-gray-800 text-gray-500 border border-gray-950 cursor-not-allowed'
                      : 'bg-gradient-to-r from-terracotta-600 to-terracotta-700 hover:from-terracotta-500 hover:to-terracotta-600 text-white'
                  }`}
                >
                  <span>{isSubmitting ? 'Salvando...' : 'Confirmar Venda'}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
