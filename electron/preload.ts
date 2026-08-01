import { contextBridge, ipcRenderer } from "electron";

const stockliteApi = {
  products: {
    list: () => ipcRenderer.invoke("products:list"),
    get: (id: number) => ipcRenderer.invoke("products:get", id),
    create: (input: unknown) => ipcRenderer.invoke("products:create", input),
    update: (id: number, input: unknown) => ipcRenderer.invoke("products:update", id, input),
    remove: (id: number) => ipcRenderer.invoke("products:remove", id),
  },
  customers: {
    list: () => ipcRenderer.invoke("customers:list"),
    get: (id: number) => ipcRenderer.invoke("customers:get", id),
    create: (input: unknown) => ipcRenderer.invoke("customers:create", input),
    update: (id: number, input: unknown) => ipcRenderer.invoke("customers:update", id, input),
    remove: (id: number) => ipcRenderer.invoke("customers:remove", id),
  },
  suppliers: {
    list: () => ipcRenderer.invoke("suppliers:list"),
    get: (id: number) => ipcRenderer.invoke("suppliers:get", id),
    create: (input: unknown) => ipcRenderer.invoke("suppliers:create", input),
    update: (id: number, input: unknown) => ipcRenderer.invoke("suppliers:update", id, input),
    remove: (id: number) => ipcRenderer.invoke("suppliers:remove", id),
  },
  cashboxes: {
    list: () => ipcRenderer.invoke("cashboxes:list"),
    get: (id: number) => ipcRenderer.invoke("cashboxes:get", id),
    create: (input: unknown) => ipcRenderer.invoke("cashboxes:create", input),
    update: (id: number, input: unknown) => ipcRenderer.invoke("cashboxes:update", id, input),
    summary: () => ipcRenderer.invoke("cashboxes:summary"),
    transfer: (from_id: number, to_id: number, amount: number, date: string, notes: string) => ipcRenderer.invoke("cashboxes:transfer", from_id, to_id, amount, date, notes),
  },
  cashboxTransactions: {
    list: () => ipcRenderer.invoke("cashboxTransactions:list"),
    get: (id: number) => ipcRenderer.invoke("cashboxTransactions:get", id),
    create: (input: unknown) => ipcRenderer.invoke("cashboxTransactions:create", input),
    update: (id: number, input: unknown) => ipcRenderer.invoke("cashboxTransactions:update", id, input),
    remove: (id: number) => ipcRenderer.invoke("cashboxTransactions:remove", id),
  },
};

contextBridge.exposeInMainWorld("stockliteApi", stockliteApi);

contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...values) => listener(event, ...values));
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...rest] = args;
    return ipcRenderer.off(channel, ...rest);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...rest] = args;
    return ipcRenderer.send(channel, ...rest);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...rest] = args;
    return ipcRenderer.invoke(channel, ...rest);
  },
});
