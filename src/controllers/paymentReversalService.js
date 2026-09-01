'use strict';

const {
  normalizeAmount,
  calculatePaymentState,
  logActivity,
  dbRun,
  dbGet,
  dbAll,
} = require('./utils/invoiceUtils');
const {
  normalizeCurrency,
  normalizeExchangeRate,
  toBaseAmount,
} = require('./utils/currencyUtils');

function domainError(code, message, details) {
  return { code, message, details };
}

async function recalculateInvoicePaymentState(db, paymentType, invoice) {
  if (!invoice?.id) return null;
  if (invoice.status === 'cancelled') return invoice;

  const rows = await dbAll(
    db,
    `SELECT amount, currency, exchange_rate, amount_base
       FROM payments
      WHERE invoice_id = ? AND payment_type = ? AND status = 'active'`,
    [invoice.id, paymentType],
  );

  const invoiceCurrency = normalizeCurrency(invoice.currency || 'SYP');
  const invoiceRate = normalizeExchangeRate(invoiceCurrency, invoice.exchange_rate);

  const paidAmount = normalizeAmount(rows.reduce((sum, row) => {
    const paymentCurrency = normalizeCurrency(row.currency || 'SYP');
    if (paymentCurrency === invoiceCurrency) {
      return sum + normalizeAmount(row.amount);
    }

    const persistedBase = normalizeAmount(row.amount_base);
    const base = persistedBase > 0
      ? persistedBase
      : toBaseAmount(normalizeAmount(row.amount), normalizeExchangeRate(paymentCurrency, row.exchange_rate));
    return sum + normalizeAmount(base / invoiceRate);
  }, 0));

  const { remainingAmount, status } = calculatePaymentState(invoice.total, paidAmount);
  const table = paymentType === 'purchase' ? 'purchase_invoices' : 'sale_invoices';

  await dbRun(
    db,
    `UPDATE ${table}
        SET paid_amount = ?, remaining_amount = ?, status = ?, updated_at = datetime('now')
      WHERE id = ?`,
    [paidAmount, remainingAmount, status, invoice.id],
  );

  return dbGet(db, `SELECT * FROM ${table} WHERE id = ?`, [invoice.id]);
}

