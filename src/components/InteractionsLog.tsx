import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  MessageSquare, 
  Phone, 
  Mail, 
  Users, 
  Clock, 
  UserPlus, 
  Calendar,
  X
} from 'lucide-react';
import { Interaction, Lead } from '../types';

interface InteractionsLogProps {
  interactions: Interaction[];
  leads: Lead[];
  onOpenLeadDetails: (lead: Lead) => void;
}

export default function InteractionsLog({ interactions, leads, onOpenLeadDetails }: InteractionsLogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  // Find lead helper
  const getLeadForInteraction = (clientId: string) => {
    return leads.find(l => l.id === clientId);
  };

  // Filtered interactions
  const filteredInteractions = interactions.filter(i => {
    const lead = getLeadForInteraction(i.clientId);
    const matchesSearch = 
      i.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (lead && lead.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === 'All' || i.type === typeFilter;

    return matchesSearch && matchesType;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto" id="interactions-log-view">
      
      {/* Header */}
      <div className="border-b border-white/5 pb-6">
        <h2 className="text-2xl font-light text-white">
          Histórico de <span className="font-serif italic text-[#B35B48]">Contatos</span>
        </h2>
        <p className="text-sm opacity-50 mt-1">
          Acompanhe de forma centralizada e cronológica cada ligação, mensagem do Whatsapp, e-mail ou proposta comercial enviada.
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 glass p-4 rounded-lg">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por conteúdo do log ou nome do lead..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-white/10 focus:border-[#B35B48] rounded pl-10 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 outline-none transition-all duration-300"
          />
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full bg-[#0A0A0A] border border-white/10 focus:border-[#B35B48] rounded px-3 py-2 text-xs text-gray-300 outline-none transition-all duration-300"
          >
            <option value="All">Todos os Tipos de Contato</option>
            <option value="Mensagem">Mensagem (Whatsapp/Insta)</option>
            <option value="Ligação">Ligação Telefônica</option>
            <option value="E-mail">E-mail Enviado</option>
            <option value="Reunião">Reunião / Demonstração</option>
            <option value="Nota">Nota Interna / Observação</option>
          </select>
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-4" id="global-interactions-timeline">
        {filteredInteractions.length === 0 ? (
          <div className="py-20 text-center glass rounded-lg border border-white/5 text-gray-500 font-mono text-xs">
            Nenhuma interação registrada ou encontrada para os filtros aplicados.
          </div>
        ) : (
          filteredInteractions.map((inter) => {
            const lead = getLeadForInteraction(inter.clientId);
            return (
              <div 
                key={inter.id} 
                className="glass border border-white/5 rounded-lg p-5 hover:border-[#B35B48]/30 transition-all duration-300 flex flex-col md:flex-row md:items-start justify-between gap-4 relative overflow-hidden"
              >
                {/* Decorative terracotta touch */}
                <div className="absolute top-0 left-0 w-0.5 h-full bg-[#B35B48]"></div>

                <div className="space-y-2 flex-1 pl-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                      inter.type === 'Mensagem' ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-900/10' :
                      inter.type === 'Ligação' ? 'bg-amber-950/20 text-amber-500 border border-amber-900/10' :
                      inter.type === 'E-mail' ? 'bg-blue-950/20 text-blue-400 border border-blue-900/10' :
                      inter.type === 'Reunião' ? 'bg-purple-950/20 text-purple-400 border border-purple-900/10' :
                      'bg-white/5 text-gray-400 border border-white/5'
                    }`}>
                      {inter.type}
                    </span>

                    <span className="text-gray-500 font-mono text-[10px] flex items-center gap-1">
                      {new Date(inter.date).toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <p className="text-xs text-gray-200 leading-relaxed font-sans whitespace-pre-wrap">
                    {inter.content}
                  </p>
                </div>

                {/* Lead reference card on right side */}
                <div className="md:w-56 shrink-0 bg-black/40 border border-white/5 p-3 rounded flex flex-col justify-between self-stretch gap-2.5">
                  <div>
                    <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest block mb-1">Interagido Com</span>
                    {lead ? (
                      <div>
                        <h4 className="text-xs font-semibold text-white truncate">{lead.name}</h4>
                        <p className="text-[10px] text-gray-400 font-mono truncate mt-0.5">{lead.phone || lead.email || 'Sem contatos'}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-red-400 font-semibold italic">Lead excluído do sistema</span>
                    )}
                  </div>

                  {lead && (
                    <button
                      onClick={() => onOpenLeadDetails(lead)}
                      className="text-[10px] font-semibold text-[#B35B48] hover:text-[#9c4c3b] cursor-pointer transition-colors text-left flex items-center gap-1 mt-auto"
                    >
                      <span>Ver Ficha do Lead</span>
                      <span>→</span>
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
