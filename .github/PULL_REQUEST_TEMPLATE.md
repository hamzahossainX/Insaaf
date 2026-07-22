## Description

<!-- What does this PR do? Why? Link the related issue if applicable. -->

Closes #

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change that fixes an issue)
- [ ] ✨ New feature (non-breaking change that adds functionality)
- [ ] 💥 Breaking change (fix or feature that causes existing functionality to break)
- [ ] 📝 Documentation update
- [ ] 🎨 Style / formatting (no logic change)
- [ ] ♻️ Refactor (no behaviour change)
- [ ] 🚀 Performance improvement
- [ ] 🔧 Chore (dependency update, tooling)

## Checklist

- [ ] My code follows the style guidelines in [CONTRIBUTING.md](../CONTRIBUTING.md)
- [ ] I have run `npm test` in `backend/` and all tests pass
- [ ] I have run `npx tsc --noEmit` in both `backend/` and `frontend/` — no type errors
- [ ] I have updated `CHANGELOG.md` under `[Unreleased]`
- [ ] Any new environment variables are documented in `.env.example`
- [ ] All new routes have appropriate `requireAuth` / `requireAdmin` middleware
- [ ] No derived fields (`current_balance`, `current_stock_qty`, `current_due_balance`) are written directly — changes go through the ledger helpers

## Screenshots / Demo

<!-- For UI changes, paste a screenshot or screen recording. -->

## Notes for Reviewer

<!-- Anything the reviewer should know — edge cases, decisions made, things to watch. -->
