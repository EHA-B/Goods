const path = require('path');
const { ipcMain } = require('electron');
const PaymentService = require(path.join(__dirname, '../../Services', 'Payments'));

const service = new PaymentService();

function success(data) {
  return { success: true, data };
}
function failure(code, message, details) {
  return { success: false, error: { code, message, details } };
}

// Create payment
ipcMain.handle('api:payment:create', async (_event, payload) => {
  try {
    const result = await service.createPayment(payload);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

// Get by id
ipcMain.handle('api:payment:get', async (_event, id) => {
  try {
    const result = await service.getPayment(id);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

// Update
ipcMain.handle('api:payment:update', async (_event, id, patch) => {
  try {
    const updated = await service.updatePayment(id, patch);
    return success(updated);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

// Delete
ipcMain.handle('api:payment:delete', async (_event, id) => {
  try {
    await service.deletePayment(id);
    return success(null);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

// List all payments (with optional filters)
ipcMain.handle('api:payment:list', async (_event, filters) => {
  try {
    const result = await service.paymentList(filters);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

// Get payments by project
ipcMain.handle('api:payment:getByProject', async (_event, projectID) => {
  try {
    const result = await service.getPaymentsByProject(projectID);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

// Get payments by supplier
ipcMain.handle('api:payment:getBySupplier', async (_event, supplierID) => {
  try {
    const result = await service.getPaymentsBySupplier(supplierID);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

// Get payments by client
ipcMain.handle('api:payment:getByClient', async (_event, clientID) => {
  try {
    const result = await service.getPaymentsByClient(clientID);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

// Get payments by expense
ipcMain.handle('api:payment:getByExpense', async (_event, expenseID) => {
  try {
    const result = await service.getPaymentsByExpense(expenseID);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

// Get payments summary
ipcMain.handle('api:payment:getSummary', async (_event, filters) => {
  try {
    const result = await service.getPaymentsSummary(filters);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

// Create payment with allocations
ipcMain.handle('api:payment:createWithAllocations', async (_event, payload) => {
  try {
    // payload should be { payment: {...}, allocations: [...] }
    const result = await service.createPaymentWithAllocations(payload.payment, payload.allocations);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

// Update payment with allocations
ipcMain.handle('api:payment:updateWithAllocations', async (_event, payload) => {
  try {
    // payload should be { id: ..., payment: {...}, allocations: [...] }
    const result = await service.updatePaymentWithAllocations(payload.id, payload.payment, payload.allocations);
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});

// Get projects that have payments
ipcMain.handle('api:payment:getProjectsWithPayments', async (_event) => {
  try {
    const result = await service.getProjectsWithPayments();
    return success(result);
  } catch (e) {
    return failure(e.code || 'UNKNOWN_ERROR', e.message || 'Unknown error', e.details);
  }
});
