function getApi() {
  if (!window.stockliteApi) {
    throw new Error('StockLite IPC API is unavailable. Run the application inside Electron.');
  }

  return window.stockliteApi;
}

export const api = getApi();
