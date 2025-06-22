// Type definitions for global test variables
declare global {
  namespace NodeJS {
    interface Global {
      __testRouters: any[];
      testUtils: {
        delay: (ms: number) => Promise<void>;
        generateTestId: () => string;
      };
    }
  }
  
  var testUtils: {
    delay: (ms: number) => Promise<void>;
    generateTestId: () => string;
  };
}

export {};