async function reversePaymentInTransaction(db, options) {
  const {
    paymentId,
    expectedType,
    reason,
    userId = null,
  } = options || {};

  if (!paymentId) throw domainError('VALIDATION_ERROR', 'paymentId مطلوب');
  if (!String(reason || '').trim()) throw domainError('VALIDATION_ERROR', 'سبب الإلغاء مطلوب');
  if (!['purchase', 'sale'].includes(expectedType)) {
    throw domainError('PAYMENT_INVALID_REFERENCE_TYPE', 'نوع الدفعة المطلوب غير صالح');
  }

  const payment = await dbGet(db, 'SELECT * FROM payments WHERE id = ?', [paymentId]);
  if (!payment) throw domainError('PAYMENT_NOT_FOUND', 'الدفعة غير موجودة');
  if (payment.status !== 'active') {
    throw domainError('PAYMENT_ALREADY_REVERSED', 'تم عكس هذه الدفعة مسبقًا');
  }
  if (payment.payment_type !== expectedType) {
    throw domainError('PAYMENT_INVALID_REFERENCE_TYPE', 'نوع الدفعة لا يطابق العملية المطلوبة');
  }
  if (!payment.invoice_id) {
    throw domainError('PAYMENT_INVOICE_NOT_FOUND', 'الفاتورة المرتبطة بالدفعة غير موجودة');
  }
  if (!payment.cashbox_transaction_id) {
    throw domainError('PAYMENT_CASHBOX_TRANSACTION_NOT_FOUND', 'حركة الصندوق الأصلية المرتبطة بالدفعة غير موجودة');
  }

  const invoiceTable = expectedType === 'purchase' ? 'purchase_invoices' : 'sale_invoices';
  const partyTable = expectedType === 'purchase' ? 'suppliers' : 'customers';
  const partyLabel = expectedType === 'purchase' ? 'المورد' : 'العميل';
  const invoice = await dbGet(db, `SELECT * FROM ${invoiceTable} WHERE id = ?`, [payment.invoice_id]);
  if (!invoice) throw domainError('PAYMENT_INVOICE_NOT_FOUND', 'الفاتورة المرتبطة بالدفعة غير موجودة');
  if (invoice.status === 'cancelled') {
    throw domainError('PAYMENT_INVOICE_CANCELLED', 'لا يمكن عكس دفعة منفردة بعد إلغاء الفاتورة');
  }
  if (invoice.status === 'draft') {
    throw domainError('PAYMENT_INVOICE_NOT_PAYABLE', 'لا يمكن عكس دفعة مرتبطة بفاتورة مسودة');
  }

  if (expectedType === 'purchase') {
    const settlement = await dbGet(
      db,
      `SELECT id, status FROM consignment_settlements WHERE payment_id = ? AND status = 'completed' LIMIT 1`,
      [payment.id],
    ).catch(() => null);
    if (settlement) {
      throw domainError(
        'PAYMENT_LINKED_CONSIGNMENT_SETTLEMENT',
        'هذه الدفعة مرتبطة بتسوية أمانة مكتملة ويجب عكس التسوية من شاشة الأمانة',
        { settlement_id: settlement.id },
      );
    }
  }

  const originalCashboxTx = await dbGet(
    db,
    'SELECT * FROM cashbox_transactions WHERE id = ?',
    [payment.cashbox_transaction_id],
  );
  if (!originalCashboxTx) {
    throw domainError('PAYMENT_CASHBOX_TRANSACTION_NOT_FOUND', 'حركة الصندوق الأصلية المرتبطة بالدفعة غير موجودة');
  }
  if (Number(originalCashboxTx.cashbox_id) !== Number(payment.cashbox_id)) {
    throw domainError('PAYMENT_REVERSAL_AMOUNT_INVALID', 'حركة الصندوق الأصلية لا تطابق صندوق الدفعة');
  }
  if (originalCashboxTx.reference_type !== expectedType || Number(originalCashboxTx.reference_id) !== Number(payment.invoice_id)) {
    throw domainError('PAYMENT_REVERSAL_AMOUNT_INVALID', 'مرجع حركة الصندوق الأصلية لا يطابق الفاتورة والدفعة');
  }

  const expectedOriginalDirection = expectedType === 'purchase' ? 'out' : 'in';
  if (originalCashboxTx.direction !== expectedOriginalDirection) {
    throw domainError('PAYMENT_REVERSAL_AMOUNT_INVALID', 'اتجاه حركة الصندوق الأصلية غير متوافق مع نوع الدفعة');
  }

  const existingReversal = await dbGet(
    db,
    'SELECT id FROM cashbox_transactions WHERE reversed_transaction_id = ? LIMIT 1',
    [originalCashboxTx.id],
  );
  if (existingReversal) {
    throw domainError('PAYMENT_REVERSAL_ALREADY_EXISTS', 'توجد حركة عكس مسجلة مسبقًا لهذه الدفعة');
  }

  const cashbox = await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [payment.cashbox_id]);
  if (!cashbox) throw domainError('PAYMENT_CASHBOX_NOT_FOUND', 'صندوق الدفعة غير موجود');

  const originalCashAmount = normalizeAmount(originalCashboxTx.amount);
  if (!(originalCashAmount > 0)) {
    throw domainError('PAYMENT_REVERSAL_AMOUNT_INVALID', 'مبلغ حركة الصندوق الأصلية غير صالح للعكس');
  }

  const paymentAmount = normalizeAmount(payment.amount);
  if (!(paymentAmount > 0)) {
    throw domainError('PAYMENT_REVERSAL_AMOUNT_INVALID', 'مبلغ الدفعة غير صالح للعكس');
  }

  const cashboxBalanceBefore = normalizeAmount(cashbox.balance);
  const cashboxDelta = originalCashboxTx.direction === 'in' ? -originalCashAmount : originalCashAmount;
  if (cashboxDelta < 0 && cashboxBalanceBefore < Math.abs(cashboxDelta) - 0.001) {
    throw domainError('PAYMENT_REVERSAL_BALANCE_INVALID', 'رصيد الصندوق لا يكفي لعكس هذه الدفعة');
  }
  const cashboxBalanceAfter = normalizeAmount(cashboxBalanceBefore + cashboxDelta);

  const persistedAmountBase = normalizeAmount(payment.amount_base);
  const amountBase = persistedAmountBase > 0
    ? persistedAmountBase
    : toBaseAmount(
        paymentAmount,
        normalizeExchangeRate(normalizeCurrency(payment.currency || 'SYP'), payment.exchange_rate),
      );

  if (!(amountBase >= 0)) {
    throw domainError('PAYMENT_REVERSAL_AMOUNT_INVALID', 'القيمة الأساسية للدفعة غير صالحة');
  }

  const oldInvoiceState = {
    paid_amount: normalizeAmount(invoice.paid_amount),
    remaining_amount: normalizeAmount(invoice.remaining_amount),
    status: invoice.status,
  };

  // Restore the exact original cashbox effect.
  await dbRun(
    db,
    `UPDATE cashboxes SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
    [cashboxBalanceAfter, payment.cashbox_id],
  );

  const reversalDirection = originalCashboxTx.direction === 'in' ? 'out' : 'in';
  const reversalDate = new Date().toISOString().slice(0, 10);
  const { lastID: reversalCashboxTransactionId } = await dbRun(
    db,
    `INSERT INTO cashbox_transactions
       (cashbox_id, reference_type, reference_id, amount, direction,
        balance_before, balance_after, reversed_transaction_id, reversal_reason,
        transaction_date, notes, created_at, updated_at)
     VALUES (?, 'reversal', ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      payment.cashbox_id,
      payment.id,
      originalCashAmount,
      reversalDirection,
      cashboxBalanceBefore,
      cashboxBalanceAfter,
      originalCashboxTx.id,
      String(reason).trim(),
      reversalDate,
      `${expectedType === 'purchase' ? 'عكس دفعة شراء' : 'عكس دفعة بيع'} #${payment.id}`,
    ],
  );

  // Restore party balance by applying the exact inverse of normal sale/purchase payment creation.
  let partyBalanceBefore = null;
  let partyBalanceAfter = null;
  if (payment.party_id) {
    const party = await dbGet(db, `SELECT * FROM ${partyTable} WHERE id = ?`, [payment.party_id]);
    if (!party) throw domainError('PAYMENT_PARTY_NOT_FOUND', `${partyLabel} المرتبط بالدفعة غير موجود`);
    partyBalanceBefore = normalizeAmount(party.balance);
    partyBalanceAfter = normalizeAmount(partyBalanceBefore + amountBase);
    await dbRun(
      db,
      `UPDATE ${partyTable} SET balance = ?, updated_at = datetime('now') WHERE id = ?`,
      [partyBalanceAfter, payment.party_id],
    );
  }

  await dbRun(
    db,
    `UPDATE payments
        SET status = 'reversed', reversal_reason = ?, updated_at = datetime('now')
      WHERE id = ? AND status = 'active'`,
    [String(reason).trim(), payment.id],
  );

  // Preserve an explicit audit payment record for compatibility with the existing schema/UI.
  const paymentCurrency = normalizeCurrency(payment.currency || 'SYP');
  const paymentRate = normalizeExchangeRate(paymentCurrency, payment.exchange_rate);
  const reversalPaymentType = expectedType === 'purchase' ? 'purchase_reversal' : 'sale_reversal';
  const { lastID: reversalPaymentId } = await dbRun(
    db,
    `INSERT INTO payments
       (party_type, party_id, payment_type, invoice_id, cashbox_id, amount, currency,
        exchange_rate, amount_base, payment_date, status, reversed_payment_id,
        cashbox_transaction_id, balance_before, balance_after, reversal_reason,
        notes, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
    [
      payment.party_type,
      payment.party_id,
      reversalPaymentType,
      payment.invoice_id,
      payment.cashbox_id,
      paymentAmount,
      paymentCurrency,
      paymentRate,
      amountBase,
      reversalDate,
      payment.id,
      reversalCashboxTransactionId,
      partyBalanceBefore,
      partyBalanceAfter,
      String(reason).trim(),
      `عكس الدفعة #${payment.id}`,
      userId,
    ],
  );

  await dbRun(
    db,
    `UPDATE payments SET reversed_payment_id = ?, updated_at = datetime('now') WHERE id = ?`,
    [reversalPaymentId, payment.id],
  );

  const updatedInvoice = await recalculateInvoicePaymentState(db, expectedType, invoice);

  const updatedPayment = await dbGet(db, 'SELECT * FROM payments WHERE id = ?', [payment.id]);
  const reversalPayment = await dbGet(db, 'SELECT * FROM payments WHERE id = ?', [reversalPaymentId]);
  const reversalCashboxTransaction = await dbGet(db, 'SELECT * FROM cashbox_transactions WHERE id = ?', [reversalCashboxTransactionId]);

  await logActivity(
    db,
    expectedType === 'purchase' ? 'purchase_payment_reversed' : 'sale_payment_reversed',
    'payments',
    payment.id,
    {
      payment_id: payment.id,
      invoice_id: payment.invoice_id,
      invoice_number: invoice.invoice_number,
      amount: paymentAmount,
      currency: paymentCurrency,
      amount_base: amountBase,
      cashbox_id: payment.cashbox_id,
      cashbox_transaction_id: originalCashboxTx.id,
      reversal_cashbox_transaction_id: reversalCashboxTransactionId,
      reason: String(reason).trim(),
      old_paid_amount: oldInvoiceState.paid_amount,
      new_paid_amount: updatedInvoice ? normalizeAmount(updatedInvoice.paid_amount) : oldInvoiceState.paid_amount,
      old_remaining_amount: oldInvoiceState.remaining_amount,
      new_remaining_amount: updatedInvoice ? normalizeAmount(updatedInvoice.remaining_amount) : oldInvoiceState.remaining_amount,
      old_status: oldInvoiceState.status,
      new_status: updatedInvoice?.status ?? oldInvoiceState.status,
      user_id: userId,
    },
  );

  return {
    success: true,
    payment: updatedPayment,
    reversedPayment: updatedPayment,
    reversalPayment,
    originalCashboxTransaction: originalCashboxTx,
    reversalCashboxTransaction,
    invoice: updatedInvoice,
    cashbox: await dbGet(db, 'SELECT * FROM cashboxes WHERE id = ?', [payment.cashbox_id]),
  };
}

module.exports = {
  reversePaymentInTransaction,
  recalculateInvoicePaymentState,
};
