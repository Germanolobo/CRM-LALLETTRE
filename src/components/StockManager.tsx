import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  PlusCircle, 
  MinusCircle, 
  Sparkles, 
  TrendingUp, 
  DollarSign, 
  Layers, 
  Trash2, 
  X,
  Edit2
} from 'lucide-react';
import { Product } from '../types';

interface StockManagerProps {
  products: Product[];
  onAddProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  onUpdateStock: (productId: string, newStock: number) => Promise<void>;
  onDeleteProduct: (productId: string) => Promise<void>;
  onUpdateProduct: (productId: string, updatedProduct: Partial<Product>) => Promise<void>;
}

export default function StockManager({ 
  products, 
  onAddProduct, 
  onUpdateStock, 
  onDeleteProduct,
  onUpdateProduct
}: StockManagerProps) {

  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form State
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    size: '100ml',
    stock: 10,
    price: 350,
    description: '',
    sku: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered products
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalProducts = products.length;
  const totalStockUnits = products.reduce((sum, p) => sum + p.stock, 0);
  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock < 5).length;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name.trim()) return;

    try {
      setIsSubmitting(true);
      
      // Auto-generate SKU if blank
      const sku = newProductForm.sku.trim() || `LL-${newProductForm.name.slice(0, 2).toUpperCase()}-${newProductForm.size.replace(/\D/g, '')}`;

      await onAddProduct({
        ...newProductForm,
        sku
      });

      setNewProductForm({
        name: '',
        size: '100ml',
        stock: 10,
        price: 350,
        description: '',
        sku: ''
      });
      setIsAddModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      setIsSubmitting(true);
      await onUpdateProduct(editingProduct.id, {
        name: editingProduct.name,
        size: editingProduct.size,
        price: editingProduct.price,
        stock: editingProduct.stock,
        sku: editingProduct.sku,
        description: editingProduct.description
      });
      setEditingProduct(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdjust = async (productId: string, currentStock: number, change: number) => {
    const newStock = Math.max(0, currentStock + change);
    await onUpdateStock(productId, newStock);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto" id="stock-manager-view">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-light text-white">
            Controle de <span className="font-serif italic text-[#B35B48]">Estoque</span>
          </h2>
          <p className="text-sm opacity-50 mt-1">
            Garanta que leads não realizem compras se não houver frascos disponíveis. Gerencie a produção Lalletre.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-[#B35B48] text-white text-xs rounded hover:bg-[#9c4c3b] cursor-pointer transition-all duration-300"
          id="add-product-btn"
        >
          + Cadastrar Perfume
        </button>
      </div>

      {/* Stock Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5" id="stock-metrics">
        
        <div className="glass rounded-lg p-5 border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-white/[0.02] text-[#B35B48]">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">Tipos de Perfumes</span>
            <p className="text-xl font-medium text-white mt-0.5">{totalProducts}</p>
          </div>
        </div>

        <div className="glass rounded-lg p-5 border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-white/[0.02] text-[#B35B48]">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">Unidades Totais</span>
            <p className="text-xl font-medium text-white mt-0.5">{totalStockUnits}</p>
          </div>
        </div>

        <div className="glass rounded-lg p-5 border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-red-950/10 text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">Itens Esgotados</span>
            <p className="text-xl font-medium text-red-400 mt-0.5">{outOfStockCount}</p>
          </div>
        </div>

        <div className="glass rounded-lg p-5 border border-white/5 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-950/10 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-mono uppercase text-gray-500 tracking-wider">Estoque Baixo (&lt; 5)</span>
            <p className="text-xl font-medium text-amber-500 mt-0.5">{lowStockCount}</p>
          </div>
        </div>

      </div>

      {/* Search Toolbar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
        <input
          type="text"
          placeholder="Filtrar por nome do perfume ou SKU..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#0A0A0A] border border-white/10 focus:border-[#B35B48] rounded pl-10 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 outline-none transition-all duration-300"
        />
      </div>

      {/* Stock Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="stock-cards-grid">
        {filteredProducts.length === 0 ? (
          <div className="py-16 text-center text-gray-500 md:col-span-3 font-mono border border-dashed border-white/10 rounded-lg">
            Nenhum perfume cadastrado ou correspondente à busca.
          </div>
        ) : (
          filteredProducts.map((prod) => {
            const isOutOfStock = prod.stock === 0;
            const isLowStock = prod.stock > 0 && prod.stock < 5;

            return (
              <div 
                key={prod.id}
                className={`glass rounded-lg border p-6 flex flex-col justify-between transition-all duration-300 hover:border-[#B35B48]/30 ${
                  isOutOfStock 
                    ? 'border-red-950/50 bg-gradient-to-b from-transparent to-red-950/5' 
                    : isLowStock 
                    ? 'border-amber-950/50' 
                    : 'border-white/5'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="bg-white/5 border border-white/10 px-2 py-0.5 rounded text-[9px] font-mono text-[#B35B48]">
                        {prod.size}
                      </span>
                      <h3 className="text-base font-medium text-white mt-1.5 leading-snug">
                        {prod.name}
                      </h3>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">SKU: {prod.sku}</p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingProduct(prod)}
                        className="p-1 text-gray-500 hover:text-white rounded transition-all cursor-pointer"
                        title="Editar Perfume"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir perfume "${prod.name}"?`)) {
                            onDeleteProduct(prod.id);
                          }
                        }}
                        className="p-1 text-gray-600 hover:text-red-400 rounded transition-all cursor-pointer"
                        title="Deletar Perfume"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 line-clamp-2 h-8 leading-relaxed mb-4">
                    {prod.description || 'Nenhuma descrição informada.'}
                  </p>
                </div>

                <div className="space-y-4 pt-4 border-t border-white/5">
                  {/* Price & Stock info */}
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-[9px] font-mono text-gray-500 uppercase block">Valor Unitário</span>
                      <span className="text-sm font-mono font-bold text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.price)}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] font-mono text-gray-500 uppercase block mb-0.5">Disponível</span>
                      <span className={`text-base font-mono font-bold ${
                        isOutOfStock ? 'text-red-400' : isLowStock ? 'text-amber-500' : 'text-emerald-400'
                      }`}>
                        {prod.stock} un
                      </span>
                    </div>
                  </div>

                  {/* Stock Warnings */}
                  {isOutOfStock && (
                    <div className="bg-red-950/10 border border-red-900/10 rounded p-2 flex items-center gap-2 text-[10px] text-red-400 font-mono">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                      <span>Esgotado! Leads não conseguirão comprar.</span>
                    </div>
                  )}

                  {isLowStock && (
                    <div className="bg-amber-950/10 border border-amber-900/10 rounded p-2 flex items-center gap-2 text-[10px] text-amber-500 font-mono">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                      <span>Estoque Baixo. Providencie reposição.</span>
                    </div>
                  )}

                  {/* +/- Manual controls */}
                  <div className="flex items-center justify-between gap-2 pt-2 bg-white/[0.02] p-2 rounded border border-white/5">
                    <span className="text-[10px] font-mono text-gray-400">Ajustar Estoque:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleQuickAdjust(prod.id, prod.stock, -1)}
                        className="text-gray-500 hover:text-[#B35B48] transition-all cursor-pointer"
                        disabled={prod.stock === 0}
                      >
                        <MinusCircle className="h-4 w-4" />
                      </button>
                      <span className="text-xs font-mono font-bold text-gray-300 px-1">{prod.stock}</span>
                      <button
                        onClick={() => handleQuickAdjust(prod.id, prod.stock, 1)}
                        className="text-gray-500 hover:text-[#B35B48] transition-all cursor-pointer"
                      >
                        <PlusCircle className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="add-product-modal">
          <div className="glass bg-[#0A0A0A] rounded-lg border border-white/10 w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-terracotta-950 flex items-center justify-between bg-brand-black/40">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-terracotta-400" />
                <span>Novo Perfume Lalletre</span>
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-500 hover:text-white rounded-lg p-1 hover:bg-brand-black transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Nome da Fragrância *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lalletre Intense Parfum"
                  value={newProductForm.name}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name: e.target.value })}
                  className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all duration-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Tamanho (Vol.)</label>
                  <select
                    value={newProductForm.size}
                    onChange={(e) => setNewProductForm({ ...newProductForm, size: e.target.value })}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3 py-2.5 text-sm text-gray-300 outline-none transition-all duration-300"
                  >
                    <option value="100ml">100ml</option>
                    <option value="50ml">50ml</option>
                    <option value="15ml">15ml (Pocket)</option>
                    <option value="Kit">Kit Presente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Código SKU</label>
                  <input
                    type="text"
                    placeholder="Ex: LL-IT-100"
                    value={newProductForm.sku}
                    onChange={(e) => setNewProductForm({ ...newProductForm, sku: e.target.value })}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all duration-300 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Estoque Inicial *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newProductForm.stock}
                    onChange={(e) => setNewProductForm({ ...newProductForm, stock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-200 outline-none transition-all duration-300 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Preço Venda (R$) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newProductForm.price}
                    onChange={(e) => setNewProductForm({ ...newProductForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-200 outline-none transition-all duration-300 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Descrição Olfativa / Detalhes</label>
                <textarea
                  placeholder="Família olfativa, notas de cabeça, notas de coração, etc..."
                  value={newProductForm.description}
                  rows={3}
                  onChange={(e) => setNewProductForm({ ...newProductForm, description: e.target.value })}
                  className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none resize-none transition-all duration-300"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-terracotta-950/40">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-brand-black hover:bg-brand-card-light text-xs font-medium text-gray-400 hover:text-white px-4 py-2.5 rounded-lg border border-terracotta-950 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-terracotta-600 to-terracotta-700 hover:from-terracotta-500 hover:to-terracotta-600 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-md transition-all duration-300"
                >
                  {isSubmitting ? 'Salvando...' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="edit-product-modal">
          <div className="glass bg-[#0A0A0A] rounded-lg border border-white/10 w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-terracotta-950 flex items-center justify-between bg-brand-black/40">
              <h3 className="font-serif text-xl font-bold text-white">Editar {editingProduct.name}</h3>
              <button 
                onClick={() => setEditingProduct(null)}
                className="text-gray-500 hover:text-white rounded-lg p-1 hover:bg-brand-black transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Nome da Fragrância</label>
                <input
                  type="text"
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-200 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Tamanho</label>
                  <select
                    value={editingProduct.size}
                    onChange={(e) => setEditingProduct({ ...editingProduct, size: e.target.value })}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3 py-2.5 text-sm text-gray-300 outline-none"
                  >
                    <option value="100ml">100ml</option>
                    <option value="50ml">50ml</option>
                    <option value="15ml">15ml (Pocket)</option>
                    <option value="Kit">Kit Presente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">SKU</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.sku}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value.toUpperCase() })}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-200 outline-none uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Estoque</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingProduct.stock}
                    onChange={(e) => setEditingProduct({ ...editingProduct, stock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-200 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Preço Venda (R$)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-200 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Descrição</label>
                <textarea
                  value={editingProduct.description}
                  rows={3}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-200 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-terracotta-950/40">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="bg-brand-black hover:bg-brand-card-light text-xs font-medium text-gray-400 hover:text-white px-4 py-2.5 rounded-lg border border-terracotta-950 transition-all duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-terracotta-600 to-terracotta-700 hover:from-terracotta-500 hover:to-terracotta-600 text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-md transition-all duration-300"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
