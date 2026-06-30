import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  MessageSquare, 
  Phone, 
  Mail, 
  Calendar, 
  Filter, 
  FileText, 
  AlertCircle, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  ChevronRight,
  TrendingUp,
  X,
  Clock,
  Sparkles,
  ShoppingBag,
  ArrowRightLeft,
  Sliders,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Lead, LeadStatus, Product, Interaction } from '../types';

interface LeadsManagerProps {
  leads: Lead[];
  products: Product[];
  interactions: Interaction[];
  onAddLead: (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'totalSpent'>) => Promise<void>;
  onUpdateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
  onDeleteLead: (leadId: string) => Promise<void>;
  onAddInteraction: (interaction: Omit<Interaction, 'id' | 'date'>) => Promise<void>;
  onOpenSaleModalForLead: (lead: Lead) => void;
  funnelStages?: { id: string; label: string; color: string; bg: string }[];
  onUpdateFunnelStages?: (stages: { id: string; label: string; color: string; bg: string }[]) => Promise<void>;
}

export default function LeadsManager({ 
  leads, 
  products, 
  interactions, 
  onAddLead, 
  onUpdateLeadStatus, 
  onDeleteLead, 
  onAddInteraction,
  onOpenSaleModalForLead,
  funnelStages = [],
  onUpdateFunnelStages
}: LeadsManagerProps) {

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [sourceFilter, setSourceFilter] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // Selected Lead for Details Modal
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Kanban Columns from dynamic funnelStages
  const columns = funnelStages && funnelStages.length > 0 ? funnelStages : [
    { id: 'nova_solicitacao', label: 'Nova Solicitação', color: 'text-[#B35B48]', bg: 'bg-white/[0.01]' },
    { id: 'separado', label: 'Separado', color: 'text-orange-400', bg: 'bg-white/[0.01]' },
    { id: 'postado_correio', label: 'Postado correio', color: 'text-blue-400', bg: 'bg-white/[0.01]' },
    { id: 'fechado', label: 'Fechado', color: 'text-green-500', bg: 'bg-white/[0.01]' }
  ];

  // Stage customization modal state
  const [isStagesModalOpen, setIsStagesModalOpen] = useState(false);
  const [editingStages, setEditingStages] = useState<{ id: string; label: string; color: string; bg: string }[]>([]);
  const [newStageLabel, setNewStageLabel] = useState('');
  const [newStageColor, setNewStageColor] = useState('text-[#B35B48]');

  // Form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: '',
    email: '',
    phone: '',
    status: (columns[0]?.id || 'nova_solicitacao') as LeadStatus,
    interestSize: '100ml',
    notes: '',
    source: 'Instagram'
  });

  // Interaction Form State
  const [newInteraction, setNewInteraction] = useState({
    type: 'Mensagem' as 'Mensagem' | 'Ligação' | 'E-mail' | 'Reunião' | 'Nota',
    content: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtered Leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lead.phone.includes(searchQuery);
    
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'All' || lead.source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  // Handler to open Add Modal and set default status
  const handleOpenAddModal = () => {
    setNewLeadForm({
      name: '',
      email: '',
      phone: '',
      status: columns[0]?.id || 'nova_solicitacao',
      interestSize: '100ml',
      notes: '',
      source: 'Instagram'
    });
    setIsAddModalOpen(true);
  };

  const handleOpenStagesModal = () => {
    setEditingStages([...columns]);
    setNewStageLabel('');
    setIsStagesModalOpen(true);
  };

  const handleAddStage = () => {
    if (!newStageLabel.trim()) return;
    const newId = `stage_${Date.now()}`;
    const newStage = {
      id: newId,
      label: newStageLabel.trim(),
      color: newStageColor,
      bg: 'bg-white/[0.01]'
    };
    setEditingStages([...editingStages, newStage]);
    setNewStageLabel('');
  };

  const handleRemoveStage = (index: number) => {
    setEditingStages(editingStages.filter((_, i) => i !== index));
  };

  const handleMoveStage = (index: number, direction: 'up' | 'down') => {
    const newStages = [...editingStages];
    if (direction === 'up' && index > 0) {
      const temp = newStages[index];
      newStages[index] = newStages[index - 1];
      newStages[index - 1] = temp;
    } else if (direction === 'down' && index < newStages.length - 1) {
      const temp = newStages[index];
      newStages[index] = newStages[index + 1];
      newStages[index + 1] = temp;
    }
    setEditingStages(newStages);
  };

  const handleSaveStages = async () => {
    if (onUpdateFunnelStages) {
      setIsSubmitting(true);
      try {
        await onUpdateFunnelStages(editingStages);
        setIsStagesModalOpen(false);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name.trim()) return;

    try {
      setIsSubmitting(true);
      await onAddLead(newLeadForm);
      setNewLeadForm({
        name: '',
        email: '',
        phone: '',
        status: columns[0]?.id || 'nova_solicitacao',
        interestSize: '100ml',
        notes: '',
        source: 'Instagram'
      });
      setIsAddModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInteractionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead || !newInteraction.content.trim()) return;

    try {
      setIsSubmitting(true);
      await onAddInteraction({
        clientId: selectedLead.id,
        type: newInteraction.type,
        content: newInteraction.content
      });
      setNewInteraction({ ...newInteraction, content: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const leadInteractions = selectedLead 
    ? interactions
        .filter(i => i.clientId === selectedLead.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      await onUpdateLeadStatus(leadId, targetStatus);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto" id="leads-manager-view">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
        <div>
          <h2 className="text-2xl font-light text-white">
            Gestão de <span className="font-serif italic text-[#B35B48]">Leads & Clientes</span>
          </h2>
          <p className="text-sm opacity-50 mt-1">
            Acompanhe o funil de vendas dos perfumes Lalletre e gerencie interações personalizadas
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white/[0.02] rounded border border-white/5 p-0.5">
            <button
              onClick={() => setViewMode('kanban')}
              className={`px-3 py-1.5 rounded text-xs font-normal transition-all cursor-pointer ${
                viewMode === 'kanban' 
                  ? 'bg-[#B35B48] text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Pipeline
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded text-xs font-normal transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-[#B35B48] text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Lista
            </button>
          </div>

          <button
            onClick={handleOpenStagesModal}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/[0.02] border border-white/10 hover:border-[#B35B48]/50 text-gray-300 hover:text-white text-xs rounded cursor-pointer transition-all duration-300"
            title="Personalizar as etapas do funil de vendas"
            id="config-funnel-btn"
          >
            <Sliders className="h-3.5 w-3.5 text-[#B35B48]" />
            <span className="hidden sm:inline">Etapas do Funil</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-[#B35B48] text-white text-xs rounded hover:bg-[#9c4c3b] cursor-pointer transition-all duration-300"
            id="add-lead-btn"
          >
            + Novo Lead
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 glass p-4 rounded-lg" id="leads-filters">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por nome, e-mail ou WhatsApp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-white/10 focus:border-[#B35B48] rounded pl-10 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 outline-none transition-all duration-300"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-white/10 focus:border-[#B35B48] rounded px-3 py-2 text-xs text-gray-300 outline-none transition-all duration-300"
          >
            <option value="All">Todos os Estágios</option>
            {columns.map(col => (
              <option key={col.id} value={col.id}>{col.label}</option>
            ))}
          </select>
        </div>

        <div>
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-white/10 focus:border-[#B35B48] rounded px-3 py-2 text-xs text-gray-300 outline-none transition-all duration-300"
          >
            <option value="All">Todas as Origens</option>
            <option value="Instagram">Instagram</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Indicação">Indicação</option>
            <option value="Outro">Outro Canal</option>
          </select>
        </div>
      </div>

      {/* View Mode Content */}
      {viewMode === 'kanban' ? (
        /* Kanban View */
        <div className="flex flex-col md:flex-row gap-5 items-start overflow-x-auto pb-4 w-full" id="kanban-board">
          {columns.map((col) => {
            const columnLeads = filteredLeads.filter(l => l.status === col.id);
            return (
              <div 
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`rounded-lg border border-white/5 p-4 shrink-0 w-full md:w-[270px] min-h-[480px] flex flex-col ${col.bg}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#B35B48]"></span>
                    <h3 className="text-xs font-mono font-medium tracking-wider text-gray-300 uppercase">{col.label}</h3>
                  </div>
                  <span className="text-[10px] font-mono opacity-50">
                    {columnLeads.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div className="flex-1 space-y-3 overflow-y-auto max-h-[550px] pr-0.5">
                  {columnLeads.length === 0 ? (
                    <div className="py-12 text-center text-[11px] opacity-30 border border-dashed border-white/10 rounded">
                      Arraste leads para aqui
                    </div>
                  ) : (
                    columnLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onClick={() => setSelectedLead(lead)}
                        className="glass hover:bg-white/[0.08] rounded p-4 border border-white/5 hover:border-[#B35B48]/30 cursor-grab active:cursor-grabbing transition-all duration-300 relative group"
                      >
                        <h4 className="text-xs font-semibold text-white group-hover:text-[#B35B48] transition-colors">
                          {lead.name}
                        </h4>
                        
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-2 font-mono">
                          <span>Interesse: {lead.interestSize}</span>
                        </div>

                        {lead.phone && (
                          <div className="text-[10px] text-gray-500 mt-1 font-mono">{lead.phone}</div>
                        )}

                        <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-white/5">
                          <span className="inline-block bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-[9px] text-gray-400 font-mono">
                            {lead.source}
                          </span>
                          
                          {lead.totalSpent > 0 && (
                            <span className="text-[10px] text-[#B35B48] font-mono font-bold">
                              R$ {lead.totalSpent.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="glass rounded-lg overflow-hidden" id="leads-list">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-[11px] font-sans font-medium tracking-wider text-gray-500 uppercase bg-white/[0.01]">
                  <th className="py-4 px-6 font-normal">Nome do Lead</th>
                  <th className="py-4 px-6 font-normal">Contato</th>
                  <th className="py-4 px-6 font-normal">Origem</th>
                  <th className="py-4 px-6 font-normal">Interesse</th>
                  <th className="py-4 px-6 font-normal">Estágio</th>
                  <th className="py-4 px-6 text-right font-normal">Faturamento</th>
                  <th className="py-4 px-6 text-right font-normal">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-500 font-mono">
                      Nenhum lead encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr 
                      key={lead.id}
                      className="hover:bg-white/[0.02] transition-all duration-200 cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <td className="py-3.5 px-6 font-semibold text-white">{lead.name}</td>
                      <td className="py-3.5 px-6">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-gray-300 font-mono">{lead.phone || '-'}</span>
                          <span className="text-[10px] text-gray-500">{lead.email || '-'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="bg-brand-black border border-terracotta-950/60 text-gray-400 px-2 py-0.5 rounded text-[10px] font-mono">
                          {lead.source}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-mono text-gray-300">{lead.interestSize}</td>
                      <td className="py-3.5 px-6">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                          lead.status === 'Novo' ? 'bg-terracotta-950/50 text-terracotta-400 border border-terracotta-900/30' :
                          lead.status === 'Em Contato' ? 'bg-orange-950/40 text-orange-400 border border-orange-900/30' :
                          lead.status === 'Em Negociação' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/30' :
                          lead.status === 'Vendido' ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-900/30' :
                          'bg-red-950/40 text-red-400 border border-red-900/30'
                        }`}>
                          {lead.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-mono font-bold text-white">
                        {lead.totalSpent > 0 ? `R$ ${lead.totalSpent.toFixed(2)}` : 'R$ 0,00'}
                      </td>
                      <td className="py-3.5 px-6 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="p-1.5 rounded-md hover:bg-brand-black text-gray-400 hover:text-white transition-all"
                            title="Ver Detalhes"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          
                          {lead.status !== 'Vendido' && (
                            <button
                              onClick={() => onOpenSaleModalForLead(lead)}
                              className="p-1.5 rounded-md hover:bg-brand-black text-terracotta-400 hover:text-terracotta-300 transition-all"
                              title="Registrar Compra"
                            >
                              <ShoppingBag className="h-4 w-4" />
                            </button>
                          )}

                          <button
                            onClick={() => {
                              if(confirm(`Excluir o lead ${lead.name}?`)) {
                                onDeleteLead(lead.id);
                              }
                            }}
                            className="p-1.5 rounded-md hover:bg-brand-black text-gray-500 hover:text-red-400 transition-all"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="add-lead-modal">
          <div className="glass bg-[#0A0A0A] rounded-lg border border-white/10 w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-terracotta-950 flex items-center justify-between bg-brand-black/40">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-terracotta-400" />
                <span>Novo Lead Lalletre</span>
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-500 hover:text-white rounded-lg p-1 hover:bg-brand-black transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddLeadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ana Carolina Silva"
                  value={newLeadForm.name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                  className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all duration-300"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">WhatsApp / Telefone</label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 98765-4321"
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all duration-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="Ex: ana@gmail.com"
                    value={newLeadForm.email}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none transition-all duration-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Origem do Lead</label>
                  <select
                    value={newLeadForm.source}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-300 outline-none transition-all duration-300"
                  >
                    <option value="Instagram">Instagram</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Outro">Outro Canal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Interesse</label>
                  <select
                    value={newLeadForm.interestSize}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, interestSize: e.target.value })}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-300 outline-none transition-all duration-300"
                  >
                    <option value="100ml">Lalletre 100ml</option>
                    <option value="50ml">Lalletre 50ml</option>
                    <option value="Ambos">Ambos / Qualquer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Status Inicial</label>
                  <select
                    value={newLeadForm.status}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, status: e.target.value as LeadStatus })}
                    className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3.5 py-2.5 text-sm text-gray-300 outline-none transition-all duration-300"
                  >
                    {columns.map(col => (
                      <option key={col.id} value={col.id}>{col.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-gray-400 uppercase mb-1">Observações / Histórico Inicial</label>
                <textarea
                  placeholder="Alguma nota importante sobre o lead..."
                  value={newLeadForm.notes}
                  rows={3}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
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

      {/* Customizable Stages Modal */}
      {isStagesModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" id="funnel-stages-modal">
          <div className="glass bg-[#0A0A0A] rounded-lg border border-white/10 w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-terracotta-950 flex items-center justify-between bg-brand-black/40">
              <h3 className="font-serif text-xl font-bold text-white flex items-center gap-2">
                <Sliders className="h-5 w-5 text-terracotta-400" />
                <span>Personalizar Etapas do Funil</span>
              </h3>
              <button 
                onClick={() => setIsStagesModalOpen(false)}
                className="text-gray-500 hover:text-white rounded-lg p-1 hover:bg-brand-black transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
              <p className="text-xs text-gray-400">
                Altere os nomes, cores ou a ordem das etapas do funil de relacionamento. Clique em salvar para atualizar em tempo real.
              </p>

              {/* Stages List */}
              <div className="space-y-3">
                {editingStages.map((stage, idx) => (
                  <div key={stage.id} className="flex items-center gap-2 bg-brand-black/40 p-3 rounded-lg border border-white/5">
                    {/* Reorder Buttons */}
                    <div className="flex flex-col gap-1">
                      <button 
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveStage(idx, 'up')}
                        className={`p-1 rounded hover:bg-white/5 transition-all cursor-pointer ${idx === 0 ? 'opacity-20 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button 
                        type="button"
                        disabled={idx === editingStages.length - 1}
                        onClick={() => handleMoveStage(idx, 'down')}
                        className={`p-1 rounded hover:bg-white/5 transition-all cursor-pointer ${idx === editingStages.length - 1 ? 'opacity-20 cursor-not-allowed' : 'text-gray-400 hover:text-white'}`}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Label Input */}
                    <div className="flex-1">
                      <input 
                        type="text"
                        value={stage.label}
                        onChange={(e) => {
                          const updated = [...editingStages];
                          updated[idx].label = e.target.value;
                          setEditingStages(updated);
                        }}
                        className="w-full bg-brand-black border border-white/10 rounded px-2.5 py-1.5 text-xs text-gray-200 focus:border-[#B35B48] outline-none"
                        placeholder="Nome da etapa"
                      />
                    </div>

                    {/* Color Picker */}
                    <div>
                      <select
                        value={stage.color}
                        onChange={(e) => {
                          const updated = [...editingStages];
                          updated[idx].color = e.target.value;
                          setEditingStages(updated);
                        }}
                        className="bg-brand-black border border-white/10 rounded px-2 py-1.5 text-xs text-gray-300 focus:border-[#B35B48] outline-none"
                      >
                        <option value="text-[#B35B48]">Terracota</option>
                        <option value="text-orange-400">Laranja</option>
                        <option value="text-amber-400">Ouro</option>
                        <option value="text-green-500">Verde</option>
                        <option value="text-blue-400">Azul</option>
                        <option value="text-purple-400">Roxo</option>
                        <option value="text-pink-400">Rosa</option>
                        <option value="text-gray-400">Cinza</option>
                      </select>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveStage(idx)}
                      disabled={editingStages.length <= 1}
                      className="p-1.5 text-gray-500 hover:text-red-400 rounded hover:bg-white/5 cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Excluir Etapa"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Stage */}
              <div className="border-t border-white/5 pt-4 space-y-3">
                <span className="block text-xs font-mono font-bold text-gray-400 uppercase">Adicionar Nova Etapa</span>
                <div className="flex gap-2 items-center">
                  <input 
                    type="text"
                    value={newStageLabel}
                    onChange={(e) => setNewStageLabel(e.target.value)}
                    placeholder="Ex: Embalado, Em Trânsito..."
                    className="flex-1 bg-brand-black border border-white/10 focus:border-[#B35B48] rounded px-3 py-2 text-xs text-gray-200 outline-none transition-all duration-300"
                  />
                  <select
                    value={newStageColor}
                    onChange={(e) => setNewStageColor(e.target.value)}
                    className="bg-brand-black border border-white/10 rounded px-2.5 py-2 text-xs text-gray-300 focus:border-[#B35B48] outline-none"
                  >
                    <option value="text-[#B35B48]">Terracota</option>
                    <option value="text-orange-400">Laranja</option>
                    <option value="text-amber-400">Ouro</option>
                    <option value="text-green-500">Verde</option>
                    <option value="text-blue-400">Azul</option>
                    <option value="text-purple-400">Roxo</option>
                    <option value="text-pink-400">Rosa</option>
                    <option value="text-gray-400">Cinza</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddStage}
                    className="px-4 py-2 bg-[#B35B48] hover:bg-[#9c4c3b] text-white text-xs rounded transition-all cursor-pointer"
                  >
                    + Adicionar
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 flex items-center justify-end gap-3 bg-brand-black/40">
              <button
                type="button"
                onClick={() => setIsStagesModalOpen(false)}
                className="bg-brand-black hover:bg-brand-card-light text-xs font-medium text-gray-400 hover:text-white px-4 py-2.5 rounded-lg border border-white/10 transition-all duration-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveStages}
                disabled={isSubmitting}
                className="bg-[#B35B48] hover:bg-[#9c4c3b] text-white text-xs font-semibold px-5 py-2.5 rounded-lg shadow-md transition-all duration-300"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in" id="lead-details-modal">
          <div className="glass bg-[#0A0A0A] rounded-lg border border-white/10 w-full max-w-3xl overflow-hidden shadow-2xl my-8">
            
            {/* Header */}
            <div className="p-6 border-b border-terracotta-950 flex items-center justify-between bg-brand-black/40">
              <div>
                <h3 className="font-serif text-xl font-bold text-white">{selectedLead.name}</h3>
                <p className="text-[10px] text-gray-400 font-mono mt-0.5 uppercase tracking-wide">
                  Lead ID: {selectedLead.id.slice(0, 8)} • Criado em: {new Date(selectedLead.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="text-gray-500 hover:text-white rounded-lg p-1 hover:bg-brand-black transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-terracotta-950/40">
              
              {/* Profile Details Column */}
              <div className="p-6 space-y-6 md:col-span-1">
                <div>
                  <h4 className="text-xs font-mono font-bold text-terracotta-400 uppercase tracking-wider mb-3">Informações de Contato</h4>
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2.5 text-xs text-gray-300">
                      <Phone className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                      <span className="font-mono">{selectedLead.phone || 'Sem telefone'}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-gray-300">
                      <Mail className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                      <span className="truncate">{selectedLead.email || 'Sem e-mail'}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-xs text-gray-300">
                      <Users className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                      <span>Origem: <strong className="text-white">{selectedLead.source}</strong></span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-mono font-bold text-terracotta-400 uppercase tracking-wider mb-3">Detalhes de Interesse</h4>
                  <div className="space-y-3.5">
                    <div className="text-xs text-gray-300">
                      Tamanho preferido: <strong className="text-white font-mono bg-brand-black px-1.5 py-0.5 rounded border border-terracotta-950/40">{selectedLead.interestSize}</strong>
                    </div>
                    <div className="text-xs text-gray-300">
                      Gasto total: <strong className="text-emerald-400 font-mono text-sm block mt-1">R$ {selectedLead.totalSpent.toFixed(2)}</strong>
                    </div>
                  </div>
                </div>

                {/* Status selector */}
                <div>
                  <h4 className="text-xs font-mono font-bold text-terracotta-400 uppercase tracking-wider mb-3">Mudar Estágio do Lead</h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {columns.map(col => (
                      <button
                        key={col.id}
                        onClick={() => onUpdateLeadStatus(selectedLead.id, col.id).then(() => setSelectedLead({ ...selectedLead, status: col.id }))}
                        className={`px-3 py-2 rounded-lg text-xs font-mono text-left transition-all flex items-center justify-between ${
                          selectedLead.status === col.id 
                            ? 'bg-gradient-to-r from-terracotta-900 to-terracotta-800 text-white font-bold border border-terracotta-700/50' 
                            : 'bg-brand-black/50 text-gray-400 hover:text-white hover:bg-brand-black/80'
                        }`}
                      >
                        <span>{col.label}</span>
                        {selectedLead.status === col.id && <span className="w-1.5 h-1.5 rounded-full bg-terracotta-400 animate-ping"></span>}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedLead.status !== 'Vendido' && (
                  <button
                    onClick={() => {
                      onOpenSaleModalForLead(selectedLead);
                      setSelectedLead(null);
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-terracotta-600 to-terracotta-700 hover:from-terracotta-500 hover:to-terracotta-600 text-white text-xs font-semibold py-2.5 rounded-lg shadow-md transition-all duration-300"
                  >
                    <ShoppingBag className="h-4 w-4" />
                    <span>Registrar Compra</span>
                  </button>
                )}

                {selectedLead.notes && (
                  <div className="pt-4 border-t border-terracotta-950/20">
                    <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider mb-1.5">Observações Gerais</h4>
                    <p className="text-xs text-gray-300 bg-brand-black p-3 rounded-lg border border-terracotta-950/30 whitespace-pre-wrap">
                      {selectedLead.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Interactions/Logs Column */}
              <div className="p-6 md:col-span-2 space-y-6 flex flex-col justify-between">
                
                {/* List of past interactions */}
                <div className="space-y-4">
                  <h4 className="text-xs font-mono font-bold text-terracotta-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Histórico de Interações ({leadInteractions.length})</span>
                    <Clock className="h-3.5 w-3.5 text-gray-500" />
                  </h4>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {leadInteractions.length === 0 ? (
                      <div className="py-12 text-center text-xs text-gray-500">
                        Nenhum contato ou nota registrada ainda.
                      </div>
                    ) : (
                      leadInteractions.map((inter) => (
                        <div key={inter.id} className="p-3 bg-brand-black/60 border border-terracotta-950/30 rounded-xl relative group">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wide ${
                              inter.type === 'Mensagem' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20' :
                              inter.type === 'Ligação' ? 'bg-amber-950/40 text-amber-500 border border-amber-900/20' :
                              inter.type === 'E-mail' ? 'bg-blue-950/40 text-blue-400 border border-blue-900/20' :
                              inter.type === 'Reunião' ? 'bg-purple-950/40 text-purple-400 border border-purple-900/20' :
                              'bg-gray-950/40 text-gray-400 border border-gray-900/20'
                            }`}>
                              {inter.type}
                            </span>
                            <span className="text-[10px] text-gray-500 font-mono">
                              {new Date(inter.date).toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">{inter.content}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Log interaction form */}
                <form onSubmit={handleAddInteractionSubmit} className="pt-4 border-t border-terracotta-950/40 space-y-3.5">
                  <h4 className="text-xs font-mono font-bold text-gray-400 uppercase tracking-wider">Logar Novo Contato</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="w-full sm:w-40">
                      <select
                        value={newInteraction.type}
                        onChange={(e) => setNewInteraction({ ...newInteraction, type: e.target.value as any })}
                        className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg px-3 py-2 text-xs text-gray-300 outline-none h-10 transition-all duration-300"
                      >
                        <option value="Mensagem">Mensagem (Whatsapp/Insta)</option>
                        <option value="Ligação">Ligação</option>
                        <option value="E-mail">E-mail</option>
                        <option value="Reunião">Reunião / Visita</option>
                        <option value="Nota">Nota Interna</option>
                      </select>
                    </div>

                    <div className="flex-1 relative">
                      <input
                        type="text"
                        required
                        placeholder="Escreva os detalhes do contato feito..."
                        value={newInteraction.content}
                        onChange={(e) => setNewInteraction({ ...newInteraction, content: e.target.value })}
                        className="w-full bg-brand-black border border-terracotta-950 focus:border-terracotta-600 rounded-lg pl-3 pr-12 py-2 text-xs text-gray-200 placeholder-gray-500 outline-none h-10 transition-all duration-300"
                      />
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="absolute right-1.5 top-1.5 bg-gradient-to-r from-terracotta-600 to-terracotta-700 hover:from-terracotta-500 hover:to-terracotta-600 text-white text-[10px] font-bold px-3 h-7 rounded-md transition-all duration-300"
                      >
                        {isSubmitting ? '...' : 'Registrar'}
                      </button>
                    </div>
                  </div>
                </form>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
