import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore,
  initializeFirestore,
  doc, 
  setDoc, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { GlobalConfig } from '../types';

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const loginWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const logout = () => auth.signOut();

const CONFIG_COLLECTION = 'config';
const GLOBAL_CONFIG_ID = 'system-wide-config';

export const generateDefaultId = () => Math.random().toString(36).substring(2, 9);

export const DEFAULT_CONFIG: GlobalConfig = {
  materials: [
    { id: generateDefaultId(), name: 'Tela Bull Denim', category: 'fabric', unit: 'm', pricePerUnit: 110.00, wastagePercentage: 5 },
    { id: generateDefaultId(), name: 'Tela Drill 8oz', category: 'fabric', unit: 'm', pricePerUnit: 140.00, wastagePercentage: 5 },
    { id: generateDefaultId(), name: 'Tela Drill 6oz', category: 'fabric', unit: 'm', pricePerUnit: 120.00, wastagePercentage: 5 },
    { id: generateDefaultId(), name: 'Caqui 1ra', category: 'fabric', unit: 'm', pricePerUnit: 100.00, wastagePercentage: 3 },
    { id: generateDefaultId(), name: 'Caqui 2da', category: 'fabric', unit: 'm', pricePerUnit: 80.00, wastagePercentage: 3 },
    { id: generateDefaultId(), name: 'Hilo', unit: 'spool', pricePerUnit: 25.00 },
    { id: generateDefaultId(), name: 'Ojalillos', unit: 'dozen', pricePerUnit: 15.00 },
    { id: generateDefaultId(), name: 'Mosquetones', unit: 'dozen', pricePerUnit: 30.00 },
    { id: generateDefaultId(), name: 'Broches', unit: 'dozen', pricePerUnit: 20.00 },
    { id: generateDefaultId(), name: 'Argollas chicas', unit: 'dozen', pricePerUnit: 5.00 },
    { id: generateDefaultId(), name: 'Argollas medianas', unit: 'dozen', pricePerUnit: 8.00 },
    { id: generateDefaultId(), name: 'Argollas grandes', unit: 'dozen', pricePerUnit: 12.00 },
    { id: generateDefaultId(), name: 'Cuero', unit: 'm', pricePerUnit: 90.00, wastagePercentage: 10 },
    { id: generateDefaultId(), name: 'Hebillas plástico (S)', unit: 'unit', pricePerUnit: 2.00 },
    { id: generateDefaultId(), name: 'Hebillas plástico (M)', unit: 'unit', pricePerUnit: 3.50 },
    { id: generateDefaultId(), name: 'Hebillas plástico (L)', unit: 'unit', pricePerUnit: 5.00 },
    { id: generateDefaultId(), name: 'Hebillas metálicas (S)', unit: 'unit', pricePerUnit: 5.00 },
    { id: generateDefaultId(), name: 'Hebillas metálicas (M)', unit: 'unit', pricePerUnit: 8.00 },
    { id: generateDefaultId(), name: 'Hebillas metálicas (L)', unit: 'unit', pricePerUnit: 12.00 },
    { id: generateDefaultId(), name: 'Remaches', unit: '100pack', pricePerUnit: 25.00 },
    { id: generateDefaultId(), name: 'Bordado logo', unit: 'service', pricePerUnit: 35.00 },
    { id: generateDefaultId(), name: 'Bordado nombre', unit: 'service', pricePerUnit: 15.00 },
  ],
  products: [
    {
      id: generateDefaultId(),
      name: 'Mandil Clásico',
      ingredients: []
    }
  ],
  regularPayments: [
    { id: generateDefaultId(), name: 'Alquiler Taller', amount: 3500, period: 'monthly' },
    { id: generateDefaultId(), name: 'Luz', amount: 400, period: 'monthly' },
    { id: generateDefaultId(), name: 'Agua', amount: 60, period: 'monthly' },
    { id: generateDefaultId(), name: 'Internet', amount: 200, period: 'monthly' },
    { id: generateDefaultId(), name: 'Amortización de Maquinaria', amount: 300, period: 'monthly' },
  ],
  dailyExpenses: [
    { id: generateDefaultId(), name: 'Pasajes', amount: 10 },
    { id: generateDefaultId(), name: 'Comida Personal', amount: 45 },
    { id: generateDefaultId(), name: 'Megas / Crédito', amount: 5 },
  ],
  staff: [
    { id: generateDefaultId(), name: 'Costurero Principal', role: 'Costurero Principal', monthlySalary: 3000, count: 1 },
    { id: generateDefaultId(), name: 'Ayudante', role: 'Ayudante general', monthlySalary: 2000, count: 2 },
  ],
  profitMargin: 35,
  wholesaleMargin: 20,
  productionCapacity: 300,
};

export const getGlobalConfig = (callback: (config: GlobalConfig) => void) => {
  const configDoc = doc(db, CONFIG_COLLECTION, GLOBAL_CONFIG_ID);
  return onSnapshot(configDoc, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as GlobalConfig);
    } else {
      saveGlobalConfig(DEFAULT_CONFIG).then(() => callback(DEFAULT_CONFIG));
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `${CONFIG_COLLECTION}/${GLOBAL_CONFIG_ID}`);
  });
};

export const saveGlobalConfig = async (config: GlobalConfig) => {
  const path = `${CONFIG_COLLECTION}/${GLOBAL_CONFIG_ID}`;
  try {
    await setDoc(doc(db, CONFIG_COLLECTION, GLOBAL_CONFIG_ID), config);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();
