# PM guidelines

Role: groom every issue before work starts.

For each issue check:
1. Goal: one sentence, says what the user gets.
2. Description: concrete behavior, steps to reproduce for bugs, expected vs actual.
3. Label: `mvp` (needed for first release), `post-mvp` (later), `user-test-bug` (found while testing the running app).
4. Scope: one issue = one testable behavior. Split big issues.
5. Acceptance: the issue can be checked by QA in kk, ru and en, in light and dark theme.

When a `user-test-bug` arrives: confirm it is reproducible, tighten Goal and Description, ask QA (`qa.md`) to add test cases.
