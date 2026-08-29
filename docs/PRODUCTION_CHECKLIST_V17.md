# Production Checklist — v1.7

1. Run `scripts/v17_release_audit.py`.
2. Run exact branch-overlay schema/contract tests.
3. Deploy to a preview/Pages environment.
4. Run Lighthouse on Home / Explore / Living Lab / Evidence.
5. Reject or simplify if LCP or INP regresses >10% against the v1.5 browser baseline.
6. Test first-time visitors with at least: enterprise buyer, technical evaluator, learning visitor and design prospect.
7. Ask each tester at 5/15/30 seconds: what does Annapurna build, what changed, and what would you do next?
8. Verify Contact and relevant product/proof paths without coaching.
9. Confirm reduced-motion, save-data and mobile swipe/follow-connection behavior.
10. Promote only after browser + human gates pass.
