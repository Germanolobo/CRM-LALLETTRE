/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, addDoc, setDoc, updateDoc, deleteDoc, writeBatch, runTransaction, Timestamp } from 'firebase/firestore';
import { db, seedInitialDataIfEmpty, ensureAdminUserExists } from './firebase';
import { Lead, Product, Sale, Interaction, LeadStatus, User } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PDVManager from './components/PDVManager';
import LeadsManager from './components/LeadsManager';
import StockManager from './components/StockManager';
import SalesManager from './components/SalesManager';
import InteractionsLog from './components/InteractionsLog';
import Login from './components/Login';
import TeamManager from './components/TeamManager';
import UserProfile from './components/UserProfile';
import { 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  LayoutDashboard, 
  Store, 
  Users, 
  Package, 
  BadgePercent, 
  History, 
  UserCheck, 
  User as UserIcon, 
  Menu, 
  MoreHorizontal, 
  Battery, 
  Wifi, 
  Signal, 
  Smartphone, 
  Laptop,
  ChevronLeft,
  X,
  AlertTriangle,
  Calendar,
  LogOut,
  Bell
} from 'lucide-react';
import { initAuth, googleSignIn, logoutGoogle, setProfileUserId, getConnectedGoogleUser } from './utils/calendarAuth';
import Logo from './components/Logo';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Auto-detect mobile screen size (standard tablet/phone breakpoint < 1024px)
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobileScreen(window.innerWidth < 1024);
    };
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Authentication & Access Control States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('lalletre_crm_session');
    return saved ? JSON.parse(saved) : null;
  });

  // Google Calendar Integration States
  const [googleUser, setGoogleUser] = useState<any | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      setProfileUserId(currentUser.id);
      
      const cached = getConnectedGoogleUser();
      if (cached) {
        if (cached.email?.toLowerCase() === currentUser.email?.toLowerCase()) {
          setGoogleUser(cached);
          setGoogleToken(localStorage.getItem(`lallettre_google_token_${currentUser.id}`));
        } else {
          logoutGoogle();
          setGoogleUser(null);
          setGoogleToken(null);
        }
      } else {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    } else {
      setProfileUserId(null);
      setGoogleUser(null);
      setGoogleToken(null);
    }

    const unsubscribe = initAuth(
      (user, token) => {
        if (currentUser && user.email?.toLowerCase() === currentUser.email?.toLowerCase()) {
          setGoogleUser(user);
          setGoogleToken(token);
        } else {
          logoutGoogle();
          setGoogleUser(null);
          setGoogleToken(null);
        }
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
      }
    );
    return () => unsubscribe();
  }, [currentUser]);

  const handleGoogleLogin = async () => {
    if (!currentUser) return;
    try {
      const res = await googleSignIn(currentUser.email);
      if (res) {
        setGoogleUser({
          email: res.user.email,
          displayName: res.user.displayName,
          photoURL: res.user.photoURL
        });
        setGoogleToken(res.accessToken);
      }
    } catch (err: any) {
      alert(err.message || 'Falha ao conectar com o Google Agenda.');
      console.error('Google Calendar login failed:', err);
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutGoogle();
      setGoogleUser(null);
      setGoogleToken(null);
    } catch (err) {
      console.error('Google Calendar logout failed:', err);
    }
  };

  const handleLogout = () => {
    handleGoogleLogout();
    setCurrentUser(null);
    localStorage.removeItem('lalletre_crm_session');
    setCurrentTab('dashboard');
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('lalletre_crm_session', JSON.stringify(user));
    setCurrentTab('dashboard');
  };

  // Real-time synchronization of the current user's document
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(doc(db, 'users', currentUser.id), (docSnap) => {
      if (!docSnap.exists()) {
        // Access revoked/user deleted by Admin
        handleLogout();
      } else {
        const data = docSnap.data() as Omit<User, 'id'>;
        const updated = { id: docSnap.id, ...data } as User;
        setCurrentUser(updated);
        localStorage.setItem('lalletre_crm_session', JSON.stringify(updated));
      }
    }, (error) => {
      console.error("Error watching current user: ", error);
    });

    return () => unsubscribe();
  }, [currentUser?.id]);

  // Restrict access depending on limits defined per role
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    if (role === 'Apenas Leads') {
      const allowed = ['dashboard', 'leads', 'interactions', 'profile'];
      if (!allowed.includes(currentTab)) {
        setCurrentTab('dashboard');
      }
    } else if (role === 'Apenas Estoque') {
      const allowed = ['dashboard', 'pdv', 'stock', 'sales', 'profile'];
      if (!allowed.includes(currentTab)) {
        setCurrentTab('dashboard');
      }
    }
  }, [currentTab, currentUser]);

  // States synchronized with Firebase
  const [leads, setLeads] = useState<Lead[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [funnelStages, setFunnelStages] = useState<{ id: string; label: string; color: string; bg: string }[]>([]);

  // Selection references for preset flows
  const [preselectedLeadId, setPreselectedLeadId] = useState<string | undefined>(undefined);
  const [isAddSaleOpenDirectly, setIsAddSaleOpenDirectly] = useState(false);
  const [targetLeadForDetails, setTargetLeadForDetails] = useState<Lead | null>(null);

  // Sync data from Firestore in real-time
  useEffect(() => {
    let unsubscribeLeads: () => void;
    let unsubscribeProducts: () => void;
    let unsubscribeSales: () => void;
    let unsubscribeInteractions: () => void;
    let unsubscribeStages: () => void;

    async function initAndSync() {
      try {
        // Seed database if empty
        await seedInitialDataIfEmpty();
        await ensureAdminUserExists();

        // 1. Subscribe to Leads
        unsubscribeLeads = onSnapshot(collection(db, 'leads'), (snapshot) => {
          const leadsList: Lead[] = [];
          snapshot.forEach((doc) => {
            leadsList.push({ id: doc.id, ...doc.data() } as Lead);
          });
          setLeads(leadsList);
        }, (error) => {
          console.error("Error listening to leads: ", error);
        });

        // 2. Subscribe to Products
        unsubscribeProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
          const productsList: Product[] = [];
          snapshot.forEach((doc) => {
            productsList.push({ id: doc.id, ...doc.data() } as Product);
          });
          setProducts(productsList);
        }, (error) => {
          console.error("Error listening to products: ", error);
        });

        // 3. Subscribe to Sales
        unsubscribeSales = onSnapshot(collection(db, 'sales'), (snapshot) => {
          const salesList: Sale[] = [];
          snapshot.forEach((doc) => {
            salesList.push({ id: doc.id, ...doc.data() } as Sale);
          });
          setSales(salesList);
        }, (error) => {
          console.error("Error listening to sales: ", error);
        });

        // 4. Subscribe to Interactions
        unsubscribeInteractions = onSnapshot(collection(db, 'interactions'), (snapshot) => {
          const interactionsList: Interaction[] = [];
          snapshot.forEach((doc) => {
            interactionsList.push({ id: doc.id, ...doc.data() } as Interaction);
          });
          setInteractions(interactionsList);
        }, (error) => {
          console.error("Error listening to interactions: ", error);
        });

        // 5. Subscribe to Funnel Stages
        const settingsRef = doc(db, 'settings', 'funnel');
        unsubscribeStages = onSnapshot(settingsRef, (docSnap) => {
          if (docSnap.exists() && docSnap.data().stages) {
            setFunnelStages(docSnap.data().stages);
          } else {
            const defaultStages = [
              { id: 'nova_solicitacao', label: 'Nova Solicitação', color: 'text-[#B35B48]', bg: 'bg-white/[0.01]' },
              { id: 'separado', label: 'Separado', color: 'text-orange-400', bg: 'bg-white/[0.01]' },
              { id: 'postado_correio', label: 'Postado correio', color: 'text-blue-400', bg: 'bg-white/[0.01]' },
              { id: 'fechado', label: 'Fechado', color: 'text-green-500', bg: 'bg-white/[0.01]' }
            ];
            setDoc(settingsRef, { stages: defaultStages }).catch(err => console.error("Error setting default stages: ", err));
            setFunnelStages(defaultStages);
          }
          setIsLoading(false);
        }, (error) => {
          console.error("Error listening to settings/funnel: ", error);
          setIsLoading(false);
        });

      } catch (err) {
        console.error("Initialization failed: ", err);
        setIsLoading(false);
      }
    }

    initAndSync();

    // Cleanup listeners
    return () => {
      if (unsubscribeLeads) unsubscribeLeads();
      if (unsubscribeProducts) unsubscribeProducts();
      if (unsubscribeSales) unsubscribeSales();
      if (unsubscribeInteractions) unsubscribeInteractions();
      if (unsubscribeStages) unsubscribeStages();
    };
  }, []);

  // --- BUSINESS OPERATION LOGIC (FIRESTORE WRITES) ---

  // Lead: Add Lead
  const handleAddLead = async (leadForm: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'totalSpent'>) => {
    const newId = `lead_${Date.now()}`;
    const newLead: Lead = {
      ...leadForm,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      totalSpent: 0
    };

    await setDoc(doc(db, 'leads', newId), newLead);

    // Record initial interaction
    await handleAddInteraction({
      clientId: newId,
      type: 'Nota',
      content: `Lead criado no sistema. Interessado no Lalletre ${leadForm.interestSize}. Canal: ${leadForm.source}`
    });
  };

  // Lead: Update Status
  const handleUpdateLeadStatus = async (leadId: string, status: LeadStatus) => {
    const leadRef = doc(db, 'leads', leadId);
    await updateDoc(leadRef, {
      status,
      updatedAt: new Date().toISOString()
    });

    // Log the stage transition automatically
    await handleAddInteraction({
      clientId: leadId,
      type: 'Nota',
      content: `Estágio do lead alterado para: ${status}`
    });
  };

  // Lead: Delete Lead
  const handleDeleteLead = async (leadId: string) => {
    await deleteDoc(doc(db, 'leads', leadId));
    // Optionally clean up interactions related to this lead
  };

  // Interaction: Add Log
  const handleAddInteraction = async (interForm: Omit<Interaction, 'id' | 'date'>) => {
    const newId = `int_${Date.now()}`;
    const newInter: Interaction = {
      ...interForm,
      id: newId,
      date: new Date().toISOString()
    };
    await setDoc(doc(db, 'interactions', newId), newInter);
  };

  // Product: Add new variant
  const handleAddProduct = async (prodForm: Omit<Product, 'id'>) => {
    const newId = `prod_${Date.now()}`;
    const newProd: Product = {
      ...prodForm,
      id: newId
    };
    await setDoc(doc(db, 'products', newId), newProd);
  };

  // Product: Manual stock adjust
  const handleUpdateStock = async (productId: string, newStock: number) => {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, { stock: newStock });
  };

  // Product: Delete perfume variant
  const handleDeleteProduct = async (productId: string) => {
    await deleteDoc(doc(db, 'products', productId));
  };

  // Product: Update entire details
  const handleUpdateProduct = async (productId: string, updatedFields: Partial<Product>) => {
    const productRef = doc(db, 'products', productId);
    await updateDoc(productRef, updatedFields);
  };

  // Sale: Register order (Deducts stock securely)
  const handleAddSale = async (saleForm: Omit<Sale, 'id' | 'date'>) => {
    const productRef = doc(db, 'products', saleForm.productId);
    const leadRef = doc(db, 'leads', saleForm.clientId);
    const saleId = `sale_${Date.now()}`;

    // Perform inside a Firestore transaction to ensure database consistency
    // and avoid selling stock that was purchased by another thread simultaneously!
    await runTransaction(db, async (transaction) => {
      const productDoc = await transaction.get(productRef);
      const leadDoc = await transaction.get(leadRef);

      if (!productDoc.exists()) {
        throw new Error("Produto não existe no banco de dados.");
      }

      const currentStock = productDoc.data().stock;
      if (currentStock < saleForm.quantity) {
        throw new Error(`Estoque insuficiente! Apenas ${currentStock} unidades restantes.`);
      }

      // Calculate totals
      const newStock = currentStock - saleForm.quantity;
      const currentSpent = leadDoc.exists() ? (leadDoc.data().totalSpent || 0) : 0;
      const newSpent = currentSpent + saleForm.totalPrice;

      // 1. Register Sale
      const newSale: Sale = {
        ...saleForm,
        id: saleId,
        sellerId: currentUser?.id,
        sellerName: currentUser?.name,
        date: new Date().toISOString()
      };
      transaction.set(doc(db, 'sales', saleId), newSale);

      // 2. Decrement Stock
      transaction.update(productRef, { stock: newStock });

      // 3. Update Lead Stats & set Status to 'fechado' / won stage
      if (leadDoc.exists()) {
        const closedStage = funnelStages.find(st => st.id === 'fechado' || st.id === 'vendido' || st.label.toLowerCase().includes('fechad') || st.label.toLowerCase().includes('vend')) 
          || funnelStages[funnelStages.length - 1];
        const nextStatus = closedStage ? closedStage.id : 'fechado';

        transaction.update(leadRef, { 
          totalSpent: newSpent,
          status: nextStatus,
          updatedAt: new Date().toISOString()
        });
      }

      // 4. Log Interaction automatically
      const intId = `int_${Date.now()}`;
      const newInter: Interaction = {
        id: intId,
        clientId: saleForm.clientId,
        type: 'Nota',
        content: `VENDA CONCLUÍDA: Comprou ${saleForm.quantity}x ${saleForm.productName} por ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(saleForm.totalPrice)}. Estoque deduzido no sistema.`,
        date: new Date().toISOString()
      };
      transaction.set(doc(db, 'interactions', intId), newInter);
    });
  };

  // Fast Navigation preset triggers
  const handleOpenSaleModalForLead = (lead: Lead) => {
    setPreselectedLeadId(lead.id);
    setCurrentTab('sales');
  };

  const handleQuickAddLead = () => {
    setCurrentTab('leads');
    // Open modal is handled inside LeadsManager via rendering,
    // or we can let them see the Leads list and click register.
  };

  const handleQuickAddSale = () => {
    setPreselectedLeadId(undefined);
    setIsAddSaleOpenDirectly(true);
    setCurrentTab('sales');
  };

  const handleOpenLeadDetails = (lead: Lead) => {
    setTargetLeadForDetails(lead);
    setCurrentTab('leads');
  };

  const handleUpdateFunnelStages = async (newStages: { id: string; label: string; color: string; bg: string }[]) => {
    await setDoc(doc(db, 'settings', 'funnel'), { stages: newStages });
  };

  const getMobilePrimaryTabs = () => {
    if (!currentUser) return [];
    
    const role = currentUser.role;
    if (role === 'Apenas Leads') {
      return [
        { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
        { id: 'leads', label: 'Leads', icon: Users },
        { id: 'interactions', label: 'Histórico', icon: History },
        { id: 'profile', label: 'Perfil', icon: UserIcon },
      ];
    } else if (role === 'Apenas Estoque') {
      return [
        { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
        { id: 'pdv', label: 'PDV', icon: Store },
        { id: 'stock', label: 'Estoque', icon: Package },
        { id: 'sales', label: 'Vendas', icon: BadgePercent },
      ];
    } else if (role === 'Vendedor') {
      return [
        { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
        { id: 'pdv', label: 'PDV', icon: Store },
        { id: 'profile', label: 'Perfil', icon: UserIcon },
      ];
    } else {
      // Full Access
      return [
        { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
        { id: 'pdv', label: 'PDV', icon: Store },
        { id: 'leads', label: 'Leads', icon: Users },
        { id: 'stock', label: 'Estoque', icon: Package },
      ];
    }
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // --- MOBILE VIEWS (CELLULAR DETECTED) ---
  if (isMobileScreen) {
    const mobilePrimaryTabs = getMobilePrimaryTabs();
    const lowStockItems = products.filter(p => p.stock < 5 && p.stock > 0);
    const outOfStockItems = products.filter(p => p.stock === 0);

    const getSecondaryMenuItems = () => {
      const allItems = [
        { id: 'sales', name: 'Registro de Vendas', icon: BadgePercent, roles: ['Acesso Total', 'Apenas Estoque'] },
        { id: 'interactions', name: 'Histórico de Contatos', icon: History, roles: ['Acesso Total', 'Apenas Leads'] },
        { id: 'team', name: 'Equipe & Acessos', icon: UserCheck, roles: ['Acesso Total'] },
        { id: 'profile', name: 'Meu Perfil', icon: UserIcon, roles: ['Acesso Total', 'Apenas Leads', 'Apenas Estoque', 'Vendedor'] },
      ];
      return allItems.filter(item => {
        const isPrimary = mobilePrimaryTabs.some(pt => pt.id === item.id);
        const isAllowed = item.roles.includes(currentUser.role);
        return !isPrimary && isAllowed;
      });
    };

    const secondaryMenuItems = getSecondaryMenuItems();

    const renderActiveTab = () => {
      if (isLoading) {
        return (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-20" id="app-loading-mobile">
            <Loader2 className="h-8 w-8 text-terracotta-500 animate-spin" />
            <p className="text-[10px] font-mono text-gray-500 tracking-wider uppercase">Sincronizando Banco de Dados Lalletre...</p>
          </div>
        );
      }
      switch (currentTab) {
        case 'dashboard':
          return (
            <Dashboard 
              leads={leads} 
              products={products} 
              sales={sales} 
              onNavigate={setCurrentTab} 
              onQuickAddLead={handleQuickAddLead}
              onQuickAddSale={handleQuickAddSale}
              funnelStages={funnelStages}
              currentUser={currentUser}
            />
          );
        case 'pdv':
          return (
            <PDVManager 
              products={products}
              leads={leads}
              onAddSale={handleAddSale}
              onAddLead={handleAddLead}
            />
          );
        case 'leads':
          return (
            <LeadsManager 
              leads={leads}
              products={products}
              interactions={interactions}
              onAddLead={handleAddLead}
              onUpdateLeadStatus={handleUpdateLeadStatus}
              onDeleteLead={handleDeleteLead}
              onAddInteraction={handleAddInteraction}
              onOpenSaleModalForLead={handleOpenSaleModalForLead}
              funnelStages={funnelStages}
              onUpdateFunnelStages={handleUpdateFunnelStages}
              targetLeadForDetails={targetLeadForDetails}
              onClearTargetLeadDetails={() => setTargetLeadForDetails(null)}
              googleUser={googleUser}
              onGoogleLogin={handleGoogleLogin}
              onGoogleLogout={handleGoogleLogout}
            />
          );
        case 'stock':
          return (
            <StockManager 
              products={products}
              onAddProduct={handleAddProduct}
              onUpdateStock={handleUpdateStock}
              onDeleteProduct={handleDeleteProduct}
              onUpdateProduct={handleUpdateProduct}
            />
          );
        case 'sales':
          return (
            <SalesManager 
              sales={sales}
              leads={leads}
              products={products}
              onAddSale={handleAddSale}
              preselectedLeadId={preselectedLeadId}
              onClearPreselectedLead={() => setPreselectedLeadId(undefined)}
              isAddSaleOpenDirectly={isAddSaleOpenDirectly}
              setIsAddSaleOpenDirectly={setIsAddSaleOpenDirectly}
            />
          );
        case 'interactions':
          return (
            <InteractionsLog 
              interactions={interactions}
              leads={leads}
              onOpenLeadDetails={handleOpenLeadDetails}
            />
          );
        case 'team':
          return (
            <TeamManager 
              currentUser={currentUser}
            />
          );
        case 'profile':
          return (
            <UserProfile 
              currentUser={currentUser}
              onUpdateCurrentUser={setCurrentUser}
            />
          );
        default:
          return null;
      }
    };

    const handleMobileTabSelect = (tabId: string) => {
      setCurrentTab(tabId);
      setIsMoreMenuOpen(false);
    };

    return (
      <div className="min-h-screen w-full bg-brand-black text-gray-100 flex flex-col font-sans antialiased relative overflow-hidden animate-fade-in" id="mobile-app-wrapper">
        
        {/* App Header Bar (Within Cellular Viewport) */}
        <header className="w-full shrink-0 h-14 bg-[#0A0A0A] border-b border-white/5 flex items-center justify-between px-4 z-40 shadow-sm" id="mobile-app-header">
            {/* Left side actions (Details back button OR menu avatar) */}
            <div className="flex items-center">
              {currentTab === 'leads' && targetLeadForDetails ? (
                <button
                  onClick={() => setTargetLeadForDetails(null)}
                  className="flex items-center gap-1 text-xs font-medium text-terracotta-400 hover:text-white transition-colors cursor-pointer py-1.5"
                  id="mobile-back-to-list"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Voltar</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  {currentUser.photoUrl ? (
                    <img 
                      src={currentUser.photoUrl} 
                      alt={currentUser.name} 
                      className="h-7 w-7 rounded-full object-cover border border-[#DFBA73]/30 cursor-pointer"
                      onClick={() => handleMobileTabSelect('profile')}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div 
                      className="h-7 w-7 rounded-full bg-[#B35B48] flex items-center justify-center font-bold text-xs text-white uppercase cursor-pointer"
                      onClick={() => handleMobileTabSelect('profile')}
                    >
                      {currentUser.name.substring(0, 2)}
                    </div>
                  )}
                  <span className="text-[10px] text-gray-400 leading-none hidden sm:block truncate max-w-[60px] font-mono uppercase tracking-wider">
                    {currentUser.role.split(' ')[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Center Brand Logo */}
            <div className="flex items-center justify-center">
              <Logo variant="sidebar" className="h-8 max-h-8 scale-90" />
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setIsMoreMenuOpen(true)}
                className="relative p-1 text-gray-400 hover:text-[#DFBA73] transition-colors focus:outline-none cursor-pointer"
                title="Google Agenda & Resumo do Estoque"
                id="mobile-status-summary-trigger"
              >
                <div className={`w-2 h-2 rounded-full absolute top-0.5 right-0.5 ${googleUser ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
                <Bell className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Main Content Area inside Simulator */}
          <main className="flex-1 w-full overflow-y-auto bg-brand-black text-gray-100 relative pb-20 scrollbar-none" id="mobile-app-content">
            {renderActiveTab()}
          </main>

          {/* Slide-up bottom sheet drawer for "Mais" (More) Menu */}
          {isMoreMenuOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity duration-300 flex flex-col justify-end" id="more-drawer-overlay">
              <div className="flex-1" onClick={() => setIsMoreMenuOpen(false)}></div>
              
              <div className="bg-[#0D0C0B] border-t border-[#DFBA73]/20 rounded-t-[32px] p-6 max-h-[85%] overflow-y-auto flex flex-col gap-6" id="more-drawer-panel">
                
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-mono text-[#B35B48] uppercase tracking-widest font-semibold">Maison Lallettre</span>
                    <h3 className="font-serif text-sm font-bold text-[#DFBA73]">Mais Recursos & Ajustes</h3>
                  </div>
                  <button 
                    onClick={() => setIsMoreMenuOpen(false)}
                    className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                    id="close-drawer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {secondaryMenuItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider font-mono">Recursos do App</div>
                    <div className="grid grid-cols-2 gap-2.5">
                      {secondaryMenuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = currentTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleMobileTabSelect(item.id)}
                            className={`flex flex-col items-start gap-2 p-3.5 rounded-xl border text-left transition-all duration-300 cursor-pointer ${
                              isActive 
                                ? 'bg-[#B35B48]/10 border-[#B35B48]/40 text-[#B35B48]' 
                                : 'bg-white/[0.02] border-white/5 text-gray-300 hover:bg-white/[0.04] hover:border-white/10'
                            }`}
                          >
                            <Icon className="h-5 w-5 text-[#DFBA73]" />
                            <span className="text-xs font-medium">{item.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {currentUser && (currentUser.role === 'Acesso Total' || currentUser.role === 'Apenas Estoque') && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5" id="drawer-stock-badge">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-terracotta-500" />
                      <span className="text-xs font-semibold text-gray-300">Status do Estoque</span>
                    </div>
                    {outOfStockItems.length > 0 || lowStockItems.length > 0 ? (
                      <div className="space-y-1">
                        {outOfStockItems.length > 0 && (
                          <div className="text-xs text-red-400 font-mono flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>{outOfStockItems.length} {outOfStockItems.length === 1 ? 'item esgotado' : 'itens esgotados'}!</span>
                          </div>
                        )}
                        {lowStockItems.length > 0 && (
                          <div className="text-xs text-amber-500 font-mono flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            <span>{lowStockItems.length} {lowStockItems.length === 1 ? 'estoque baixo' : 'estoques baixos'}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-emerald-500 font-mono flex items-center gap-1.5">
                        <span>✓ Tudo normalizado no estoque</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="flex items-center gap-1.5 text-gray-300">
                      <Calendar className="h-4 w-4 text-terracotta-400" />
                      <span>Google Agenda</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono ${googleUser ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-gray-800 text-gray-400'}`}>
                      {googleUser ? 'Conectado' : 'Inativo'}
                    </span>
                  </div>
                  {googleUser ? (
                    <div className="space-y-1 bg-black/20 p-2.5 rounded-lg border border-white/5">
                      <p className="text-xs text-gray-300 font-mono truncate">
                        {googleUser.displayName || googleUser.email}
                      </p>
                      <button
                        onClick={handleGoogleLogout}
                        className="text-[10px] font-mono text-[#B35B48] hover:text-[#9c4c3b] transition-all cursor-pointer mt-1 block"
                      >
                        Desconectar Agenda
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGoogleLogin}
                      className="w-full py-2.5 px-3 bg-[#B35B48]/10 hover:bg-[#B35B48]/20 border border-[#B35B48]/20 rounded-xl text-xs font-medium text-center text-gray-300 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>Conectar Conta Google</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 border-t border-white/5 pt-4">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-between p-3.5 bg-red-950/10 hover:bg-red-950/20 border border-red-900/15 rounded-xl text-xs text-red-400 hover:text-red-300 transition-all cursor-pointer"
                    id="mobile-logout-btn"
                  >
                    <div className="flex items-center gap-2">
                      <LogOut className="h-4 w-4" />
                      <span>Sair do Sistema</span>
                    </div>
                    <span className="text-[10px] font-mono text-gray-600">Sessão</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fixed Mobile Bottom Tab Bar Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0A0A0A]/95 border-t border-white/5 backdrop-blur px-2 flex items-center justify-around z-40 pb-2" id="mobile-app-tabbar">
            {mobilePrimaryTabs.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id && !isMoreMenuOpen;
              return (
                <button
                  key={item.id}
                  id={`mobile-tab-${item.id}`}
                  onClick={() => handleMobileTabSelect(item.id)}
                  className="flex flex-col items-center justify-center gap-1 py-1 w-14 transition-all duration-300 focus:outline-none cursor-pointer"
                >
                  <Icon className={`h-5 w-5 transition-transform duration-300 ${isActive ? 'text-[#B35B48] scale-110' : 'text-gray-400 hover:text-white'}`} />
                  <span className={`text-[9px] font-medium transition-colors ${isActive ? 'text-[#B35B48]' : 'text-gray-500 hover:text-gray-300'}`}>
                    {item.label}
                  </span>
                </button>
              );
            })}
            
            <button
              onClick={() => setIsMoreMenuOpen(true)}
              className="flex flex-col items-center justify-center gap-1 py-1 w-14 transition-all duration-300 focus:outline-none cursor-pointer"
              id="mobile-tab-more"
            >
              <MoreHorizontal className={`h-5 w-5 transition-transform duration-300 ${isMoreMenuOpen ? 'text-[#B35B48] scale-110' : 'text-gray-400 hover:text-white'}`} />
              <span className={`text-[9px] font-medium transition-colors ${isMoreMenuOpen ? 'text-[#B35B48]' : 'text-gray-500 hover:text-gray-300'}`}>
                Mais
              </span>
            </button>
          </nav>
        </div>
      );
    }

  // --- COMPATIBLE DESKTOP/WIDE VIEW (ORIGINAL FULLSCREEN LAYOUT) ---
  return (
    <div className="flex h-screen w-full bg-brand-black overflow-hidden relative" id="app-root">
      
      {/* Sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        products={products}
        currentUser={currentUser}
        onLogout={handleLogout}
        googleUser={googleUser}
        onGoogleLogin={handleGoogleLogin}
        onGoogleLogout={handleGoogleLogout}
      />

      {/* Main Panel Content Area */}
      <main className="flex-1 h-full overflow-y-auto bg-brand-black text-gray-100 relative">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3" id="app-loading">
            <Loader2 className="h-10 w-10 text-terracotta-500 animate-spin" />
            <p className="text-xs font-mono text-gray-500 tracking-wider uppercase">Sincronizando Banco de Dados Lalletre...</p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <Dashboard 
                leads={leads} 
                products={products} 
                sales={sales} 
                onNavigate={setCurrentTab} 
                onQuickAddLead={handleQuickAddLead}
                onQuickAddSale={handleQuickAddSale}
                funnelStages={funnelStages}
                currentUser={currentUser}
              />
            )}

            {currentTab === 'pdv' && (
              <PDVManager 
                products={products}
                leads={leads}
                onAddSale={handleAddSale}
                onAddLead={handleAddLead}
              />
            )}

            {currentTab === 'leads' && (
              <LeadsManager 
                leads={leads}
                products={products}
                interactions={interactions}
                onAddLead={handleAddLead}
                onUpdateLeadStatus={handleUpdateLeadStatus}
                onDeleteLead={handleDeleteLead}
                onAddInteraction={handleAddInteraction}
                onOpenSaleModalForLead={handleOpenSaleModalForLead}
                funnelStages={funnelStages}
                onUpdateFunnelStages={handleUpdateFunnelStages}
                targetLeadForDetails={targetLeadForDetails}
                onClearTargetLeadDetails={() => setTargetLeadForDetails(null)}
                googleUser={googleUser}
                onGoogleLogin={handleGoogleLogin}
                onGoogleLogout={handleGoogleLogout}
              />
            )}

            {currentTab === 'stock' && (
              <StockManager 
                products={products}
                onAddProduct={handleAddProduct}
                onUpdateStock={handleUpdateStock}
                onDeleteProduct={handleDeleteProduct}
                onUpdateProduct={handleUpdateProduct}
              />
            )}

            {currentTab === 'sales' && (
              <SalesManager 
                sales={sales}
                leads={leads}
                products={products}
                onAddSale={handleAddSale}
                preselectedLeadId={preselectedLeadId}
                onClearPreselectedLead={() => setPreselectedLeadId(undefined)}
                isAddSaleOpenDirectly={isAddSaleOpenDirectly}
                setIsAddSaleOpenDirectly={setIsAddSaleOpenDirectly}
              />
            )}

            {currentTab === 'interactions' && (
              <InteractionsLog 
                interactions={interactions}
                leads={leads}
                onOpenLeadDetails={handleOpenLeadDetails}
              />
            )}

            {currentTab === 'team' && (
              <TeamManager 
                currentUser={currentUser}
              />
            )}

            {currentTab === 'profile' && (
              <UserProfile 
                currentUser={currentUser}
                onUpdateCurrentUser={setCurrentUser}
              />
            )}
          </>
        )}
      </main>

    </div>
  );
}
