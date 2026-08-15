# Contributing to SecretClock

Thanks for looking. Issues and pull requests are both welcome, including the
kind that just say "this was confusing".

## What this project is

SecretClock runs in the browser. It has no database and no account system, and it
does not send your input anywhere. Please keep any change you propose inside
that boundary — a feature that requires uploading a user's file is a different
product, not a version of this one.

## Getting it running

Node.js 20.9 or later, and pnpm 11.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Nothing in `.env.example` is required to run it locally. Every entry is
optional and the file contains names only, never values.

## Before you open a pull request

```bash
pnpm verify
```

That runs, in order: format check, lint, typecheck, tests, a production build,
and a signature check. All of it has to pass. If you would rather run the parts
separately while you work:

```bash
pnpm format   # fix formatting
pnpm lint
pnpm typecheck
pnpm test     # pnpm test:watch while you are in it
```

The last step of `pnpm verify` checks that the author signature is still in
place — the console badge, the footer credit and the author metadata. It is not
checking who you are, and it does not need anything from you. It only fails if
a change removed the signature, so please leave those lines alone.

## What makes a change easy to accept

- One thing per pull request. A small change that does one thing gets read the
  same day; a large one that does four waits for a quiet afternoon.
- A test for anything that changes behaviour. The test suite is Vitest and the
  existing tests are the best guide to the house style.
- Say why in the commit message, not what. The diff already says what.
- If you are proposing something big, open an issue first so you do not spend
  an evening on something that was never going to be merged.

## Reporting a bug

Open an issue with what you did, what you expected, and what happened instead.
If the input that caused it is safe to share, include it — but check it for
anything private first. If it is not safe to share, describe its shape instead.

## Licence

This project is MIT. By contributing, you agree that your contribution is
offered under the same licence.
