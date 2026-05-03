const ITERS = 5;

// ── tiny DOM helpers ────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const log = (...a) => {
    const el = $("log");
    el.textContent += a.join(" ") + "\n";
    el.scrollTop = el.scrollHeight;
};
const setStatus = (s, cls = "") => {
    const el = $("status");
    el.textContent = s;
    el.className = cls;
};

// ── stats ───────────────────────────────────────────────────────────────────
function stats(xs) {
    const sorted = [...xs].sort((a, b) => a - b);
    return {
        mean:   xs.reduce((a, b) => a + b, 0) / xs.length,
        median: sorted[Math.floor(sorted.length / 2)],
        min:    sorted[0],
        max:    sorted[sorted.length - 1],
    };
}

function deviceInfo() {
    return {
        ua: navigator.userAgent,
        platform: navigator.platform,
        cores: navigator.hardwareConcurrency || 0,
        memGB: navigator.deviceMemory || null,
        viewport: `${innerWidth}x${innerHeight}`,
    };
}

// ── data fetch ──────────────────────────────────────────────────────────────
async function fetchJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} fetch failed: ${r.status}`);
    return r.json();
}

async function fetchBytes(url, label) {
    const t = performance.now();
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url} fetch failed: ${r.status}`);
    const buf = new Uint8Array(await r.arrayBuffer());
    log(`${label} fetched: ${(buf.byteLength / 1e6).toFixed(1)} MB in ${(performance.now() - t).toFixed(0)} ms`);
    return buf;
}

// ── results table ───────────────────────────────────────────────────────────
async function refreshTable() {
    const rows = await fetchJSON("/results");
    const tb = $("tbl").querySelector("tbody");
    tb.innerHTML = "";
    const fmt = (n) => n?.toFixed?.(0) ?? "";
    for (const x of rows.slice().reverse()) {
        const cells = [
            x.label || x.ua?.slice(0, 40) || "",
            x.cores ?? "",
            x.iters ?? "",
            fmt(x.meanMs), fmt(x.medianMs), fmt(x.minMs), fmt(x.maxMs),
            x.ts?.replace("T", " ").slice(0, 19) ?? "",
        ];
        const tr = document.createElement("tr");
        for (const c of cells) {
            const td = document.createElement("td");
            td.textContent = String(c);
            tr.appendChild(td);
        }
        tb.appendChild(tr);
    }
}

// ── worker session (RPC over postMessage, sequential) ───────────────────────
function makeSession() {
    const w = new Worker("/bench.ark.worker.js", { type: "module" });
    const debugEvents = [];
    let pending = null;       // { resolve, reject } for in-flight call
    let chain = Promise.resolve();

    w.addEventListener("message", ({ data }) => {
        if (data?.type === "debug") {
            debugEvents.push({ ts: performance.now(), stage: data.stage, info: data.info });
            log(`  [worker:${data.stage}] ${JSON.stringify(data.info || {})}`);
            return;
        }
        const p = pending; pending = null;
        if (!p) return;
        if (data?.type === "error") p.reject(new Error(data.message));
        else p.resolve(data);
    });
    w.addEventListener("error", (ev) => {
        const info = { message: ev.message, file: ev.filename, line: ev.lineno };
        debugEvents.push({ ts: performance.now(), stage: "error-event", info });
        log(`  [worker:error-event] ${ev.message || ""}`);
    });

    const send = (msg, transfer) => chain = chain.then(() => new Promise((resolve, reject) => {
        pending = { resolve, reject };
        w.postMessage(msg, transfer || []);
    }));

    return {
        prepare: (zkeyU8, wasmU8) =>
            send({ type: "prepare", zkey: zkeyU8, wasm: wasmU8 }, [zkeyU8.buffer, wasmU8.buffer]),
        prove:   (input) => send({ type: "prove", input }),
        dispose: async () => { await send({ type: "dispose" }); w.terminate(); },
        debugEvents,
    };
}

// ── main run loop ───────────────────────────────────────────────────────────
async function run() {
    $("run").disabled = true;
    setStatus("loading…");

    let session = null;
    try {
        const dev = deviceInfo();
        log(`device: ${dev.ua}`);
        log(`cores: ${dev.cores}, memGB: ${dev.memGB ?? "?"}`);

        const input = await fetchJSON("/input.json");
        log("input.json loaded");

        setStatus("downloading zkey/wasm…");
        const [zkeyU8, wasmU8] = await Promise.all([
            fetchBytes("/2x2_final.zkey", "zkey"),
            fetchBytes("/2x2.wasm", "wasm"),
        ]);

        setStatus("preparing session…");
        const tPrep = performance.now();
        session = makeSession();
        const prep = await session.prepare(zkeyU8, wasmU8);
        log(`threads=${prep?.threads} isolated=${!!prep?.isolated}`);
        const prepareMs = performance.now() - tPrep;
        log(`prepare: ${prepareMs.toFixed(0)} ms`);

        setStatus("warm-up…");
        const tWarm = performance.now();
        await session.prove(input);
        log(`warm-up prove: ${(performance.now() - tWarm).toFixed(0)} ms`);

        const times = [], profiles = [], innerTimes = [];
        for (let i = 0; i < ITERS; i++) {
            setStatus(`iter ${i + 1}/${ITERS}…`);
            const t = performance.now();
            const r = await session.prove(input);
            const dt = performance.now() - t;
            times.push(dt);
            if (typeof r?.ms === "number") innerTimes.push(r.ms);
            if (r?.prof) profiles.push(r.prof);
            log(`iter ${i + 1}: ${dt.toFixed(0)} ms wall, ${r.ms.toFixed(0)} ms inner`);
            if (r?.profLine) log("  " + r.profLine);
        }

        const workerDebug = [...session.debugEvents];
        await session.dispose();
        session = null;

        const s = stats(times);
        log(`mean=${s.mean.toFixed(0)} median=${s.median.toFixed(0)} min=${s.min.toFixed(0)} max=${s.max.toFixed(0)}`);

        const r = await fetch("/result", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...dev,
                label: "",
                device: dev.platform,
                iters: ITERS,
                timesMs: times,
                meanMs: s.mean, medianMs: s.median, minMs: s.min, maxMs: s.max,
                prepareMs,
                profiles,
                innerTimesMs: innerTimes,
                workerDebug,
            }),
        });
        if (!r.ok) throw new Error("POST /result failed: " + r.status);

        setStatus("done", "ok");
        await refreshTable();
    } catch (e) {
        console.error(e);
        log("ERROR: " + (e?.message || e));
        setStatus("error", "err");
    } finally {
        if (session) { try { await session.dispose(); } catch {} }
        $("run").disabled = false;
    }
}

$("run").addEventListener("click", run);
refreshTable();
