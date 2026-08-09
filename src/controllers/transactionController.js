function getKnex() {
    if (!global.__knex) throw new Error("Knex not initialized");
    return global.__knex;
}

const ALLOWED_CURRENCIES = new Set(['SYP', 'USD', 'EUR']);

function validateDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateStr))) {
        throw { code: 'INVALID_TRANSACTION_DATE', message: 'transaction_date must be in YYYY-MM-DD format' };
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
        throw { code: 'INVALID_TRANSACTION_DATE', message: `Invalid date: ${dateStr}` };
    }
    return dateStr;
}

class TransactionController {

    async createFinancialTransaction(input) {
        const { type, category_id, cashbox_id, amount, transaction_date, description, reference_number, notes } = input;

        if (!type || !['income', 'expense'].includes(type)) {
            throw { code: 'VALIDATION_ERROR', message: 'type must be income or expense' };
        }
        if (!category_id) throw { code: 'VALIDATION_ERROR', message: 'category_id is required' };
        if (!cashbox_id) throw { code: 'VALIDATION_ERROR', message: 'cashbox_id is required' };
        
        const numAmount = Number(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            throw { code: 'VALIDATION_ERROR', message: 'amount must be a positive number' };
        }

        const txDate = validateDate(transaction_date);
        const knex = getKnex();

        let transactionId;

        await knex.transaction(async (trx) => {
            // 1. Load category
            const category = await trx('transaction_categories').where('id', category_id).first();
            if (!category) throw { code: 'NOT_FOUND', message: 'Category not found' };
            if (!category.isActive) throw { code: 'INACTIVE_CATEGORY', message: 'Category is inactive' };
            if (category.type !== type) {
                throw { code: 'CATEGORY_TYPE_MISMATCH', message: 'Category type does not match transaction type' };
            }

            // 2. Load cashbox
            const cashbox = await trx('cashboxes').where('id', cashbox_id).first();
            if (!cashbox) throw { code: 'NOT_FOUND', message: 'Cashbox not found' };
            if (!cashbox.isActive) throw { code: 'INACTIVE_CASHBOX', message: 'Cashbox is inactive' };

            // 3. Validate balance for expenses
            const balanceBefore = Number(cashbox.balance);
            let balanceAfter = balanceBefore;
            if (type === 'expense') {
                balanceAfter -= numAmount;
                if (balanceAfter < 0) {
                    throw { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance for this expense' };
                }
            } else {
                balanceAfter += numAmount;
            }

            // 4. Insert transaction row
            const [newTxId] = await trx('transactions').insert({
                category_id,
                cashbox_id,
                amount: numAmount,
                direction: type,
                transaction_date: txDate,
                description: description || null,
                reference_number: reference_number || null,
                notes: notes || null,
                status: 'active',
                created_at: knex.fn.now(),
                updated_at: knex.fn.now()
            });
            transactionId = newTxId;

            // 5. Update cashbox balance
            await trx('cashboxes')
                .where('id', cashbox_id)
                .update({ balance: balanceAfter, updated_at: knex.fn.now() });

            // 6. Create cashbox movement
            const movementDirection = type === 'income' ? 'in' : 'out';
            const [movementId] = await trx('cashbox_transactions').insert({
                cashbox_id,
                reference_type: type, // 'income' or 'expense'
                reference_id: transactionId,
                amount: numAmount,
                direction: movementDirection,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                transaction_date: txDate,
                notes: `Financial Transaction: ${description || type}`,
                created_at: knex.fn.now(),
                updated_at: knex.fn.now()
            });

            // 7. Store movement id on transaction
            await trx('transactions').where('id', transactionId).update({
                cashbox_transaction_id: movementId
            });

            // 8. Create activity log
            await trx('activity_logs').insert({
                action: 'financial_transaction_created',
                table_name: 'transactions',
                record_id: transactionId,
                new_data: JSON.stringify({ type, amount: numAmount, cashbox_id, category_id }),
                created_at: knex.fn.now(),
                updated_at: knex.fn.now()
            });
        });

        return this.getFinancialTransactionDetails(transactionId);
    }

    async getFinancialTransactionDetails(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const knex = getKnex();

        const transaction = await knex('transactions').where('id', id).first();
        if (!transaction) throw { code: 'NOT_FOUND', message: 'Transaction not found' };

        const category = await knex('transaction_categories').where('id', transaction.category_id).first();
        const cashbox = await knex('cashboxes').where('id', transaction.cashbox_id).first();
        
        let cashbox_movement = null;
        if (transaction.cashbox_transaction_id) {
            cashbox_movement = await knex('cashbox_transactions').where('id', transaction.cashbox_transaction_id).first();
        }

        let reversal_transaction = null;
        if (transaction.reversed_transaction_id) {
            reversal_transaction = await knex('transactions').where('id', transaction.reversed_transaction_id).first();
        }

        const activity = await knex('activity_logs')
            .where('table_name', 'transactions')
            .where('record_id', id)
            .orderBy('created_at', 'desc');

        return {
            transaction,
            category,
            cashbox,
            cashbox_movement,
            reversal_transaction,
            activity
        };
    }

    async listFinancialTransactions(filters = {}, pagination = {}) {
        const knex = getKnex();
        let query = knex('transactions')
            .select('transactions.*', 'transaction_categories.name as category_name', 'cashboxes.name as cashbox_name')
            .leftJoin('transaction_categories', 'transactions.category_id', 'transaction_categories.id')
            .leftJoin('cashboxes', 'transactions.cashbox_id', 'cashboxes.id');

        if (filters.search) {
            query = query.where(function() {
                this.where('transactions.description', 'like', `%${filters.search}%`)
                    .orWhere('transactions.notes', 'like', `%${filters.search}%`);
            });
        }
        if (filters.type) {
            query = query.where('transactions.direction', filters.type);
        }
        if (filters.category_id) {
            query = query.where('transactions.category_id', filters.category_id);
        }
        if (filters.cashbox_id) {
            query = query.where('transactions.cashbox_id', filters.cashbox_id);
        }
        if (filters.status) {
            query = query.where('transactions.status', filters.status);
        }
        if (filters.date_from) {
            query = query.where('transactions.transaction_date', '>=', filters.date_from);
        }
        if (filters.date_to) {
            query = query.where('transactions.transaction_date', '<=', filters.date_to);
        }
        if (filters.currency) {
            query = query.where('cashboxes.currency', filters.currency);
        }

        query = query.orderBy('transactions.transaction_date', 'desc').orderBy('transactions.id', 'desc');

        const page = parseInt(pagination.page) || 1;
        const limit = parseInt(pagination.limit) || 50;
        const offset = (page - 1) * limit;

        const countQuery = query.clone().clearSelect().count('* as total').first();
        const { total } = await countQuery;
        
        const items = await query.limit(limit).offset(offset);

        return {
            items,
            pagination: {
                page,
                limit,
                total: Number(total || 0),
                totalPages: Math.ceil(Number(total || 0) / limit)
            }
        };
    }

    async cancelFinancialTransaction(id, reason) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        if (!reason) throw { code: 'VALIDATION_ERROR', message: 'Cancellation reason is required' };

        const knex = getKnex();

        // Worker salary/wage expenses are owned by workerController because that
        // flow must restore both the worker balance and the cashbox atomically.
        // Delegating here prevents a second cashbox reversal.
        const linkedWorkerPayment = await knex('worker_payments')
            .where('transaction_id', id)
            .where('status', 'active')
            .first();

        if (linkedWorkerPayment) {
            const workerController = require('./workerController');
            await workerController.reverseWorkerPayment(linkedWorkerPayment.id, reason);
            return this.getFinancialTransactionDetails(id);
        }

        let updatedTransaction;

        await knex.transaction(async (trx) => {
            const transaction = await trx('transactions').where('id', id).first();
            if (!transaction) throw { code: 'NOT_FOUND', message: 'Transaction not found' };
            if (transaction.status === 'cancelled') {
                throw { code: 'TRANSACTION_ALREADY_CANCELLED', message: 'This transaction is already cancelled' };
            }

            const cashbox = await trx('cashboxes').where('id', transaction.cashbox_id).first();
            if (!cashbox) throw { code: 'NOT_FOUND', message: 'Linked cashbox not found' };

            const numAmount = Number(transaction.amount);
            const balanceBefore = Number(cashbox.balance);
            let balanceAfter = balanceBefore;

            // Reverse logic: cancelling income takes money OUT, cancelling expense puts money IN
            let movementDirection;
            if (transaction.direction === 'income') {
                balanceAfter -= numAmount;
                if (balanceAfter < 0) {
                    throw { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient cashbox balance to cancel this income' };
                }
                movementDirection = 'out';
            } else {
                balanceAfter += numAmount;
                movementDirection = 'in';
            }

            // Update cashbox
            await trx('cashboxes').where('id', cashbox.id).update({
                balance: balanceAfter,
                updated_at: knex.fn.now()
            });

            // Create reversal movement
            const [reversalId] = await trx('cashbox_transactions').insert({
                cashbox_id: cashbox.id,
                reference_type: 'reversal',
                reference_id: transaction.id,
                amount: numAmount,
                direction: movementDirection,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                reversed_transaction_id: transaction.cashbox_transaction_id,
                reversal_reason: reason,
                transaction_date: knex.fn.now(),
                notes: `Reversal of transaction #${transaction.id}: ${reason}`,
                created_at: knex.fn.now(),
                updated_at: knex.fn.now()
            });

            // Update transaction to cancelled
            await trx('transactions').where('id', transaction.id).update({
                status: 'cancelled',
                cancelled_at: knex.fn.now(),
                cancellation_reason: reason,
                updated_at: knex.fn.now()
            });

            // Add activity log
            await trx('activity_logs').insert({
                action: 'financial_transaction_cancelled',
                table_name: 'transactions',
                record_id: transaction.id,
                new_data: JSON.stringify({ reason }),
                created_at: knex.fn.now(),
                updated_at: knex.fn.now()
            });

            updatedTransaction = await trx('transactions').where('id', id).first();
        });

        return this.getFinancialTransactionDetails(id);
    }

    async getFinancialTransactionsSummary(filters = {}) {
        const knex = getKnex();

        // 1. Sum by currency (Only active transactions)
        let query = knex('transactions')
            .join('cashboxes', 'transactions.cashbox_id', 'cashboxes.id')
            .where('transactions.status', 'active')
            .select(
                'cashboxes.currency',
                knex.raw(`SUM(CASE WHEN transactions.direction = 'income' THEN transactions.amount ELSE 0 END) as totalIncome`),
                knex.raw(`SUM(CASE WHEN transactions.direction = 'expense' THEN transactions.amount ELSE 0 END) as totalExpense`)
            )
            .groupBy('cashboxes.currency');

        if (filters.date_from) query = query.where('transactions.transaction_date', '>=', filters.date_from);
        if (filters.date_to) query = query.where('transactions.transaction_date', '<=', filters.date_to);

        const currencyStats = await query;

        const byCurrency = currencyStats.map(stat => {
            const inc = Number(stat.totalIncome || 0);
            const exp = Number(stat.totalExpense || 0);
            return {
                currency: stat.currency,
                totalIncome: inc,
                totalExpense: exp,
                net: inc - exp
            };
        });

        // 2. Counts
        let countQuery = knex('transactions').select('status', knex.raw('COUNT(*) as count')).groupBy('status');
        if (filters.date_from) countQuery = countQuery.where('transaction_date', '>=', filters.date_from);
        if (filters.date_to) countQuery = countQuery.where('transaction_date', '<=', filters.date_to);

        const statusCounts = await countQuery;
        
        let activeTransactionsCount = 0;
        let cancelledTransactionsCount = 0;

        for (const row of statusCounts) {
            if (row.status === 'active') activeTransactionsCount = Number(row.count);
            if (row.status === 'cancelled') cancelledTransactionsCount = Number(row.count);
        }

        return {
            byCurrency,
            activeTransactionsCount,
            cancelledTransactionsCount
        };
    }
}

module.exports = new TransactionController();
