set shell := ["bash", "-ceuo", "pipefail"]

BENCH := justfile_directory()

default:
    @just --list

# Install bench dependencies if missing.
install:
    cd "{{BENCH}}" && [ -d node_modules ] || npm install --no-audit --no-fund

# Build the canonical witnesses (public/input.2x2.json, public/input.3x3.json).
prepare: install
    cd "{{BENCH}}" && npm run prepare-input

# Run the LAN bench on :8787 (override with PORT=). HTTPS by default:
# SharedArrayBuffer needs a secure context, so phones need TLS.
serve PORT="8787": install prepare
    cd "{{BENCH}}" && PORT={{PORT}} npm run dev

# Production build, then serve it the same way `serve` does.
preview PORT="8787": install prepare
    cd "{{BENCH}}" && npm run build && PORT={{PORT}} npm run preview

# Typecheck (app + Node-side) and lint.
check: install
    cd "{{BENCH}}" && npm run check

# Lint only.
lint: install
    cd "{{BENCH}}" && npm run lint
