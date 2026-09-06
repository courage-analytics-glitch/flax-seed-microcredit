# Project TODO

- [x] Establish the microfinance domain model for branches, roles, clients, loan products, applications, approvals, disbursements, repayments, and audit records.
- [x] Add branch-scoped server-side authorization for Loan Officers, Credit Committee Members, Branch Managers, Finance/Collections Officers, Compliance Officers, and the General Manager.
- [x] Enforce the conflict-of-interest rule preventing an application creator from approving the same application.
- [x] Implement the GHS 10,000 guarantor/collateral requirement and workflow validation.
- [x] Implement the complete loan lifecycle from submission through review, approval/rejection, disbursement, repayment, and arrears.
- [x] Implement one pure flat-rate 4.5% monthly repayment calculator and reuse it across estimates, recorded terms, schedules, balances, and reports.
- [x] Add immutable audit records for consequential workflow transitions with actor, timestamp, action, and exact reason.
- [x] Add Finance/Collections repayment recording and arrears views.
- [x] Add query-backed compliance and reporting screens.
- [x] Add English-first internationalization architecture covering every screen and workflow.
- [x] Build an elegant, polished responsive dashboard experience.
- [x] Write validation tests for loan schedules, approval conflicts, branch isolation, and Compliance Officer approval separation.
- [x] Run type checks, unit tests, and visual verification; save a final checkpoint for delivery.
