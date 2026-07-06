import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
import { configure } from '@testing-library/dom';

// findBy*/waitFor default to 1s, which parallel jsdom workers on a loaded
// machine routinely exceed (slow WebCrypto, IndexedDB round-trips).
configure({ asyncUtilTimeout: 5_000 });
