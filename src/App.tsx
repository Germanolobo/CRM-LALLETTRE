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
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);

  // Authentication & Access Control States
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('lalletre_crm_session');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogout = () => {
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

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-full bg-brand-black overflow-hidden" id="app-root">
      
      {/* Sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        products={products}
        currentUser={currentUser}
        onLogout={handleLogout}
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
