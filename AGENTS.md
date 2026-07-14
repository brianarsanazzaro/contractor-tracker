<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# GitHub account

This repo belongs to the **brianarsanazzaro** GitHub account (brianarsanazzaro@gmail.com), *not* the `btc-devteam` account that is usually the active `gh` login on this machine.

`gh auth switch -u brianarsanazzaro` tends to hang on the macOS keyring. Push without changing the active account:

```sh
GH_TOK=$(gh auth token -u brianarsanazzaro) git \
  -c credential.helper= \
  -c credential.helper='!f() { echo username=brianarsanazzaro; echo password=$GH_TOK; }; f' \
  push
```
