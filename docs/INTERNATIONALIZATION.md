# Homeio internationalization

The runtime uses next-intl 4.14.7 with messages/en.json and messages/zh-CN.json.
Server requests resolve the saved homeio.locale cookie first, then Accept-Language,
then English. The root provider supplies the same locale and messages to client
components. The language selector persists a one-year HttpOnly, SameSite=Lax cookie.
Settings also retains the existing local desktop preference for compatibility.
English entries are merged underneath Chinese entries as per-message fallback.

New UI text should use semantic message keys and ICU arguments/plurals. Never
translate user filenames, paths, usernames or application names. The exact-source
adapter in i18n/use-i18n.ts remains for existing built-in labels and known errors;
new features should not expand this adapter. Unknown server/provider errors remain
unchanged. Dates in the migrated UI follow the active locale; storage units remain
standard B/KB/MB labels.

Astra's original dictionary and helper are archived in docs/i18n-prototype and
preserved in Git commit 0e1d3b9. This migration retains the translations, restores
English resources, and does not introduce TrueNAS integration. It does not claim
complete translation of dynamic backend errors or third-party App Store content.

Validation: npm test -- i18n/i18n.test.ts lib/desktop/__tests__/preferences.test.ts
and npx tsc --noEmit -p tsconfig.zh-check.json. Production is built on Linux with
bounded CPU/memory, then checked in an isolated disposable database before rollout.
