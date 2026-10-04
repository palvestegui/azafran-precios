/**
 * Dedicated Product Media Persistence Service.
 * Decouples heavy garment photography into individual Firestore documents (/product_media/{productId}).
 * Strict TypeScript: zero 'any', zero '@ts-ignore'.
 * Rule 300 compliant.
 */

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "./firebaseService";
import { sanitizeForFirestore } from "../utils/firestoreSanitizer";

export interface ProductMedia {
  id: string;
  imageUrl?: string;
  backImageUrl?: string;
  updatedAt: string;
}

const MEDIA_COLLECTION = "product_media";

// In-memory cache to optimize re-renders and eliminate redundant network transfers
const mediaMemoryCache = new Map<string, ProductMedia>();

/**
 * Saves garment media to /product_media/{productId} in Firestore.
 */
export async function saveProductMedia(
  productId: string,
  media: { imageUrl?: string; backImageUrl?: string }
): Promise<void> {
  if (!productId) return;
  const path = `${MEDIA_COLLECTION}/${productId}`;

  const payload: ProductMedia = {
    id: productId,
    updatedAt: new Date().toISOString(),
  };

  if (media.imageUrl) {
    payload.imageUrl = media.imageUrl;
  }
  if (media.backImageUrl) {
    payload.backImageUrl = media.backImageUrl;
  }

  const sanitized = sanitizeForFirestore(payload);

  try {
    await setDoc(doc(db, MEDIA_COLLECTION, productId), sanitized);
    mediaMemoryCache.set(productId, sanitized);
  } catch (error: unknown) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Retrieves garment media from memory cache or Firestore.
 */
export async function getProductMedia(
  productId: string
): Promise<ProductMedia | null> {
  if (!productId) return null;
  if (mediaMemoryCache.has(productId)) {
    return mediaMemoryCache.get(productId) || null;
  }

  const path = `${MEDIA_COLLECTION}/${productId}`;
  try {
    const snap = await getDoc(doc(db, MEDIA_COLLECTION, productId));
    if (snap.exists()) {
      const data = snap.data() as ProductMedia;
      mediaMemoryCache.set(productId, data);
      return data;
    }
    return null;
  } catch (error: unknown) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
}

/**
 * Deletes garment media document when a product is deleted.
 */
export async function deleteProductMedia(productId: string): Promise<void> {
  if (!productId) return;
  const path = `${MEDIA_COLLECTION}/${productId}`;
  try {
    await deleteDoc(doc(db, MEDIA_COLLECTION, productId));
    mediaMemoryCache.delete(productId);
  } catch (error: unknown) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Subscribes to the complete product_media collection in real time.
 */
export function subscribeProductMedia(
  callback: (mediaMap: Record<string, ProductMedia>) => void
): Unsubscribe {
  const colRef = collection(db, MEDIA_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const mediaMap: Record<string, ProductMedia> = {};
      snapshot.forEach((docSnap) => {
        const item = docSnap.data() as ProductMedia;
        mediaMemoryCache.set(item.id, item);
        mediaMap[item.id] = item;
      });
      callback(mediaMap);
    },
    (error: unknown) => {
      console.warn("Product media listener error:", error);
    }
  );
}

/**
 * Strips heavy base64 media from a product object for storage in config/system-wide-config.
 */
export function stripMediaFromProduct<T extends { imageUrl?: string; backImageUrl?: string }>(
  product: T
): T {
  const copy = { ...product };
  delete copy.imageUrl;
  delete copy.backImageUrl;
  return copy;
}
