# Suggested Commands

## Development

```bash
npm run dev          # Start worker with tsx (watch mode)
npm run build        # Compile TypeScript → dist/
npm start            # Run compiled CLI (node dist/cli.mjs)
```

## Testing

```bash
npm test             # Run unit tests (excludes integration)
npm run test:watch   # Watch mode
npm run test:integration  # Integration tests (needs live server on :3111)
npm run test:all     # All tests including integration
```

## Skills & benchmarks

```bash
npm run skills:gen    # Generate skill files
npm run skills:check  # Validate generated skills
npm run bench:load    # Load benchmark (100k observations)
npm run eval:longmemeval  # LongMemEval evaluation
npm run eval:coding-life  # Coding life evaluation
```

## Common git commands

```bash
git commit -s -m "feat: ..."    # Signed commit (DCO required)
```

## Useful system commands (Darwin)

```bash
lsof -i :3111          # Check what's on REST port
lsof -i :49134         # Check iii-engine WebSocket port
kill -15 <PID>         # Graceful shutdown
```
