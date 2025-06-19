// Type definitions for global test variables
declare global {
  namespace NodeJS {
    interface Global {
      __testRouters: any[];
    }
  }
}

export {};