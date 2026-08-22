import { db, collection, getDocs, doc, getDoc } from './mongodb';
import { useStore } from '../store';
import { safeFetchJson } from './apiUtils';

export interface DatabaseSnapshot {
  articles: any[];
  users: any[];
  comments: any[];
  messages: any[];
  media: any[];
  subscribers: any[];
  siteSettings: any;
  matches: any[];
  reports: any[];
  exportedAt?: string;
  version?: string;
  source?: string;
}

export interface VercelStorageStatus {
  success: boolean;
  isVercel: boolean;
  activeProvider: string;
  storage: {
    vercelKv: boolean;
    vercelPostgres: boolean;
    vercelBlob: boolean;
  };
  message: string;
}

/**
 * Fetches status of Vercel Storage integration from server API
 */
export async function getVercelStorageStatus(): Promise<VercelStorageStatus> {
  const result = await safeFetchJson<VercelStorageStatus>('/api/vercel-db/status');
  if (result.ok && result.data) {
    return result.data;
  }
  return {
    success: false,
    isVercel: false,
    activeProvider: 'local',
    storage: {
      vercelKv: false,
      vercelPostgres: false,
      vercelBlob: false
    },
    message: result.error || 'Statut Vercel Storage indisponible (Vérifiez le serveur API)'
  };
}

/**
 * Exports all data from Firebase Firestore (with fallback to active store cache)
 */
export async function exportFirebaseSnapshot(): Promise<DatabaseSnapshot> {
  const storeState = useStore.getState();

  const snapshot: DatabaseSnapshot = {
    articles: [...(storeState.articles || [])],
    users: [...(storeState.users || [])],
    comments: [...(storeState.comments || [])],
    messages: [...(storeState.directMessages || [])],
    media: [...(storeState.media || [])],
    subscribers: [...(storeState.subscribers || [])],
    siteSettings: { ...(storeState.siteSettings || {}) },
    matches: [...(storeState.matches || [])],
    reports: [],
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
    source: 'Firebase Firestore & Perspective Cache'
  };

  // Attempt to fetch fresh data from Firebase Firestore if available
  try {
    // 1. Articles
    const articlesSnap = await getDocs(collection(db, 'articles'));
    if (!articlesSnap.empty) {
      snapshot.articles = articlesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // 2. Users
    const usersSnap = await getDocs(collection(db, 'users'));
    if (!usersSnap.empty) {
      snapshot.users = usersSnap.docs.map(d => ({ email: d.id, ...d.data() }));
    }

    // 3. Comments
    const commentsSnap = await getDocs(collection(db, 'comments'));
    if (!commentsSnap.empty) {
      snapshot.comments = commentsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // 4. Messages
    const messagesSnap = await getDocs(collection(db, 'messages'));
    if (!messagesSnap.empty) {
      snapshot.messages = messagesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // 5. Media
    const mediaSnap = await getDocs(collection(db, 'media'));
    if (!mediaSnap.empty) {
      snapshot.media = mediaSnap.docs.map(d => d.data());
    }

    // 6. Subscribers
    const subSnap = await getDocs(collection(db, 'subscribers'));
    if (!subSnap.empty) {
      snapshot.subscribers = subSnap.docs.map(d => d.data());
    }

    // 7. Site Settings
    const settingsSnap = await getDoc(doc(db, 'siteSettings', 'config'));
    if (settingsSnap.exists()) {
      snapshot.siteSettings = settingsSnap.data();
    }

    // 8. Matches
    const matchesSnap = await getDocs(collection(db, 'matches'));
    if (!matchesSnap.empty) {
      snapshot.matches = matchesSnap.docs.map(d => d.data());
    }

    // 9. Reports
    const reportsSnap = await getDocs(collection(db, 'reports'));
    if (!reportsSnap.empty) {
      snapshot.reports = reportsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    }
  } catch (err) {
    console.warn('[Snapshot Export] Firestore fetch notice (using store cache):', err);
  }

  return snapshot;
}

/**
 * Triggers browser download of the exported JSON backup file
 */
export function downloadSnapshotFile(snapshot: DatabaseSnapshot) {
  const fileName = `perspective_firebase_backup_${new Date().toISOString().split('T')[0]}.json`;
  const jsonStr = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Sends snapshot payload to Vercel Storage API
 */
export async function importSnapshotToVercel(snapshot: DatabaseSnapshot): Promise<{
  success: boolean;
  message: string;
  counts?: any;
  error?: string;
}> {
  try {
    const result = await safeFetchJson('/api/vercel-db/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(snapshot)
    });

    if (!result.ok || !result.data?.success) {
      throw new Error(result.error || result.data?.error || 'Erreur lors de l\'importation vers Vercel');
    }

    const data = result.data;

    // Synchronize local Zustand state
    const store = useStore.getState();
    if (Array.isArray(snapshot.articles) && snapshot.articles.length > 0) {
      useStore.setState({ articles: snapshot.articles });
    }
    if (Array.isArray(snapshot.users) && snapshot.users.length > 0) {
      useStore.setState({ users: snapshot.users });
    }
    if (Array.isArray(snapshot.comments) && snapshot.comments.length > 0) {
      useStore.setState({ comments: snapshot.comments });
    }
    if (Array.isArray(snapshot.messages) && snapshot.messages.length > 0) {
      useStore.setState({ directMessages: snapshot.messages });
    }
    if (snapshot.siteSettings) {
      useStore.setState({ siteSettings: { ...store.siteSettings, ...snapshot.siteSettings } });
    }

    return {
      success: true,
      message: data.message || 'Données importées avec succès dans Vercel Storage !',
      counts: data.counts
    };
  } catch (err: any) {
    return {
      success: false,
      message: 'Échec de l\'importation',
      error: err?.message || String(err)
    };
  }
}
