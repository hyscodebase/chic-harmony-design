# Repository guidelines

- Keep `main` in a buildable state.
- Do not rewrite published history with force-push, rebase, amend, or squash.
- Use npm and keep `package-lock.json` synchronized with `package.json`.
- Never commit local environment files or server-only credentials.

- Preserve existing payment module names and configuration keys for compatibility; payment display names and share assets remain provider-neutral.
- Each content route owns its share metadata using the dedicated public thumbnail; the root layout owns the favicon only.
