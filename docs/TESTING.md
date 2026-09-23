# Testing

Run the checks from the repository root:

```bash
npm run build
npm test
npm run lint
```

The build validates both TypeScript packages. The server test command validates the API and
scanner-specific behavior. Linting checks the client and server source trees.

Manual smoke testing:

1. Start the development server with `npm run dev`.
2. Open the client and submit a public domain such as `example.com`.
3. Confirm the scan page starts immediately and category cards transition independently.
4. Confirm an invalid domain, IP address, localhost name, and internal hostname are rejected.
5. Confirm the history page records completed scan links in browser storage.
