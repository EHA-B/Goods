function getKnex() {
    if (!global.__knex) throw new Error("Knex not initialized");
    return global.__knex;
}

function normalizeName(name) {
    return String(name).trim().replace(/\s+/g, ' ').toLowerCase();
}

class TransactionCategoryController {

    async createTransactionCategory(input) {
        if (!input || !input.name) {
            const err = new Error('name is required');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }
        if (input.type !== 'income' && input.type !== 'expense') {
            const err = new Error('type must be income or expense');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }

        const knex = getKnex();

        // Duplicate normalized name/type policy
        const normalizedName = normalizeName(input.name);
        const existing = await knex('transaction_categories')
            .whereRaw('LOWER(TRIM(REPLACE(name, "  ", " "))) = ?', [normalizedName])
            .andWhere('type', input.type)
            .andWhere('isActive', true)
            .first();

        if (existing) {
            const err = new Error('An active category with the same name and type already exists');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }

        const [id] = await knex('transaction_categories').insert({
            name: String(input.name).trim(),
            type: input.type,
            description: input.description ?? null,
            isActive: input.isActive ?? true,
            created_at: knex.fn.now(),
            updated_at: knex.fn.now()
        });

        return this.getTransactionCategory(id);
    }

    async getTransactionCategory(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const knex = getKnex();
        const row = await knex('transaction_categories').where('id', id).first();
        if (!row) throw { code: 'NOT_FOUND', message: 'TransactionCategory not found' };
        return row;
    }

    async getAllTransactionCategorys() {
        const knex = getKnex();
        return await knex('transaction_categories').orderBy('id', 'desc');
    }

    async updateTransactionCategory(id, input) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const knex = getKnex();

        const currentCategory = await knex('transaction_categories').where('id', id).first();
        if (!currentCategory) {
            throw { code: 'NOT_FOUND', message: 'TransactionCategory not found' };
        }

        // Check if category is used
        const usageCount = await knex('transactions').where('category_id', id).count('* as cnt').first();
        const isUsed = Number(usageCount.cnt || 0) > 0;

        if (input.type && input.type !== currentCategory.type) {
            if (isUsed) {
                throw {
                    code: 'CATEGORY_TYPE_LOCKED',
                    message: 'Cannot change the type of a transaction category after it has been used.'
                };
            }
        }

        const updates = {};
        if (input.name !== undefined) updates.name = String(input.name).trim();
        if (input.type !== undefined) updates.type = input.type;
        if (input.description !== undefined) updates.description = input.description;
        if (input.isActive !== undefined) updates.isActive = input.isActive;

        if (Object.keys(updates).length === 0) {
            const err = new Error('No fields provided to update');
            err.code = 'VALIDATION_ERROR';
            throw err;
        }

        updates.updated_at = knex.fn.now();

        await knex('transaction_categories').where('id', id).update(updates);
        return this.getTransactionCategory(id);
    }

    async deleteTransactionCategory(id) {
        if (!id) throw { code: 'VALIDATION_ERROR', message: 'ID is required' };
        const knex = getKnex();

        const usageCount = await knex('transactions').where('category_id', id).count('* as cnt').first();
        const isUsed = Number(usageCount.cnt || 0) > 0;

        if (isUsed) {
            throw {
                code: 'CATEGORY_IN_USE',
                message: 'Cannot delete a transaction category that is used by existing transactions'
            };
        }

        const changes = await knex('transaction_categories').where('id', id).del();
        if (changes === 0) throw { code: 'NOT_FOUND', message: 'TransactionCategory not found' };

        return { success: true, message: 'TransactionCategory deleted successfully' };
    }
}

module.exports = new TransactionCategoryController();
