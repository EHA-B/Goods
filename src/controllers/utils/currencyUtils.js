'use strict';

const BASE_CURRENCY = 'SYP';
const SUPPORTED_CURRENCIES = Object.freeze(['SYP', 'USD']);

function roundMoney(value) {
    return Math.round((Number(value) || 0) * 100) / 100;
}

function normalizeCurrency(value) {
    const currency = String(value || BASE_CURRENCY).trim().toUpperCase();
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
        throw { code: 'UNSUPPORTED_CURRENCY', message: `العملة ${currency} غير مدعومة` };
    }
    return currency;
}

function normalizeExchangeRate(currencyValue, rateValue) {
    const currency = normalizeCurrency(currencyValue);
    if (currency === BASE_CURRENCY) return 1;

    const rate = Number(rateValue);
    if (!Number.isFinite(rate) || rate <= 0) {
        throw {
            code: 'INVALID_EXCHANGE_RATE',
            message: `سعر الصرف مطلوب ويجب أن يكون أكبر من صفر. التعريف المعتمد: 1 ${currency} = X ${BASE_CURRENCY}`,
        };
    }
    return rate;
}

function toBaseAmount(amount, exchangeRate) {
    return roundMoney(Number(amount) * Number(exchangeRate));
}

function assertCashboxCurrency(cashbox, invoiceCurrency) {
    const cashboxCurrency = normalizeCurrency(cashbox?.currency);
    const normalizedInvoiceCurrency = normalizeCurrency(invoiceCurrency);
    if (cashboxCurrency !== normalizedInvoiceCurrency) {
        throw {
            code: 'CASHBOX_CURRENCY_MISMATCH',
            message: `عملة الصندوق (${cashboxCurrency}) لا تطابق عملة الفاتورة (${normalizedInvoiceCurrency})`,
        };
    }
}

module.exports = {
    BASE_CURRENCY,
    SUPPORTED_CURRENCIES,
    roundMoney,
    normalizeCurrency,
    normalizeExchangeRate,
    toBaseAmount,
    assertCashboxCurrency,
};
