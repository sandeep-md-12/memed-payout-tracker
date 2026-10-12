# Payouts follow the View Count down as well as up

A Submission's Payout always tracks the highest Milestone its *current* View Count has reached. When the View Count falls below a Milestone, a Clawback returns the difference to the Campaign's Budget Remaining, and that money goes straight to outstanding Shortfalls, oldest first. We chose this over locking a Payout once paid because platforms remove fake views after the fact. YouTube lowers earnings for invalid traffic before finalising them, and Instagram withholds bonuses for inauthentic views. A Brand should not fund views that no longer exist. This app moves no real money, so lowering a credit is safe.

## Considered Options

- **Lock a Payout once paid**: rejected, because the Brand keeps paying for views the platform later removes.
- **Holding period, then lock**: deferred. It is the right production design (Payouts follow views for N days, then lock before any withdrawal), but it needs a scheduled job that this build does not have.
