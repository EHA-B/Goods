# Purchase extra-cost responsibility

Each purchase invoice stores who bears transport and handling costs independently.

- company: cost is on us, increases invoice total, and is included in our expenses.
- supplier: cost is on supplier, reduces invoice total, and is excluded from our expenses.

Fields: transport_cost_bearer, emptying_cost_bearer.
Existing invoices default to company for backward compatibility.
