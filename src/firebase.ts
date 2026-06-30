import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer, collection, getDocs, writeBatch, setDoc, query, where, limit, updateDoc, addDoc } from 'firebase/firestore';

// Configuration from firebase-applet-config.json
const firebaseConfig = {
  projectId: "copper-insight-3wjkk",
  appId: "1:29923167834:web:7fb3fe185ffdb4d5b55263",
  apiKey: "AIzaSyBgFZoAacTJtpop_tnGg7obGlde4MIpCGw",
  authDomain: "copper-insight-3wjkk.firebaseapp.com",
  storageBucket: "copper-insight-3wjkk.firebasestorage.app",
  messagingSenderId: "29923167834"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
// Using the custom database id provided in firebase-applet-config.json
export const db = getFirestore(app, "ai-studio-4a891f4f-93cc-4b96-8f10-c74180f46844");

// Validate connection on boot
async function testConnection() {
  try {
    // Attempting a server read to verify connectivity
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    console.log("Firebase Connection verified successfully.");
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Firebase is offline. Please check your configuration.");
    } else {
      console.log("Firebase connection test complete. (Reference test document may not exist yet, which is fine)");
    }
  }
}

testConnection();

// Initial database seeding helper if collections are empty
export async function seedInitialDataIfEmpty() {
  try {
    const productsSnap = await getDocs(collection(db, 'products'));
    if (productsSnap.empty) {
      console.log("Seeding initial products and leads data...");
      const batch = writeBatch(db);

      // Initial Products (Lalletre Variants)
      const initialProducts = [
        {
          id: 'prod_lalletre_classic_100',
          name: 'Lalletre Classic Eau de Parfum',
          size: '100ml',
          stock: 15,
          price: 420.00,
          description: 'A fragrância clássica de Lalletre, com notas florais e fundo amadeirado sofisticado.',
          sku: 'LL-CL-100'
        },
        {
          id: 'prod_lalletre_classic_50',
          name: 'Lalletre Classic Eau de Parfum',
          size: '50ml',
          stock: 8,
          price: 260.00,
          description: 'A fragrância clássica de Lalletre em frasco compacto e elegante de 50ml.',
          sku: 'LL-CL-50'
        },
        {
          id: 'prod_lalletre_intense_100',
          name: 'Lalletre Intense Parfum',
          size: '100ml',
          stock: 5,
          price: 490.00,
          description: 'Uma versão intensa e marcante, com especiarias orientais e raras madeiras.',
          sku: 'LL-IT-100'
        },
        {
          id: 'prod_lalletre_noir_100',
          name: 'Lalletre Noir Absolute',
          size: '100ml',
          stock: 0, // Out of stock on purpose to showcase inventory control
          price: 520.00,
          description: 'Mistério e sensualidade concentrados. Notas profundas de couro, incenso e baunilha preta.',
          sku: 'LL-NR-100'
        }
      ];

      initialProducts.forEach(prod => {
        const docRef = doc(db, 'products', prod.id);
        batch.set(docRef, prod);
      });

      // Initial Funnel Stages
      const initialStages = [
        { id: 'nova_solicitacao', label: 'Nova Solicitação', color: 'text-[#B35B48]', bg: 'bg-white/[0.01]' },
        { id: 'separado', label: 'Separado', color: 'text-orange-400', bg: 'bg-white/[0.01]' },
        { id: 'postado_correio', label: 'Postado correio', color: 'text-blue-400', bg: 'bg-white/[0.01]' },
        { id: 'fechado', label: 'Fechado', color: 'text-green-500', bg: 'bg-white/[0.01]' }
      ];
      batch.set(doc(db, 'settings', 'funnel'), { stages: initialStages });

      // Initial Leads/Clients
      const initialLeads = [
        {
          id: 'lead_1',
          name: 'Ana Carolina Silva',
          email: 'ana.carol@gmail.com',
          phone: '(11) 98765-4321',
          status: 'nova_solicitacao',
          interestSize: '100ml',
          notes: 'Viu o anúncio no Instagram. Muito interessada na fragrância original para presente.',
          source: 'Instagram',
          createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          totalSpent: 0
        },
        {
          id: 'lead_2',
          name: 'Roberto Mezini',
          email: 'roberto.mezini@outlook.com',
          phone: '(11) 91234-5678',
          status: 'separado',
          interestSize: '100ml',
          notes: 'Perguntou sobre fixação e frete para o Rio de Janeiro. Enviada proposta de frete grátis.',
          source: 'WhatsApp',
          createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
          totalSpent: 0
        },
        {
          id: 'lead_3',
          name: 'Mariana Duarte',
          email: 'marianad@yahoo.com.br',
          phone: '(21) 99888-7766',
          status: 'separado',
          interestSize: '50ml',
          notes: 'Quer comprar 2 frascos de 50ml de Lalletre Classic para brinde corporativo.',
          source: 'Indicação',
          createdAt: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
          totalSpent: 0
        },
        {
          id: 'lead_4',
          name: 'Juliana Pires',
          email: 'jupires@gmail.com',
          phone: '(19) 97766-5544',
          status: 'fechado',
          interestSize: '100ml',
          notes: 'Adora perfumes intensos. Comprou 1 Lalletre Intense 100ml.',
          source: 'Instagram',
          createdAt: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString(),
          updatedAt: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
          totalSpent: 490.00
        }
      ];

      initialLeads.forEach(lead => {
        const docRef = doc(db, 'leads', lead.id);
        batch.set(docRef, lead);
      });

      // Seeding a test sale
      const initialSale = {
        id: 'sale_1',
        clientId: 'lead_4',
        clientName: 'Juliana Pires',
        productId: 'prod_lalletre_intense_100',
        productName: 'Lalletre Intense Parfum (100ml)',
        quantity: 1,
        unitPrice: 490.00,
        totalPrice: 490.00,
        date: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString(),
        status: 'Pago'
      };
      batch.set(doc(db, 'sales', initialSale.id), initialSale);

      // Seeding initial interactions
      const initialInteractions = [
        {
          id: 'int_1',
          clientId: 'lead_4',
          type: 'Mensagem',
          content: 'Primeiro contato feito pelo Instagram tirando dúvidas de fragrâncias.',
          date: new Date(Date.now() - 12 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'int_2',
          clientId: 'lead_4',
          type: 'Nota',
          content: 'Compra efetuada pelo link do Mercado Pago. Enviado o Lalletre Intense 100ml via Sedex.',
          date: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString()
        },
        {
          id: 'int_3',
          clientId: 'lead_2',
          type: 'Mensagem',
          content: 'Explicou que prefere perfumes masculinos/unissex marcantes.',
          date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
        }
      ];

      initialInteractions.forEach(inter => {
        batch.set(doc(db, 'interactions', inter.id), inter);
      });

      // Save dummy system doc just to avoid re-seeding and run connection test safely
      batch.set(doc(db, 'system', 'connection_test'), { seeded: true });

      await batch.commit();
      console.log("Seeding complete!");
    }
  } catch (error) {
    console.error("Error seeding initial data: ", error);
  }
}

export async function ensureAdminUserExists() {
  try {
    const adminEmail = "lallettre@gmail.com";
    const usersRef = collection(db, 'users');
    const adminQuery = query(usersRef, where('email', '==', adminEmail), limit(1));
    const snap = await getDocs(adminQuery);
    
    if (snap.empty) {
      console.log("Admin user 'lallettre@gmail.com' not found. Creating...");
      const adminDoc = {
        name: 'Lalletre Admin',
        email: adminEmail,
        password: 'germano123456',
        role: 'Acesso Total',
        createdAt: new Date().toISOString()
      };
      await addDoc(usersRef, adminDoc);
      console.log("Admin user 'lallettre@gmail.com' created with requested password.");
    } else {
      const userDoc = snap.docs[0];
      const userData = userDoc.data();
      if (userData.password !== 'germano123456') {
        console.log("Admin user found, but password differs. Updating password to requested...");
        await updateDoc(doc(db, 'users', userDoc.id), {
          password: 'germano123456'
        });
        console.log("Admin user password updated successfully.");
      } else {
        console.log("Admin user exists and password is correct.");
      }
    }
  } catch (error) {
    console.error("Error ensuring admin user exists: ", error);
  }
}

