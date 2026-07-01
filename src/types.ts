export interface Product {
  id: string;
  name: string;
  size: string;
  stock: number;
  price: number;
  description: string;
  sku: string;
}

export type LeadStatus = string;

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: LeadStatus;
  interestSize: string; // e.g. "50ml", "100ml", "Ambos"
  notes: string;
  source: string; // "Instagram", "WhatsApp", "Indicação", "Outro"
  createdAt: string;
  updatedAt: string;
  totalSpent: number;
}

export interface Sale {
  id: string;
  clientId: string;
  clientName: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  date: string;
  status: 'Pendente' | 'Pago' | 'Cancelado';
  sellerId?: string;
  sellerName?: string;
}

export interface Interaction {
  id: string;
  clientId: string;
  type: 'Mensagem' | 'Ligação' | 'E-mail' | 'Reunião' | 'Nota';
  content: string;
  date: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: 'Acesso Total' | 'Apenas Leads' | 'Apenas Estoque' | 'Vendedor';
  invitedBy?: string;
  createdAt: string;
  photoUrl?: string;
}

