// Re-exports from domain-specific modules
export {
  withFirestoreTimeout,
  cleanForRtdb,
  toList,
  safeKey,
  rtdbPathSegment,
  isPermissionError,
} from './helpers';

export { fetchAllArticles, saveArticle, deleteArticle } from './articles';
export {
  subscribeToUsers,
  addSubscriberEmail,
  removeSubscriberEmail,
  updateSiteSettings,
} from './users';

export {
  fetchAllComments,
  addComment as saveCommentToFirestore,
  deleteComment as firestoreDeleteComment,
} from './comments';

export {
  fetchAllAds,
  subscribeToAds,
  saveAdToRTDB,
  deleteAdFromRTDB,
} from './ads';

export {
  saveFirestoreDoc,
  mergeFirestoreDoc,
  deleteFirestoreDoc,
  fetchFirestoreCollection,
} from './firestore';

export { fetchAllComments as fetchAllCommentsFromFirestore } from './comments';