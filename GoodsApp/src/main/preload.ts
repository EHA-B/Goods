import { contextBridge, ipcRenderer } from 'electron';  

// نوع موحد لكل handlers  
type IpcHandler = (channel: string, ...args: any[]) => Promise<any>;  

const api = {  
  // —— المزارع ——  
  farms: {  
    list: (): Promise<any[]> => ipcRenderer.invoke('farms:list'),  
    getById: (id: number): Promise<any> => ipcRenderer.invoke('farms:getById', id),  
    create: (data: any): Promise<any> => ipcRenderer.invoke('farms:create', data),  
    update: (id: number, data: any): Promise<any> => ipcRenderer.invoke('farms:update', id, data),  
    delete: (id: number): Promise<void> => ipcRenderer.invoke('farms:delete', id),  
  },  

  // —— المنتجات ——  
  products: {  
    list: (): Promise<any[]> => ipcRenderer.invoke('products:list'),  
    getById: (id: number): Promise<any> => ipcRenderer.invoke('products:getById', id),  
    create: (data: any): Promise<any> => ipcRenderer.invoke('products:create', data),  
    update: (id: number, data: any): Promise<any> => ipcRenderer.invoke('products:update', id, data),  
    delete: (id: number): Promise<void> => ipcRenderer.invoke('products:delete', id),  
  },  

  // —— الموردين ——  
  suppliers: {  
    list: (): Promise<any[]> => ipcRenderer.invoke('suppliers:list'),  
    getById: (id: number): Promise<any> => ipcRenderer.invoke('suppliers:getById', id),  
    create: (data: any): Promise<any> => ipcRenderer.invoke('suppliers:create', data),  
    update: (id: number, data: any): Promise<any> => ipcRenderer.invoke('suppliers:update', id, data),  
    delete: (id: number): Promise<void> => ipcRenderer.invoke('suppliers:delete', id),  
  },  

  // —— المخزون (Stock Batches) ——  
  stock: {  
    list: (): Promise<any[]> => ipcRenderer.invoke('stock:list'),  
    getById: (id: number): Promise<any> => ipcRenderer.invoke('stock:getById', id),  
    create: (data: any): Promise<any> => ipcRenderer.invoke('stock:create', data),  
    update: (id: number, data: any): Promise<any> => ipcRenderer.invoke('stock:update', id, data),  
    delete: (id: number): Promise<void> => ipcRenderer.invoke('stock:delete', id),  
  },  

}