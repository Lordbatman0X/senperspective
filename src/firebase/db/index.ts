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
  subscribeToSiteSettings,
} from './users';

export {
  fetchAllComments,
  addComment as saveCommentToFirestore,
  deleteComment as firestoreDeleteComment,
  subscribeToAllComments,
} from './comments';

export {
  fetchAllAds,
  subscribeToAds,
  saveAdToRTDB,
  deleteAdFromRTDB,
  incrementAdMetric,
} from './ads';

export {
  subscribeToNotifications,
} from './notifications';

export {
  subscribeToMessages,
} from './messages';

export {
  saveFirestoreDoc,
  mergeFirestoreDoc,
  deleteFirestoreDoc,
  fetchFirestoreCollection,
} from './firestore';

export { fetchAllComments as fetchAllCommentsFromFirestore } from './comments';