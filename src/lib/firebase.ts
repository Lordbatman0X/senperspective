// Re-export Firebase client API for app-wide Firebase integration
export * from "./realFirebase";
import { realFirestore } from "./realFirebase";
export default realFirestore;
