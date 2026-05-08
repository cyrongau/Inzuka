import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
   testEnv = await initializeTestEnvironment({
      projectId: "demo-aistudio",
      firestore: {
         rules: readFileSync(resolve(__dirname, "firestore.rules"), "utf8")
      }
   });
});

afterAll(async () => {
   await testEnv.cleanup();
});

describe('Firestore Security Rules', () => {
   it('should deny unauthorized access', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await expect(unauthedDb.collection("users").get()).rejects.toThrow();
   });
});
