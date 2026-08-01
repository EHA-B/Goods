"use strict";
const electron = require("electron");
const stockliteApi = {
  products: {
    list: () => electron.ipcRenderer.invoke("products:list"),
    get: (id) => electron.ipcRenderer.invoke("products:get", id),
    create: (input) => electron.ipcRenderer.invoke("products:create", input),
    update: (id, input) => electron.ipcRenderer.invoke("products:update", id, input),
    remove: (id) => electron.ipcRenderer.invoke("products:remove", id)
  },
  customers: {
    list: () => electron.ipcRenderer.invoke("customers:list"),
    get: (id) => electron.ipcRenderer.invoke("customers:get", id),
    create: (input) => electron.ipcRenderer.invoke("customers:create", input),
    update: (id, input) => electron.ipcRenderer.invoke("customers:update", id, input),
    remove: (id) => electron.ipcRenderer.invoke("customers:remove", id)
  },
  suppliers: {
    list: () => electron.ipcRenderer.invoke("suppliers:list"),
    get: (id) => electron.ipcRenderer.invoke("suppliers:get", id),
    create: (input) => electron.ipcRenderer.invoke("suppliers:create", input),
    update: (id, input) => electron.ipcRenderer.invoke("suppliers:update", id, input),
    remove: (id) => electron.ipcRenderer.invoke("suppliers:remove", id)
  },
  cashboxes: {
    list: () => electron.ipcRenderer.invoke("cashboxes:list"),
    get: (id) => electron.ipcRenderer.invoke("cashboxes:get", id),
    create: (input) => electron.ipcRenderer.invoke("cashboxes:create", input),
    update: (id, input) => electron.ipcRenderer.invoke("cashboxes:update", id, input),
    summary: () => electron.ipcRenderer.invoke("cashboxes:summary"),
    transfer: (from_id, to_id, amount, date, notes) => electron.ipcRenderer.invoke("cashboxes:transfer", from_id, to_id, amount, date, notes)
  },
  cashboxTransactions: {
    list: () => electron.ipcRenderer.invoke("cashboxTransactions:list"),
    get: (id) => electron.ipcRenderer.invoke("cashboxTransactions:get", id),
    create: (input) => electron.ipcRenderer.invoke("cashboxTransactions:create", input),
    update: (id, input) => electron.ipcRenderer.invoke("cashboxTransactions:update", id, input),
    remove: (id) => electron.ipcRenderer.invoke("cashboxTransactions:remove", id)
  }
};
electron.contextBridge.exposeInMainWorld("stockliteApi", stockliteApi);
electron.contextBridge.exposeInMainWorld("ipcRenderer", {
  on(...args) {
    const [channel, listener] = args;
    return electron.ipcRenderer.on(channel, (event, ...values) => listener(event, ...values));
  },
  off(...args) {
    const [channel, ...rest] = args;
    return electron.ipcRenderer.off(channel, ...rest);
  },
  send(...args) {
    const [channel, ...rest] = args;
    return electron.ipcRenderer.send(channel, ...rest);
  },
  invoke(...args) {
    const [channel, ...rest] = args;
    return electron.ipcRenderer.invoke(channel, ...rest);
  }
});
