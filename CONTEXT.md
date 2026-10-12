# Meme'd Campaign Payout Tracker

Brands fund Campaigns with a fixed Budget and a Milestone Ladder; Creators enter their Instagram or YouTube Posts as Submissions and earn Payouts as those Posts' views climb the ladder.

## Language

### People

**Brand**:
A user account that funds and runs Campaigns.
_Avoid_: advertiser, client

**Creator**:
A user account that publishes Posts and enters them into Campaigns.
_Avoid_: influencer, page, user

### Campaigns

**Campaign**:
A Brand's paid promotion on a single Platform, with a fixed Budget and a Milestone Ladder.
_Avoid_: contest, gig, drive

**Platform**:
The social network a Campaign runs on: Instagram or YouTube.

**Budget**:
The total rupees a Campaign can ever pay out.
_Avoid_: funds, wallet, pool

**Budget Spent**:
The sum of all Payouts made from a Campaign.
_Avoid_: used, consumed

**Budget Remaining**:
Budget minus Budget Spent.

**Live Campaign**:
A Campaign with Budget Remaining above zero; only Live Campaigns are listed to Creators and accept new Submissions.
_Avoid_: active, open

**Exhausted Campaign**:
A Campaign with zero Budget Remaining; it becomes Live again if a Clawback returns money to it.
_Avoid_: closed, ended, finished

**Milestone**:
A view threshold paired with the amount a Post earns once its views reach that threshold.
_Avoid_: tier, level, target

**Milestone Ladder**:
A Campaign's Milestones, ordered by threshold; both thresholds and amounts strictly increase.
_Avoid_: payout table, tiers

### Submissions and money

**Post**:
The content itself on Instagram or YouTube, identified by its link; it lives outside this app.
_Avoid_: using "post" to mean a Submission

**Submission**:
A Creator's Post entered into a Campaign.
_Avoid_: post, entry

**View Count**:
The latest number of views the Platform reports for a Submission's Post.

**Amount Owed**:
The amount of the highest Milestone the Submission's current View Count has reached (views ≥ threshold); never the sum of several Milestones.

**Payout**:
Money credited to a Submission from its Campaign's Budget; it follows the Amount Owed up and down, but can be less than it when the Budget runs out.
_Avoid_: reward, commission

**Clawback**:
A reduction of a Payout because the View Count fell below a Milestone; the money returns to Budget Remaining.
_Avoid_: refund, reversal, chargeback

**Payout Entry**:
A record of one change to a Submission's Payout: the amount (positive or negative), the View Count at that moment, and the reason. A Campaign's Budget Spent always equals the sum of its Payout Entries.
_Avoid_: transaction, log

**Shortfall**:
Amount Owed minus Payout: what a Submission earned but its Campaign's Budget could not cover.

**Earnings**:
The sum of a Creator's Payouts across all their Submissions.
_Avoid_: income, balance, wallet

### Review

**Spike**:
A View Count update that gains at least a minimum number of views at a faster pace than the allowed views-per-hour.
_Avoid_: surge, anomaly

**Flagged Submission**:
A Submission paused after a Spike; its Payout cannot change until its Campaign's Brand approves or rejects it.
_Avoid_: suspicious, blocked

**Rejected Submission**:
A Submission its Brand cancelled after a Spike; its Payout is clawed back to zero and it can never earn again.
_Avoid_: banned, deleted, disqualified
