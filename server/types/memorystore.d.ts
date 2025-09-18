declare module 'memorystore' {
  import { Store } from 'express-session';
  
  function createMemoryStore(session: any): new (options?: any) => Store;
  
  export = createMemoryStore;
}
