# Tech Stack

- **Runtime**: Node.js >= 20
- **Language**: TypeScript 6.0.3, strict mode
- **Module**: ESM only (`"type": "module"`)
- **Build**: tsdown v0.21 (bundler), outputs ESM to `dist/`
- **Test**: vitest 4.1, integration tests excluded from default run
- **Engine**: iii-sdk 0.11.2 (WebSocket to iii-engine on port 49134)
- **LLM SDKs**: @anthropic-ai/sdk ^0.100.1, @anthropic-ai/claude-agent-sdk ^0.3.142
- **Validation**: zod ^4.0
- **Config**: dotenv ^17.4
- **CLI prompts**: @clack/prompts ^1.2
- **Optional deps**: @node-rs/jieba (CJK segmentation), @xenova/transformers (local embeddings), onnxruntime-node/web (CLIP/reranker)

## Compiler options

- target: ES2022, module: ESNext, moduleResolution: bundler
- strict: true, noUnusedLocals: true, noUnusedParameters: true
- isolatedModules: true, declaration: true, declarationMap: true, sourceMap: true
- Hooks excluded from tsconfig; built separately via tsdown config as standalone Node scripts

## External deps (not bundled)

`@xenova/transformers`, `onnxruntime-node`, `onnxruntime-web`, `@anthropic-ai/claude-agent-sdk`, `@anthropic-ai/sdk` — kept external to avoid native module path resolution issues.
