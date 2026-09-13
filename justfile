set shell := ["bash", "-ceuo", "pipefail"]

BENCH := justfile_directory()
SDK := justfile_directory() / ".." / "sdk"
VENDORED := justfile_directory() / "node_modules" / "@lelantos-org" / "sdk"

default:
    @just --list

# Install bench dependencies if missing.
install:
    cd "{{BENCH}}" && [ -d node_modules ] || npm install --no-audit --no-fund

# Build the canonical witnesses (public/input.<shape>.json, one per circuit arity).
prepare: install
    cd "{{BENCH}}" && npm run prepare-input

# Run the LAN bench on :8787 (override with PORT=). HTTPS by default:
# SharedArrayBuffer needs a secure context, so phones need TLS.
serve PORT="8787": install prepare
    cd "{{BENCH}}" && PORT={{PORT}} npm run dev

# Production build, then serve it the same way `serve` does.
preview PORT="8787": install prepare
    cd "{{BENCH}}" && npm run build && PORT={{PORT}} npm run preview

# Typecheck (app, Node side, tests), lint and run the unit tests.
check: install
    cd "{{BENCH}}" && npm run check

# Unit tests only.
test: install
    cd "{{BENCH}}" && npm test

# Lint only.
lint: install
    cd "{{BENCH}}" && npm run lint

# `package.json` pins a published SDK (currently 0.35.0), so the bench normally measures
# whatever npm last resolved, not the local prover. Anything built under
# `sdk/wasm/*/pkg` is invisible to it until this runs.
#
# Copies exactly what the package's `files` field ships — `dist` and the three
# `wasm/*/pkg` directories — so the layout stays identical to the published one.
# `npm install` reverts it; re-run this afterwards.
#
# Builds the SDK's TypeScript but NOT the wasm: run `cd ../sdk/wasm && just build`
# first when the Rust has changed, since a stale `pkg/` copies over just as
# happily as a fresh one.
#
# Overwrite the installed @lelantos-org/sdk with the working tree's build.
use-local-sdk: install
    cd "{{SDK}}" && npm run build
    test -f "{{SDK}}/wasm/prover/pkg/prover_bg.wasm" \
        || { echo "no prover pkg — run 'cd sdk/wasm && just build'"; exit 1; }
    rm -rf "{{VENDORED}}/dist" "{{VENDORED}}/wasm"
    cp -R "{{SDK}}/dist" "{{VENDORED}}/dist"
    mkdir -p "{{VENDORED}}/wasm/prover" "{{VENDORED}}/wasm/jubjub" "{{VENDORED}}/wasm/poseidon"
    cp -R "{{SDK}}/wasm/prover/pkg" "{{VENDORED}}/wasm/prover/pkg"
    cp -R "{{SDK}}/wasm/jubjub/pkg" "{{VENDORED}}/wasm/jubjub/pkg"
    cp -R "{{SDK}}/wasm/poseidon/pkg" "{{VENDORED}}/wasm/poseidon/pkg"
    cp "{{SDK}}/package.json" "{{VENDORED}}/package.json"
    # Vite caches the prepared dependency, glue JS included. A fresh
    # `prover_bg.wasm` served against the previously cached `prover.js` fails to
    # instantiate — the wasm asks for an import the old glue never declared —
    # so the cache has to go whenever the wasm does.
    rm -rf "{{BENCH}}/node_modules/.vite" "{{BENCH}}/dist"
    @echo "==> vendored $(node -p "require('{{VENDORED}}/package.json').version") into bench (vite cache cleared)"
