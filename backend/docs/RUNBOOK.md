# BeyondTheCV — backend-light orchestrator

## Prereqs
- Node 18+ (or 20+)

## Install
```bash
npm install
cp .env.example .env
# Put OPENAI_API_KEY in .env
```

## Copy your config pack
Copy the *assets pack* you generated earlier into this repo:
- `config/schemas/*.schema.json`
- `config/prompts/*.txt`

(Exact paths are required.)

## Run
```bash
npm run start
```

## Test
```bash
curl -X POST http://localhost:8787/orders/test_001/generate \
  -H "Content-Type: application/json" \
  -d @./config/examples/request.example.json
```

## Output (local dev)
Artifacts are written to:
`./data/orders/{orderId}/{lang}/`
