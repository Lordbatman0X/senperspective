// Firebase-native database and auth proxy for backward compatibility
export * from "./realFirebase";
import { realFirestore } from "./realFirebase";
export default realFirestore;
