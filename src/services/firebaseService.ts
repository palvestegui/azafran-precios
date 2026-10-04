import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { 
  getFirestore,
  doc, 
  setDoc, 
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { GlobalConfig } from '../types';
import { validateAndNormalizeGlobalConfig } from '../utils/validation';
import { DEFAULT_GLOBAL_CONFIG, VERIFIED_OPERATIONAL_MATERIALS } from '../data/defaultCatalog';
import { sanitizeForFirestore } from '../utils/firestoreSanitizer';
import { saveProductMedia, stripMediaFromProduct } from './productMediaService';

export { DEFAULT_GLOBAL_CONFIG, VERIFIED_OPERATIONAL_MATERIALS };
export const DEFAULT_CONFIG: GlobalConfig = DEFAULT_GLOBAL_CONFIG;

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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

export const getGlobalConfig = (callback: (config: GlobalConfig) => void) => {
  const configDoc = doc(db, CONFIG_COLLECTION, GLOBAL_CONFIG_ID);
  return onSnapshot(
    configDoc,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(validateAndNormalizeGlobalConfig(snapshot.data(), DEFAULT_GLOBAL_CONFIG));
      } else {
        saveGlobalConfig(DEFAULT_GLOBAL_CONFIG).then(() => callback(DEFAULT_GLOBAL_CONFIG));
      }
    },
    (error) => {
      console.warn("Cloud Firestore listener offline or disconnected, falling back to static default:", error);
      callback(DEFAULT_GLOBAL_CONFIG);
    }
  );
};

export const saveGlobalConfig = async (config: GlobalConfig) => {
  const path = `${CONFIG_COLLECTION}/${GLOBAL_CONFIG_ID}`;
  try {
    // 1. Persist any active media strings to decoupled /product_media/{productId}
    const mediaPromises = config.products
      .filter((p) => Boolean(p.imageUrl || p.backImageUrl))
      .map((p) =>
        saveProductMedia(p.id, {
          imageUrl: p.imageUrl,
          backImageUrl: p.backImageUrl,
        })
      );
    if (mediaPromises.length > 0) {
      await Promise.all(mediaPromises);
    }

    // 2. Prepare lightweight config without bulky base64 strings
    const strippedConfig: GlobalConfig = {
      ...config,
      products: config.products.map(stripMediaFromProduct),
    };

    // 3. Deeply sanitize all fields to strip any undefined values
    const sanitized = sanitizeForFirestore(strippedConfig);

    await setDoc(doc(db, CONFIG_COLLECTION, GLOBAL_CONFIG_ID), sanitized);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};
