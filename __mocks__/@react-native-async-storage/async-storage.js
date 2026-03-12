// Stateful AsyncStorage mock for tests
const asyncStorageData = new Map();

const AsyncStorageMock = {
  setItem: jest.fn((key, value) => {
    asyncStorageData.set(key, value);
    return Promise.resolve();
  }),
  getItem: jest.fn((key) => {
    return Promise.resolve(asyncStorageData.get(key) || null);
  }),
  removeItem: jest.fn((key) => {
    asyncStorageData.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    asyncStorageData.clear();
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => {
    return Promise.resolve(Array.from(asyncStorageData.keys()));
  }),
  multiGet: jest.fn((keys) => {
    return Promise.resolve(
      keys.map((key) => [key, asyncStorageData.get(key) || null])
    );
  }),
  multiSet: jest.fn((keyValuePairs) => {
    keyValuePairs.forEach(([key, value]) => {
      asyncStorageData.set(key, value);
    });
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys) => {
    keys.forEach((key) => {
      asyncStorageData.delete(key);
    });
    return Promise.resolve();
  }),
};

export default AsyncStorageMock;
