# Payouts run in MongoDB transactions, so every environment uses a replica set

Every View Count update changes a Submission, its Campaign's Budget Spent and the Payout Entries together. Two simultaneous updates on one Campaign must never overspend it. Each payout runs inside `session.withTransaction()`, so these writes are saved together or not at all. When two transactions touch the same Campaign at once, MongoDB aborts one with a write conflict and the driver retries it against fresh numbers. Transactions only work on a replica set. Atlas clusters already are one, local Docker runs Mongo as a single-node replica set, and tests use `MongoMemoryReplSet`.

## Considered Options

- **A conditional atomic `$inc` on the Campaign with no transaction**: rejected. It works on a standalone Mongo, but a crash between the Campaign write and the Submission write leaves them out of sync.
