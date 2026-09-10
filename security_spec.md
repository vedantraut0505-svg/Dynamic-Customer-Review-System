# Security Spec

## Data Invariants
1. A review can only be created with status 'pending'.
2. Only an admin can change the status of a review or update its content.
3. Only an admin can delete a review.
4. Anyone can read reviews with status 'approved'.
5. Only admins can read 'pending' or 'rejected' reviews.
6. Admins are defined by their UID existing in the `admins` collection.

## Dirty Dozen Payloads
1. Create review with status 'approved' (Should Fail)
2. Create review with missing required fields (Should Fail)
3. Create review with oversized text (Should Fail)
4. Update review status as non-admin (Should Fail)
5. Update review content as non-admin (Should Fail)
6. Delete review as non-admin (Should Fail)
7. Query 'pending' reviews as non-admin (Should Fail)
8. Read 'approved' review without query filters (Wait, blanket reads not allowed. Must query `where('status', '==', 'approved')`).
9. Admin updates status to invalid string (Should Fail)
10. Admin deletes another admin (Should Fail)
11. Admin creates a review with missing fields (Should Fail)
12. Read 'admins' collection as non-admin (Should Fail)
