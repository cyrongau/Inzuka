# Security Spec

## 1. Data Invariants

1. **Communities**: A community can only be created by an authenticated user. Only members can read its data. Only admins/moderators can modify community settings.
2. **Projects/Initiatives**: Belong to a community. Must exist within a community. Only community members can interact with them.
3. **Families**: Families can only be updated by the owner.
4. **Transactions / Wallets**: A transaction must involve the user who is creating it, either as sender or receiver. Can only be updated if fields like status change, but amount and other immutable fields shouldn't change.
5. **System Generated Fields**: Fields like `createdAt` must be server timestamps. `id` fields must be valid.

## 2. The "Dirty Dozen" Payloads

1. **Identity Spoofing**: Creating a record (e.g. community, wallet) setting the `ownerId` or `userId` to someone else's UID.
2. **Resource Exhaustion (Denial of Wallet)**: Submitting a string of 1MB size for an ID or text field.
3. **Privilege Escalation**: Updating one's own user record to set `role: 'admin'`.
4. **State Shortcutting**: Updating a transaction directly from `pending` to `completed` bypassing the required process.
5. **Orphaned Write**: Creating a community asset for a community that does not exist.
6. **Shadow Field Injection**: Injecting a ghost field (`isAdmin: true`) into a payload.
7. **Timestamp Tampering**: Sending a client timestamp instead of server timestamp for `createdAt`.
8. **Delete Lock Bypass**: Trying to delete a record that should be immutable (e.g. a wallet transaction).
9. **Cross-Community Scraping**: Fetching a list of documents for a community the user does not belong to.
10. **Array Overflow**: Appending more than the allowed maximum number of items to a list (e.g., tags).
11. **Type Poisoning**: Sending an integer where a string is expected to bypass validation logic.
12. **PII Blanket Leak**: Attempting to read another user's private data without permission.

## 3. Test Runner
We will generate `firestore.rules.test.ts` to verify these payloads.
