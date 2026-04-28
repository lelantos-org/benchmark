set shell := ["bash", "-ceuo", "pipefail"]

ROOT := justfile_directory() / ".."
BENCH := justfile_directory()
RUST_PROVER := ROOT / "rust-prover"

default:
    @just --list

# Install bench's own ts-node + types if missing.
install:
    cd "{{BENCH}}" && [ -d node_modules ] || npm install --no-audit --no-fund

# Build canonical witness for the LAN benchmark UI (bench/public/input.json).
prepare: install
    cd "{{BENCH}}" && ./node_modules/.bin/ts-node prepare.ts

# Build the Rust ark-circom prover and copy the wasm-pack output into bench/rust-prover-pkg/.
# Requires nightly toolchain + rust-src component + wasm-pack on PATH.
rust-prover-build:
    cd "{{RUST_PROVER}}" && just build
    rm -rf "{{BENCH}}/rust-prover-pkg"
    cp -R "{{RUST_PROVER}}/pkg" "{{BENCH}}/rust-prover-pkg"
    @echo "copied rust-prover/pkg -> bench/rust-prover-pkg"

# Run LAN benchmark webserver on :8787 (override with PORT=).
# HTTPS-only (self-signed cert auto-generated): multi-thread Rust prover on
# mobile Safari needs a secure context for SharedArrayBuffer.
serve PORT="8787": install
    cd "{{BENCH}}" && HTTPS=1 PORT={{PORT}} ./node_modules/.bin/ts-node server.ts
