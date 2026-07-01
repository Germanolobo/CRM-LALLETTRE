import React, { useState, useMemo, useRef } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingBag, 
  Check, 
  Loader2, 
  Receipt, 
  User, 
  UserPlus, 
  Tag, 
  Sparkles, 
  QrCode, 
  CreditCard, 
  Wallet, 
  Percent,
  CheckCircle2,
  Printer,
  ChevronRight,
  Package,
  ArrowLeft
} from 'lucide-react';
import { Product, Lead, Sale } from '../types';
import { db } from '../firebase';
import { setDoc, doc } from 'firebase/firestore';

interface PDVManagerProps {
  products: Product[];
  leads: Lead[];
  onAddSale: (sale: Omit<Sale, 'id' | 'date'>) => Promise<void>;
  onAddLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'totalSpent'>) => Promise<void>;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function PDVManager({ products, leads, onAddSale, onAddLead }: PDVManagerProps) {
  // Navigation & Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [sizeFilter, setSizeFilter] = useState<string>('Todos');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Discount States
  const [discountType, setDiscountType] = useState<'percent' | 'fixed'>('percent');
  const [discountValue, setDiscountValue] = useState<number>(0);

  // Client Modes
  // 'final' = Anonymous Consumidor Final
  // 'existing' = Choose from registered leads
  // 'new' = Register new customer on the fly
  const [clientMode, setClientMode] = useState<'final' | 'existing' | 'new'>('final');
  
  // New Client Form
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientSource, setNewClientSource] = useState('PDV (Físico)');

  // Selected Existing Client
  const [selectedLeadId, setSelectedLeadId] = useState('');

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Dinheiro'>('PIX');

  // Transaction Process States
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedTransaction, setCompletedTransaction] = useState<{
    saleIds: string[];
    clientName: string;
    items: { productName: string; quantity: number; total: number }[];
    subtotal: number;
    discount: number;
    total: number;
    paymentMethod: string;
    date: string;
  } | null>(null);

  // Filter products by search & size
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSize = sizeFilter === 'Todos' || p.size === sizeFilter;
      return matchesSearch && matchesSize;
    });
  }, [products, searchQuery, sizeFilter]);

  // Unique sizes for filter buttons
  const uniqueSizes = useMemo(() => {
    const sizes = new Set<string>();
    products.forEach(p => {
      if (p.size) sizes.add(p.size);
    });
    return ['Todos', ...Array.from(sizes)];
  }, [products]);

  // Cart Handlers
  const addToCart = (product: Product) => {
    if (product.stock <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          return prev; // cannot exceed stock
        }
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.stock) return item; // cannot exceed stock
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter((item): item is CartItem => item !== null);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountValue(0);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientEmail('');
    setSelectedLeadId('');
    setClientMode('final');
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return (subtotal * discountValue) / 100;
    }
    return Math.min(discountValue, subtotal);
  }, [subtotal, discountType, discountValue]);

  const finalTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  // Finalize Transaction
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setErrorMsg(null);
    setIsProcessing(true);

    try {
      let finalClientId = 'pdv_balcao';
      let finalClientName = 'Consumidor Final';

      // 1. Process Client Mode
      if (clientMode === 'existing') {
        if (!selectedLeadId) {
          throw new Error('Por favor, selecione um cliente cadastrado.');
        }
        const activeLead = leads.find(l => l.id === selectedLeadId);
        if (!activeLead) {
          throw new Error('Cliente selecionado não encontrado.');
        }
        finalClientId = activeLead.id;
        finalClientName = activeLead.name;
      } else if (clientMode === 'new') {
        if (!newClientName.trim()) {
          throw new Error('Por favor, insira o nome do novo cliente.');
        }

        const generatedId = `lead_pdv_${Date.now()}`;
        // Create the lead on the fly with a closed/fechado status and source PDV
        const newLeadData = {
          id: generatedId,
          name: newClientName.trim(),
          phone: newClientPhone.trim(),
          email: newClientEmail.trim() || `${generatedId}@lallettre.com`,
          status: 'fechado',
          interestSize: cart[0]?.product.size || 'Ambos',
          source: newClientSource,
          notes: 'Cliente cadastrado via checkout direto no PDV físico.',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          totalSpent: 0 // Will be updated by transactions automatically
        };

        await setDoc(doc(db, 'leads', generatedId), newLeadData);
        finalClientId = generatedId;
        finalClientName = newClientName.trim();
      }

      // 2. Add each cart item as a sale
      const saleIds: string[] = [];
      const receiptItems: { productName: string; quantity: number; total: number }[] = [];

      // Pro-rate discount among items for precise individual transaction records
      const proRataFactor = subtotal > 0 ? finalTotal / subtotal : 1;

      for (const item of cart) {
        const itemSubtotal = item.product.price * item.quantity;
        const itemFinalPrice = itemSubtotal * proRataFactor;

        const salePayload = {
          clientId: finalClientId,
          clientName: finalClientName,
          productId: item.product.id,
          productName: `${item.product.name} (${item.product.size})`,
          quantity: item.quantity,
          unitPrice: item.product.price,
          totalPrice: parseFloat(itemFinalPrice.toFixed(2)),
          status: 'Pago' as const
        };

        // This will call the transaction inside App.tsx which safely handles stock decrement
        await onAddSale(salePayload);
        
        receiptItems.push({
          productName: `${item.product.name} (${item.product.size})`,
          quantity: item.quantity,
          total: itemSubtotal
        });
      }

      // 3. Set Completed Transaction state to trigger receipt
      setCompletedTransaction({
        saleIds,
        clientName: finalClientName,
        items: receiptItems,
        subtotal,
        discount: discountAmount,
        total: finalTotal,
        paymentMethod,
        date: new Date().toLocaleString('pt-BR')
      });

      // Clear the working cart
      setCart([]);
    } catch (err: any) {
      console.error("Checkout failed:", err);
      setErrorMsg(err.message || 'Erro inesperado ao processar a venda.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-7xl mx-auto" id="pdv-root">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-light text-white flex items-center gap-2">
            Ponto de Venda <span className="font-serif italic text-[#B35B48]">PDV</span>
            <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">Frente de Loja</span>
          </h2>
          <p className="text-sm opacity-50 mt-1">
            Faturamento físico imediato: selecione produtos, aplique descontos e conclua a venda em segundos sem triagem.
          </p>
        </div>
      </div>

      {completedTransaction ? (
        /* RECEIPT MODAL / TRANSITION VIEW */
        <div className="max-w-md mx-auto glass border border-white/10 rounded-2xl p-6 relative overflow-hidden animate-fade-in" id="pdv-receipt-screen">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-500" />
          
          <div className="flex flex-col items-center text-center my-4">
            <div className="h-12 w-12 rounded-full bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-lg">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-xl text-white">Venda Confirmada!</h3>
            <p className="text-xs text-gray-400 mt-1">Estoque atualizado e faturado com sucesso.</p>
          </div>

          <div className="border-t border-dashed border-white/10 my-4" />

          {/* Recibo Printable Style */}
          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-4 space-y-4 font-mono text-xs text-gray-300" id="printable-receipt">
            <div className="text-center font-serif text-[#DFBA73] text-sm tracking-wide">
              Lallettre Maison de Parfum
            </div>
            <div className="text-center text-[10px] text-gray-500">
              {completedTransaction.date}
            </div>

            <div className="border-b border-dashed border-white/10 pb-2">
              <span className="text-gray-500">Cliente:</span>
              <p className="text-white font-sans font-medium">{completedTransaction.clientName}</p>
            </div>

            <div className="space-y-1">
              <span className="text-gray-500">Itens:</span>
              {completedTransaction.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-white">
                  <span>{item.quantity}x {item.productName}</span>
                  <span>{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-white/10 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal:</span>
                <span>{formatCurrency(completedTransaction.subtotal)}</span>
              </div>
              {completedTransaction.discount > 0 && (
                <div className="flex justify-between text-red-400">
                  <span>Desconto:</span>
                  <span>-{formatCurrency(completedTransaction.discount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-white text-xs border-t border-white/5 pt-1.5 font-sans">
                <span>TOTAL PAGO:</span>
                <span className="text-[#DFBA73]">{formatCurrency(completedTransaction.total)}</span>
              </div>
            </div>

            <div className="flex justify-between text-[10px] text-gray-400 pt-2 border-t border-dashed border-white/10">
              <span>Forma de Pagamento:</span>
              <span className="font-bold text-white uppercase">{completedTransaction.paymentMethod}</span>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setCompletedTransaction(null)}
              className="flex-1 py-2.5 bg-[#B35B48] hover:bg-[#c26a57] text-white rounded-lg text-xs font-semibold tracking-wider transition-colors cursor-pointer text-center"
            >
              Nova Venda
            </button>
            <button
              onClick={handlePrint}
              className="px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-gray-300 flex items-center justify-center gap-2"
              title="Imprimir"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      ) : (
        /* PRIMARY PDV INTERFACE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" id="pdv-main-grid">
          
          {/* Left Side: Product Selector (8 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Search & Filtering bar */}
            <div className="glass bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
              
              {/* Search Bar */}
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Buscar perfume ou SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#0d0d0d] border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-terracotta-500/50 transition-colors"
                />
              </div>

              {/* Sizes Filter */}
              <div className="flex gap-1.5 self-start md:self-auto overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
                {uniqueSizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSizeFilter(size)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
                      sizeFilter === size
                        ? 'bg-terracotta-950/40 border border-terracotta-500/40 text-terracotta-400 font-semibold'
                        : 'bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4" id="pdv-products-grid">
              {filteredProducts.length === 0 ? (
                <div className="col-span-full glass border border-white/5 rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-3">
                  <Package className="h-8 w-8 text-gray-600" />
                  <p className="text-xs text-gray-500">Nenhum perfume encontrado com estes filtros.</p>
                </div>
              ) : (
                filteredProducts.map((prod) => {
                  const isOutOfStock = prod.stock <= 0;
                  const cartItem = cart.find(item => item.product.id === prod.id);
                  const remainingStock = prod.stock - (cartItem?.quantity || 0);

                  return (
                    <div 
                      key={prod.id}
                      onClick={() => !isOutOfStock && remainingStock > 0 && addToCart(prod)}
                      className={`glass border transition-all duration-300 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden select-none ${
                        isOutOfStock 
                          ? 'opacity-40 border-white/5 bg-transparent cursor-not-allowed'
                          : remainingStock <= 0
                            ? 'border-terracotta-900/20 bg-white/[0.01] hover:border-terracotta-900/30 cursor-not-allowed'
                            : 'border-white/5 bg-white/[0.01] hover:border-terracotta-500/20 hover:scale-[1.01] cursor-pointer'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[9px] bg-[#B35B48]/10 text-[#B35B48] border border-[#B35B48]/20 px-2 py-0.5 rounded font-mono">
                            {prod.size}
                          </span>
                          <span className="text-[9px] text-gray-500 font-mono tracking-wider">{prod.sku}</span>
                        </div>

                        <h4 className="font-serif text-sm font-medium text-white truncate pt-1">{prod.name}</h4>
                        <p className="text-[11px] text-gray-500 line-clamp-1">{prod.description || 'Fragrância artesanal Lallettre.'}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#DFBA73] font-mono">
                          {formatCurrency(prod.price)}
                        </span>

                        <div className="text-[10px] font-mono">
                          {isOutOfStock ? (
                            <span className="text-red-400 font-semibold uppercase">Esgotado</span>
                          ) : remainingStock <= 0 ? (
                            <span className="text-amber-500 font-semibold">Limite Estoque</span>
                          ) : (
                            <span className="text-gray-500">
                              Estoque: <strong className="text-gray-300">{remainingStock}</strong>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Item Count indicator badge */}
                      {cartItem && (
                        <div className="absolute top-2 right-2 h-5 w-5 bg-[#B35B48] rounded-full flex items-center justify-center font-bold text-[10px] text-white shadow-lg animate-scale-up">
                          {cartItem.quantity}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Right Side: Cart Summary & Checkout Details (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="glass bg-[#0d0d0d]/80 border border-white/5 rounded-2xl p-6 space-y-5 sticky top-6" id="pdv-checkout-panel">
              
              {/* Cart Header */}
              <div className="flex justify-between items-center border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-[#B35B48]" />
                  <span className="text-xs uppercase font-mono tracking-wider text-gray-300 font-semibold">
                    Carrinho ({cart.reduce((s, i) => s + i.quantity, 0)})
                  </span>
                </div>
                {cart.length > 0 && (
                  <button 
                    onClick={clearCart}
                    className="text-[10px] font-mono text-red-400/70 hover:text-red-400 uppercase tracking-wider cursor-pointer"
                  >
                    Limpar
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
                    <ShoppingBag className="h-6 w-6 opacity-30" />
                    <span>Selecione perfumes à esquerda para iniciar.</span>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div 
                      key={item.product.id} 
                      className="flex items-center justify-between gap-3 bg-white/[0.01] border border-white/5 rounded-xl p-2.5"
                    >
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-semibold text-white truncate">{item.product.name}</p>
                        <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                          {item.product.size} • {formatCurrency(item.product.price)}
                        </p>
                      </div>

                      {/* Quantity Toggles */}
                      <div className="flex items-center gap-2 bg-[#050505] border border-white/5 rounded-lg px-1.5 py-0.5">
                        <button 
                          onClick={() => updateCartQuantity(item.product.id, -1)}
                          className="text-gray-400 hover:text-white p-1 cursor-pointer transition-colors"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="text-xs font-bold font-mono text-white min-w-4 text-center">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => updateCartQuantity(item.product.id, 1)}
                          className="text-gray-400 hover:text-white p-1 cursor-pointer transition-colors disabled:opacity-30"
                          disabled={item.quantity >= item.product.stock}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Total and Trash */}
                      <div className="text-right flex items-center gap-2">
                        <span className="text-xs font-bold text-white font-mono shrink-0">
                          {formatCurrency(item.product.price * item.quantity)}
                        </span>
                        <button 
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-gray-500 hover:text-red-400 p-1 cursor-pointer transition-colors shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Client Mode Configuration */}
              <div className="border-t border-white/5 pt-4 space-y-3.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block mb-1">
                  Identificar Cliente
                </span>

                {/* Mode Selector Buttons */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-white/[0.02] border border-white/5 rounded-xl">
                  <button
                    onClick={() => setClientMode('final')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      clientMode === 'final'
                        ? 'bg-terracotta-950/40 border border-terracotta-500/20 text-terracotta-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Balcão
                  </button>
                  <button
                    onClick={() => setClientMode('existing')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      clientMode === 'existing'
                        ? 'bg-terracotta-950/40 border border-terracotta-500/20 text-terracotta-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    CRM
                  </button>
                  <button
                    onClick={() => setClientMode('new')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-mono uppercase tracking-wider transition-all cursor-pointer ${
                      clientMode === 'new'
                        ? 'bg-terracotta-950/40 border border-terracotta-500/20 text-terracotta-400'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Novo +
                  </button>
                </div>

                {/* Sub-Forms based on selection */}
                {clientMode === 'existing' && (
                  <div className="space-y-1 bg-white/[0.01] border border-white/5 p-3 rounded-xl animate-scale-up">
                    <label className="text-[10px] text-gray-400">Selecionar do CRM</label>
                    <select
                      value={selectedLeadId}
                      onChange={(e) => setSelectedLeadId(e.target.value)}
                      className="w-full bg-[#0d0d0d] border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-terracotta-500/50 transition-colors"
                    >
                      <option value="">-- Escolha o Cliente --</option>
                      {leads
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(l => (
                          <option key={l.id} value={l.id}>{l.name} ({l.phone || 'Sem fone'})</option>
                        ))
                      }
                    </select>
                  </div>
                )}

                {clientMode === 'new' && (
                  <div className="space-y-2.5 bg-white/[0.01] border border-white/5 p-3 rounded-xl animate-scale-up">
                    <div className="grid grid-cols-1 gap-2.5">
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase font-mono block mb-1">Nome Completo *</label>
                        <input
                          type="text"
                          placeholder="Ex: Maria Oliveira"
                          value={newClientName}
                          onChange={(e) => setNewClientName(e.target.value)}
                          className="w-full bg-[#0d0d0d] border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-terracotta-500/50"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-gray-500 uppercase font-mono block mb-1">Celular / WhatsApp</label>
                          <input
                            type="text"
                            placeholder="(11) 99999-9999"
                            value={newClientPhone}
                            onChange={(e) => setNewClientPhone(e.target.value)}
                            className="w-full bg-[#0d0d0d] border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-gray-500 uppercase font-mono block mb-1">Origem Venda</label>
                          <select
                            value={newClientSource}
                            onChange={(e) => setNewClientSource(e.target.value)}
                            className="w-full bg-[#0d0d0d] border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none"
                          >
                            <option value="PDV (Físico)">Loja Física</option>
                            <option value="Bazar / Evento">Bazar / Evento</option>
                            <option value="Indicação">Indicação</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-500 uppercase font-mono block mb-1">E-mail (Opcional)</label>
                        <input
                          type="email"
                          placeholder="maria@email.com"
                          value={newClientEmail}
                          onChange={(e) => setNewClientEmail(e.target.value)}
                          className="w-full bg-[#0d0d0d] border border-white/5 rounded-lg p-2 text-xs text-white focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Discounts Section */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block mb-1">
                  Conceder Desconto
                </span>

                <div className="flex gap-2 items-center">
                  <div className="flex bg-white/[0.02] border border-white/5 rounded-xl p-0.5">
                    <button
                      type="button"
                      onClick={() => { setDiscountType('percent'); setDiscountValue(0); }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        discountType === 'percent' ? 'bg-terracotta-950/40 text-[#B35B48]' : 'text-gray-500 hover:text-white'
                      }`}
                    >
                      <Percent className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDiscountType('fixed'); setDiscountValue(0); }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                        discountType === 'fixed' ? 'bg-terracotta-950/40 text-[#B35B48]' : 'text-gray-500 hover:text-white'
                      }`}
                    >
                      <span>R$</span>
                    </button>
                  </div>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      placeholder={discountType === 'percent' ? 'Ex: 10%' : 'Ex: R$ 50'}
                      value={discountValue || ''}
                      onChange={(e) => setDiscountValue(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full bg-[#0d0d0d] border border-white/5 rounded-xl py-1.5 px-3 text-xs text-white pr-8 focus:outline-none focus:border-terracotta-500/50"
                      min="0"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono">
                      {discountType === 'percent' ? '%' : 'BRL'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 block mb-1">
                  Forma de Pagamento
                </span>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'PIX', icon: QrCode, label: 'PIX' },
                    { id: 'Cartão de Crédito', icon: CreditCard, label: 'Crédito' },
                    { id: 'Cartão de Débito', icon: CreditCard, label: 'Débito' },
                    { id: 'Dinheiro', icon: Wallet, label: 'Dinheiro' }
                  ].map((method) => {
                    const MethodIcon = method.icon;
                    const isSelected = paymentMethod === method.id;

                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => setPaymentMethod(method.id as any)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-terracotta-950/20 border-[#B35B48]/50 text-white shadow-md shadow-[#B35B48]/5'
                            : 'bg-[#0d0d0d] border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                        }`}
                      >
                        <MethodIcon className={`h-4 w-4 ${isSelected ? 'text-[#B35B48]' : 'text-gray-500'}`} />
                        <span className="text-[11px] font-sans font-medium">{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pricing Math Breakdowns */}
              <div className="border-t border-white/5 pt-4 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Desconto concedido:</span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm font-bold text-white border-t border-white/5 pt-2 font-sans">
                  <span>Total Final:</span>
                  <span className="text-lg text-[#DFBA73] font-mono">{formatCurrency(finalTotal)}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl p-3 text-xs flex gap-2 animate-scale-up">
                  <span className="font-bold">Aviso:</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Checkout CTA */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0 || isProcessing}
                className={`w-full py-3 rounded-xl font-semibold tracking-wider transition-all duration-300 text-xs flex items-center justify-center gap-2 cursor-pointer ${
                  cart.length === 0 
                    ? 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5' 
                    : 'bg-[#B35B48] hover:bg-[#c26a57] text-white font-medium shadow-lg hover:shadow-xl hover:shadow-[#B35B48]/10'
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Lançando Faturamento...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Finalizar Venda</span>
                  </>
                )}
              </button>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
