var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod2) => function __require() {
  return mod2 || (0, cb[__getOwnPropNames(cb)[0]])((mod2 = { exports: {} }).exports, mod2), mod2.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod2, isNodeMode, target) => (target = mod2 != null ? __create(__getProtoOf(mod2)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod2 || !mod2.__esModule ? __defProp(target, "default", { value: mod2, enumerable: true }) : target,
  mod2
));

// src/circomlibjs-stub.js
var buildBabyjub, buildPoseidon, buildPedersenHash;
var init_circomlibjs_stub = __esm({
  "src/circomlibjs-stub.js"() {
    buildBabyjub = () => {
      throw new Error("circomlibjs stubbed in bench browser bundle");
    };
    buildPoseidon = () => {
      throw new Error("circomlibjs stubbed in bench browser bundle");
    };
    buildPedersenHash = () => {
      throw new Error("circomlibjs stubbed in bench browser bundle");
    };
  }
});

// ../sdk/dist/crypto/poseidon.js
var Poseidon;
var init_poseidon = __esm({
  "../sdk/dist/crypto/poseidon.js"() {
    "use strict";
    init_circomlibjs_stub();
    Poseidon = class _Poseidon {
      p;
      constructor(p) {
        this.p = p;
      }
      static async build() {
        return new _Poseidon(await buildPoseidon());
      }
      hash(xs) {
        return BigInt(this.p.F.toObject(this.p(xs)));
      }
    };
  }
});

// ../sdk/dist/crypto/bytes.js
function toLeBytes(x, len = FIELD_BYTES) {
  const out = new Uint8Array(len);
  let v = x;
  for (let i = 0; i < len; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  if (v !== 0n)
    throw new Error(`field exceeds ${len} bytes`);
  return out;
}
function fromLeBytes(b) {
  let v = 0n;
  for (let i = b.length - 1; i >= 0; i--)
    v = v << 8n | BigInt(b[i]);
  return v;
}
var FIELD_BYTES;
var init_bytes = __esm({
  "../sdk/dist/crypto/bytes.js"() {
    "use strict";
    FIELD_BYTES = 32;
  }
});

// ../sdk/dist/crypto/tags.js
var TAG_ASSET, POW_2_64, BABYJUB_SUBGROUP_ORDER;
var init_tags = __esm({
  "../sdk/dist/crypto/tags.js"() {
    "use strict";
    TAG_ASSET = 7n;
    POW_2_64 = 1n << 64n;
    BABYJUB_SUBGROUP_ORDER = 2736030358979909402780800718157159386076813972158567259200215660948447373041n;
  }
});

// ../sdk/dist/crypto/jubjub.js
var jubjub_exports = {};
__export(jubjub_exports, {
  H_BASE: () => H_BASE,
  Jubjub: () => Jubjub
});
var H_BASE, Jubjub;
var init_jubjub = __esm({
  "../sdk/dist/crypto/jubjub.js"() {
    "use strict";
    init_circomlibjs_stub();
    init_bytes();
    init_tags();
    H_BASE = [
      5802099305472655231388284418920769829666717045250560929368476121199858275951n,
      5980429700218124965372158798884772646841287887664001482443826541541529227896n
    ];
    Jubjub = class _Jubjub {
      babyjub;
      pedersen;
      constructor(babyjub, pedersen) {
        this.babyjub = babyjub;
        this.pedersen = pedersen;
      }
      static async build() {
        return new _Jubjub(await buildBabyjub(), await buildPedersenHash());
      }
      get base8() {
        return this.toAffine(this.babyjub.Base8);
      }
      get order() {
        return this.babyjub.subOrder;
      }
      addPoint(a, b) {
        return this.toAffine(this.babyjub.addPoint(this.fromAffine(a), this.fromAffine(b)));
      }
      mulPointEscalar(p, scalar) {
        return this.toAffine(this.babyjub.mulPointEscalar(this.fromAffine(p), scalar));
      }
      inSubgroup(p) {
        return this.babyjub.inSubgroup(this.fromAffine(p));
      }
      // circomlibjs `packPoint` reuses an internal buffer between calls, so
      // consecutive packs alias and the older one gets clobbered. Always copy.
      packPoint(p) {
        return new Uint8Array(this.babyjub.packPoint(this.fromAffine(p)));
      }
      unpackPoint(buf) {
        const u = this.babyjub.unpackPoint(new Uint8Array(buf));
        return u ? this.toAffine(u) : null;
      }
      // Mirrors HashToAssetGen in `asset_gen.circom`: Pedersen(264) over
      //   bits[  0.. 7]  = TAG_ASSET (LSB-first byte)
      //   bits[  8..261] = asset_id (254 LSB-first bits; high 2 bits of byte 31
      //                              are 0 because asset_id < 2^254)
      //   bits[262..263] = 0 (zero-pad to byte boundary)
      // circomlibjs `pedersen.hash(buf)` operates on 8·buf.length bits LSB-first
      // per byte, so the 33-byte input below reproduces the circuit bit stream
      // byte-for-byte.
      hashToAssetGen(assetId) {
        if (assetId >= 1n << 254n) {
          throw new Error("asset_id must be < 2^254 for HashToAssetGen parity");
        }
        const buf = new Uint8Array(33);
        buf[0] = Number(TAG_ASSET);
        buf.set(toLeBytes(assetId), 1);
        const packed = this.pedersen.hash(buf);
        return this.toAffine(this.babyjub.unpackPoint(packed));
      }
      valueCommit(value, assetGen, rcv) {
        const valueTerm = this.mulPointEscalar(assetGen, value);
        const blindTerm = this.mulPointEscalar(H_BASE, rcv);
        return this.addPoint(valueTerm, blindTerm);
      }
      // ---- coordinate plumbing (Montgomery FE ↔ bigint) ----
      toCoord(fe) {
        return BigInt(this.babyjub.F.toObject(fe));
      }
      fromCoord(x) {
        return this.babyjub.F.e(x);
      }
      toAffine(p) {
        return [this.toCoord(p[0]), this.toCoord(p[1])];
      }
      fromAffine(p) {
        return [this.fromCoord(p[0]), this.fromCoord(p[1])];
      }
    };
  }
});

// ../sdk/dist/crypto/derive.js
var init_derive = __esm({
  "../sdk/dist/crypto/derive.js"() {
    "use strict";
    init_tags();
  }
});

// ../sdk/dist/crypto/commit.js
var init_commit = __esm({
  "../sdk/dist/crypto/commit.js"() {
    "use strict";
    init_tags();
  }
});

// ../sdk/dist/crypto/nullifier.js
var init_nullifier = __esm({
  "../sdk/dist/crypto/nullifier.js"() {
    "use strict";
    init_tags();
    init_derive();
  }
});

// ../sdk/dist/crypto/merkle.js
var init_merkle = __esm({
  "../sdk/dist/crypto/merkle.js"() {
    "use strict";
    init_tags();
  }
});

// ../sdk/dist/crypto/index.js
var init_crypto = __esm({
  "../sdk/dist/crypto/index.js"() {
    "use strict";
    init_poseidon();
    init_jubjub();
    init_derive();
    init_commit();
    init_nullifier();
    init_merkle();
    init_bytes();
    init_tags();
  }
});

// ../sdk/dist/wasm/loader.js
function createWasmLoader(cfg) {
  let injected = null;
  let promise = null;
  let nodePkgUrl2 = null;
  async function init() {
    let mod2;
    if (injected) {
      mod2 = await injected.loadModule();
      await mod2.default(injected.wasm !== void 0 ? { module_or_path: injected.wasm } : void 0);
    } else if (IS_NODE) {
      const { readFile } = await import("node:fs/promises");
      nodePkgUrl2 = await cfg.nodeJsUrl();
      mod2 = await cfg.defaultImport();
      const bytes2 = new Uint8Array(await readFile(await cfg.nodeWasmPath()));
      await mod2.default({ module_or_path: bytes2 });
    } else {
      mod2 = await cfg.defaultImport();
      await mod2.default();
    }
    if (cfg.postInit)
      await cfg.postInit(mod2, { isNode: IS_NODE, nodePkgUrl: nodePkgUrl2 });
    return mod2;
  }
  return {
    configure(loader2) {
      injected = loader2;
      promise = null;
      nodePkgUrl2 = null;
    },
    load() {
      if (!promise)
        promise = init();
      return promise;
    },
    getNodePkgUrl() {
      return nodePkgUrl2;
    }
  };
}
var IS_NODE;
var init_loader = __esm({
  "../sdk/dist/wasm/loader.js"() {
    "use strict";
    IS_NODE = typeof process !== "undefined" && !!process.versions?.node;
  }
});

// ../sdk/wasm/jubjub/pkg/jubjub_wasm.js
var jubjub_wasm_exports = {};
__export(jubjub_wasm_exports, {
  _start: () => _start,
  add_point: () => add_point,
  base8: () => base8,
  default: () => __wbg_init,
  in_subgroup: () => in_subgroup,
  initSync: () => initSync,
  mul_point_escalar: () => mul_point_escalar,
  pack_point: () => pack_point,
  sub_order_le: () => sub_order_le,
  try_decrypt_note: () => try_decrypt_note,
  unpack_point: () => unpack_point
});
function _start() {
  wasm._start();
}
function add_point(a, b) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(a, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(b, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    wasm.add_point(retptr, ptr0, len0, ptr1, len1);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    if (r3) {
      throw takeObject(r2);
    }
    var v3 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export(r0, r1 * 1, 1);
    return v3;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
function base8() {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    wasm.base8(retptr);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var v1 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export(r0, r1 * 1, 1);
    return v1;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
function in_subgroup(p) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(p, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    wasm.in_subgroup(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    if (r2) {
      throw takeObject(r1);
    }
    return r0 !== 0;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
function mul_point_escalar(p, scalar_le) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(p, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(scalar_le, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    wasm.mul_point_escalar(retptr, ptr0, len0, ptr1, len1);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    if (r3) {
      throw takeObject(r2);
    }
    var v3 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export(r0, r1 * 1, 1);
    return v3;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
function pack_point(p) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(p, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    wasm.pack_point(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    if (r3) {
      throw takeObject(r2);
    }
    var v2 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export(r0, r1 * 1, 1);
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
function sub_order_le() {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    wasm.sub_order_le(retptr);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var v1 = getArrayU8FromWasm0(r0, r1).slice();
    wasm.__wbindgen_export(r0, r1 * 1, 1);
    return v1;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
function try_decrypt_note(ivk_le, epk_packed, ciphertext) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(ivk_le, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(epk_packed, wasm.__wbindgen_export2);
    const len1 = WASM_VECTOR_LEN;
    const ptr2 = passArray8ToWasm0(ciphertext, wasm.__wbindgen_export2);
    const len2 = WASM_VECTOR_LEN;
    wasm.try_decrypt_note(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    if (r3) {
      throw takeObject(r2);
    }
    let v4;
    if (r0 !== 0) {
      v4 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export(r0, r1 * 1, 1);
    }
    return v4;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
function unpack_point(buf) {
  try {
    const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
    const ptr0 = passArray8ToWasm0(buf, wasm.__wbindgen_export2);
    const len0 = WASM_VECTOR_LEN;
    wasm.unpack_point(retptr, ptr0, len0);
    var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
    var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
    var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
    var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
    if (r3) {
      throw takeObject(r2);
    }
    let v2;
    if (r0 !== 0) {
      v2 = getArrayU8FromWasm0(r0, r1).slice();
      wasm.__wbindgen_export(r0, r1 * 1, 1);
    }
    return v2;
  } finally {
    wasm.__wbindgen_add_to_stack_pointer(16);
  }
}
function __wbg_get_imports(memory) {
  const import0 = {
    __proto__: null,
    __wbg_error_a6fa202b58aa1cd3: function(arg0, arg1) {
      let deferred0_0;
      let deferred0_1;
      try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
      } finally {
        wasm.__wbindgen_export(deferred0_0, deferred0_1, 1);
      }
    },
    __wbg_new_227d7c05414eb861: function() {
      const ret = new Error();
      return addHeapObject(ret);
    },
    __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
      const ret = getObject(arg1).stack;
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export2, wasm.__wbindgen_export3);
      const len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbindgen_cast_0000000000000001: function(arg0, arg1) {
      const ret = getStringFromWasm0(arg0, arg1);
      return addHeapObject(ret);
    },
    __wbindgen_object_drop_ref: function(arg0) {
      takeObject(arg0);
    },
    memory: memory || new WebAssembly.Memory({ initial: 18, maximum: 16384, shared: true })
  };
  return {
    __proto__: null,
    "./jubjub_wasm_bg.js": import0
  };
}
function addHeapObject(obj) {
  if (heap_next === heap.length) heap.push(heap.length + 1);
  const idx = heap_next;
  heap_next = heap[idx];
  heap[idx] = obj;
  return idx;
}
function dropObject(idx) {
  if (idx < 1028) return;
  heap[idx] = heap_next;
  heap_next = idx;
}
function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}
function getDataViewMemory0() {
  if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer !== wasm.memory.buffer) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}
function getStringFromWasm0(ptr, len) {
  return decodeText(ptr >>> 0, len);
}
function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.buffer !== wasm.memory.buffer) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}
function getObject(idx) {
  return heap[idx];
}
function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === void 0) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr2 = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0().subarray(ptr2, ptr2 + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr2;
  }
  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;
  const mem = getUint8ArrayMemory0();
  let offset = 0;
  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 127) break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = cachedTextEncoder.encodeInto(arg, view);
    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }
  WASM_VECTOR_LEN = offset;
  return ptr;
}
function takeObject(idx) {
  const ret = getObject(idx);
  dropObject(idx);
  return ret;
}
function decodeText(ptr, len) {
  numBytesDecoded += len;
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
    cachedTextDecoder.decode();
    numBytesDecoded = len;
  }
  return cachedTextDecoder.decode(getUint8ArrayMemory0().slice(ptr, ptr + len));
}
function __wbg_finalize_init(instance, module, thread_stack_size) {
  wasmInstance = instance;
  wasm = instance.exports;
  wasmModule = module;
  cachedDataViewMemory0 = null;
  cachedUint8ArrayMemory0 = null;
  if (typeof thread_stack_size !== "undefined" && (typeof thread_stack_size !== "number" || thread_stack_size === 0 || thread_stack_size % 65536 !== 0)) {
    throw new Error("invalid stack size");
  }
  wasm.__wbindgen_start(thread_stack_size);
  return wasm;
}
async function __wbg_load(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e3) {
        const validResponse = module.ok && expectedResponseType(module.type);
        if (validResponse && module.headers.get("Content-Type") !== "application/wasm") {
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e3);
        } else {
          throw e3;
        }
      }
    }
    const bytes2 = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes2, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);
    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
  function expectedResponseType(type) {
    switch (type) {
      case "basic":
      case "cors":
      case "default":
        return true;
    }
    return false;
  }
}
function initSync(module, memory) {
  if (wasm !== void 0) return wasm;
  let thread_stack_size;
  if (module !== void 0) {
    if (Object.getPrototypeOf(module) === Object.prototype) {
      ({ module, memory, thread_stack_size } = module);
    } else {
      console.warn("using deprecated parameters for `initSync()`; pass a single object instead");
    }
  }
  const imports = __wbg_get_imports(memory);
  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }
  const instance = new WebAssembly.Instance(module, imports);
  return __wbg_finalize_init(instance, module, thread_stack_size);
}
async function __wbg_init(module_or_path, memory) {
  if (wasm !== void 0) return wasm;
  let thread_stack_size;
  if (module_or_path !== void 0) {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path, memory, thread_stack_size } = module_or_path);
    } else {
      console.warn("using deprecated parameters for the initialization function; pass a single object instead");
    }
  }
  if (module_or_path === void 0) {
    module_or_path = new URL("jubjub_wasm_bg.wasm", import.meta.url);
  }
  const imports = __wbg_get_imports(memory);
  if (typeof module_or_path === "string" || typeof Request === "function" && module_or_path instanceof Request || typeof URL === "function" && module_or_path instanceof URL) {
    module_or_path = fetch(module_or_path);
  }
  const { instance, module } = await __wbg_load(await module_or_path, imports);
  return __wbg_finalize_init(instance, module, thread_stack_size);
}
var cachedDataViewMemory0, cachedUint8ArrayMemory0, heap, heap_next, cachedTextDecoder, MAX_SAFARI_DECODE_BYTES, numBytesDecoded, cachedTextEncoder, WASM_VECTOR_LEN, wasmModule, wasmInstance, wasm;
var init_jubjub_wasm = __esm({
  "../sdk/wasm/jubjub/pkg/jubjub_wasm.js"() {
    "use strict";
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    heap = new Array(1024).fill(void 0);
    heap.push(void 0, null, true, false);
    heap_next = heap.length;
    cachedTextDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }) : void 0;
    if (cachedTextDecoder) cachedTextDecoder.decode();
    MAX_SAFARI_DECODE_BYTES = 2146435072;
    numBytesDecoded = 0;
    cachedTextEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : void 0;
    if (cachedTextEncoder) {
      cachedTextEncoder.encodeInto = function(arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
          read: arg.length,
          written: buf.length
        };
      };
    }
    WASM_VECTOR_LEN = 0;
  }
});

// ../sdk/dist/crypto/jubjub-wasm.js
async function ensureInit() {
  jubWasm = await loader.load();
}
function w() {
  if (!jubWasm)
    throw new Error("WasmJubjub not initialized; call WasmJubjub.build() first");
  return jubWasm;
}
function pointToBytes(p) {
  const out = new Uint8Array(POINT_BYTES);
  out.set(toLeBytes(p[0], FIELD_BYTES), 0);
  out.set(toLeBytes(p[1], FIELD_BYTES), FIELD_BYTES);
  return out;
}
function bytesToPoint(b) {
  return [fromLeBytes(b.slice(0, FIELD_BYTES)), fromLeBytes(b.slice(FIELD_BYTES, POINT_BYTES))];
}
async function buildJubjub() {
  return await WasmJubjub.build();
}
var TAG_FMD_BIT, POINT_BYTES, PKG_JS_URL, PKG_WASM_URL, loader, jubWasm, WasmJubjub;
var init_jubjub_wasm2 = __esm({
  "../sdk/dist/crypto/jubjub-wasm.js"() {
    "use strict";
    init_jubjub();
    init_bytes();
    init_loader();
    TAG_FMD_BIT = 8n;
    POINT_BYTES = 64;
    PKG_JS_URL = new URL("../../wasm/jubjub/pkg/jubjub_wasm.js", import.meta.url);
    PKG_WASM_URL = new URL("../../wasm/jubjub/pkg/jubjub_wasm_bg.wasm", import.meta.url);
    loader = createWasmLoader({
      name: "jubjub",
      defaultImport: () => Promise.resolve().then(() => (init_jubjub_wasm(), jubjub_wasm_exports)),
      nodeJsUrl: async () => PKG_JS_URL.href,
      nodeWasmPath: async () => {
        const { fileURLToPath } = await import("node:url");
        return fileURLToPath(PKG_WASM_URL);
      }
    });
    jubWasm = null;
    WasmJubjub = class _WasmJubjub {
      _base8;
      _order;
      fallback = null;
      constructor(_base8, _order) {
        this._base8 = _base8;
        this._order = _order;
      }
      static async build() {
        await ensureInit();
        const base82 = bytesToPoint(w().base8());
        const order = fromLeBytes(w().sub_order_le());
        return new _WasmJubjub(base82, order);
      }
      async getFallback() {
        if (this.fallback)
          return this.fallback;
        const { Jubjub: Jubjub2 } = await Promise.resolve().then(() => (init_jubjub(), jubjub_exports));
        this.fallback = await Jubjub2.build();
        return this.fallback;
      }
      get base8() {
        return this._base8;
      }
      get order() {
        return this._order;
      }
      addPoint(a, b) {
        const out = w().add_point(pointToBytes(a), pointToBytes(b));
        return bytesToPoint(out);
      }
      mulPointEscalar(p, scalar) {
        const out = w().mul_point_escalar(pointToBytes(p), toLeBytes(scalar % this._order, FIELD_BYTES));
        return bytesToPoint(out);
      }
      inSubgroup(p) {
        return w().in_subgroup(pointToBytes(p));
      }
      packPoint(p) {
        return new Uint8Array(w().pack_point(pointToBytes(p)));
      }
      unpackPoint(buf) {
        const out = w().unpack_point(buf);
        return out ? bytesToPoint(out) : null;
      }
      hashToAssetGen(assetId) {
        if (assetId >= 1n << 254n) {
          throw new Error("asset_id must be < 2^254 for HashToAssetGen parity");
        }
        if (!this.fallback) {
          throw new Error("hashToAssetGen: circomlibjs fallback not initialized; call hashToAssetGenAsync first");
        }
        return this.fallback.hashToAssetGen(assetId);
      }
      async hashToAssetGenAsync(assetId) {
        if (assetId >= 1n << 254n) {
          throw new Error("asset_id must be < 2^254 for HashToAssetGen parity");
        }
        const fb = await this.getFallback();
        return fb.hashToAssetGen(assetId);
      }
      valueCommit(value, assetGen, rcv) {
        return this.addPoint(this.mulPointEscalar(assetGen, value), this.mulPointEscalar(H_BASE, rcv));
      }
      // FMD2 (Niwl) v2 detection. Bit derivation is Poseidon over field
      // elements — mirrors `fmdTest` in `sdk/src/fmd.ts` and the in-circuit
      // `ClueCheck`. Point ops use the WASM crate; the hash stays in JS so
      // the wasm artifact does not need a Poseidon dependency.
      fmdTest(P, dk, cluePackedR, clueBits, gamma) {
        if (dk.length !== gamma)
          return false;
        if (clueBits.length !== Math.ceil(gamma / 8))
          return false;
        const R = this.unpackPoint(cluePackedR);
        if (!R || !this.inSubgroup(R))
          return false;
        for (let i = 0; i < gamma; i++) {
          const shared = this.mulPointEscalar(R, dk[i]);
          const h = P.hash([TAG_FMD_BIT, R[0], R[1], BigInt(i), shared[0], shared[1]]);
          const bit = Number(h & 1n);
          const cBit = clueBits[i >> 3] >> (i & 7) & 1;
          if ((bit ^ cBit) !== 1)
            return false;
        }
        return true;
      }
      tryDecryptNote(ivk, epkPacked, ciphertext) {
        const out = w().try_decrypt_note(toLeBytes(ivk % this._order, FIELD_BYTES), epkPacked, ciphertext);
        return out ? new Uint8Array(out) : null;
      }
    };
  }
});

// ../sdk/node_modules/bech32/dist/index.js
var require_dist = __commonJS({
  "../sdk/node_modules/bech32/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.bech32m = exports.bech32 = void 0;
    var ALPHABET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
    var ALPHABET_MAP = {};
    for (let z = 0; z < ALPHABET.length; z++) {
      const x = ALPHABET.charAt(z);
      ALPHABET_MAP[x] = z;
    }
    function polymodStep(pre) {
      const b = pre >> 25;
      return (pre & 33554431) << 5 ^ -(b >> 0 & 1) & 996825010 ^ -(b >> 1 & 1) & 642813549 ^ -(b >> 2 & 1) & 513874426 ^ -(b >> 3 & 1) & 1027748829 ^ -(b >> 4 & 1) & 705979059;
    }
    function prefixChk(prefix) {
      let chk = 1;
      for (let i = 0; i < prefix.length; ++i) {
        const c = prefix.charCodeAt(i);
        if (c < 33 || c > 126)
          return "Invalid prefix (" + prefix + ")";
        chk = polymodStep(chk) ^ c >> 5;
      }
      chk = polymodStep(chk);
      for (let i = 0; i < prefix.length; ++i) {
        const v = prefix.charCodeAt(i);
        chk = polymodStep(chk) ^ v & 31;
      }
      return chk;
    }
    function convert(data, inBits, outBits, pad) {
      let value = 0;
      let bits2 = 0;
      const maxV = (1 << outBits) - 1;
      const result = [];
      for (let i = 0; i < data.length; ++i) {
        value = value << inBits | data[i];
        bits2 += inBits;
        while (bits2 >= outBits) {
          bits2 -= outBits;
          result.push(value >> bits2 & maxV);
        }
      }
      if (pad) {
        if (bits2 > 0) {
          result.push(value << outBits - bits2 & maxV);
        }
      } else {
        if (bits2 >= inBits)
          return "Excess padding";
        if (value << outBits - bits2 & maxV)
          return "Non-zero padding";
      }
      return result;
    }
    function toWords(bytes2) {
      return convert(bytes2, 8, 5, true);
    }
    function fromWordsUnsafe(words) {
      const res = convert(words, 5, 8, false);
      if (Array.isArray(res))
        return res;
    }
    function fromWords(words) {
      const res = convert(words, 5, 8, false);
      if (Array.isArray(res))
        return res;
      throw new Error(res);
    }
    function getLibraryFromEncoding(encoding) {
      let ENCODING_CONST;
      if (encoding === "bech32") {
        ENCODING_CONST = 1;
      } else {
        ENCODING_CONST = 734539939;
      }
      function encode(prefix, words, LIMIT) {
        LIMIT = LIMIT || 90;
        if (prefix.length + 7 + words.length > LIMIT)
          throw new TypeError("Exceeds length limit");
        prefix = prefix.toLowerCase();
        let chk = prefixChk(prefix);
        if (typeof chk === "string")
          throw new Error(chk);
        let result = prefix + "1";
        for (let i = 0; i < words.length; ++i) {
          const x = words[i];
          if (x >> 5 !== 0)
            throw new Error("Non 5-bit word");
          chk = polymodStep(chk) ^ x;
          result += ALPHABET.charAt(x);
        }
        for (let i = 0; i < 6; ++i) {
          chk = polymodStep(chk);
        }
        chk ^= ENCODING_CONST;
        for (let i = 0; i < 6; ++i) {
          const v = chk >> (5 - i) * 5 & 31;
          result += ALPHABET.charAt(v);
        }
        return result;
      }
      function __decode(str, LIMIT) {
        LIMIT = LIMIT || 90;
        if (str.length < 8)
          return str + " too short";
        if (str.length > LIMIT)
          return "Exceeds length limit";
        const lowered = str.toLowerCase();
        const uppered = str.toUpperCase();
        if (str !== lowered && str !== uppered)
          return "Mixed-case string " + str;
        str = lowered;
        const split2 = str.lastIndexOf("1");
        if (split2 === -1)
          return "No separator character for " + str;
        if (split2 === 0)
          return "Missing prefix for " + str;
        const prefix = str.slice(0, split2);
        const wordChars = str.slice(split2 + 1);
        if (wordChars.length < 6)
          return "Data too short";
        let chk = prefixChk(prefix);
        if (typeof chk === "string")
          return chk;
        const words = [];
        for (let i = 0; i < wordChars.length; ++i) {
          const c = wordChars.charAt(i);
          const v = ALPHABET_MAP[c];
          if (v === void 0)
            return "Unknown character " + c;
          chk = polymodStep(chk) ^ v;
          if (i + 6 >= wordChars.length)
            continue;
          words.push(v);
        }
        if (chk !== ENCODING_CONST)
          return "Invalid checksum for " + str;
        return { prefix, words };
      }
      function decodeUnsafe(str, LIMIT) {
        const res = __decode(str, LIMIT);
        if (typeof res === "object")
          return res;
      }
      function decode(str, LIMIT) {
        const res = __decode(str, LIMIT);
        if (typeof res === "object")
          return res;
        throw new Error(res);
      }
      return {
        decodeUnsafe,
        decode,
        encode,
        toWords,
        fromWordsUnsafe,
        fromWords
      };
    }
    exports.bech32 = getLibraryFromEncoding("bech32");
    exports.bech32m = getLibraryFromEncoding("bech32m");
  }
});

// ../sdk/dist/address.js
var import_bech32, ADDRESS_PAYLOAD_LEN;
var init_address = __esm({
  "../sdk/dist/address.js"() {
    "use strict";
    import_bech32 = __toESM(require_dist(), 1);
    init_bytes();
    ADDRESS_PAYLOAD_LEN = 3 * FIELD_BYTES;
  }
});

// ../sdk/dist/keys.js
var init_keys = __esm({
  "../sdk/dist/keys.js"() {
    "use strict";
    init_crypto();
    init_address();
    init_jubjub_wasm2();
  }
});

// ../sdk/dist/witness.js
var init_witness = __esm({
  "../sdk/dist/witness.js"() {
    "use strict";
    init_crypto();
  }
});

// ../sdk/dist/snark-compression.js
var init_snark_compression = __esm({
  "../sdk/dist/snark-compression.js"() {
    "use strict";
  }
});

// ../sdk/node_modules/snarkjs/node_modules/ffjavascript/build/browser.esm.js
function fromString(s, radix) {
  if (!radix || radix == 10) {
    return BigInt(s);
  } else if (radix == 16) {
    if (s.slice(0, 2) == "0x") {
      return BigInt(s);
    } else {
      return BigInt("0x" + s);
    }
  }
}
function fromArray(a, radix) {
  let acc = BigInt(0);
  radix = BigInt(radix);
  for (let i = 0; i < a.length; i++) {
    acc = acc * radix + BigInt(a[i]);
  }
  return acc;
}
function bitLength$6(a) {
  const aS = a.toString(16);
  return (aS.length - 1) * 4 + hexLen[parseInt(aS[0], 16)];
}
function isNegative$4(a) {
  return BigInt(a) < BigInt(0);
}
function isZero$1(a) {
  return !a;
}
function shiftLeft(a, n) {
  return BigInt(a) << BigInt(n);
}
function shiftRight(a, n) {
  return BigInt(a) >> BigInt(n);
}
function isOdd$5(a) {
  return (BigInt(a) & BigInt(1)) == BigInt(1);
}
function naf(n) {
  let E = BigInt(n);
  const res = [];
  while (E) {
    if (E & BigInt(1)) {
      const z = 2 - Number(E % BigInt(4));
      res.push(z);
      E = E - BigInt(z);
    } else {
      res.push(0);
    }
    E = E >> BigInt(1);
  }
  return res;
}
function bits(n) {
  let E = BigInt(n);
  const res = [];
  while (E) {
    if (E & BigInt(1)) {
      res.push(1);
    } else {
      res.push(0);
    }
    E = E >> BigInt(1);
  }
  return res;
}
function toNumber$1(s) {
  if (s > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error("Number too big");
  }
  return Number(s);
}
function toArray(s, radix) {
  const res = [];
  let rem = BigInt(s);
  radix = BigInt(radix);
  while (rem) {
    res.unshift(Number(rem % radix));
    rem = rem / radix;
  }
  return res;
}
function add(a, b) {
  return BigInt(a) + BigInt(b);
}
function sub(a, b) {
  return BigInt(a) - BigInt(b);
}
function neg(a) {
  return -BigInt(a);
}
function mul(a, b) {
  return BigInt(a) * BigInt(b);
}
function square$2(a) {
  return BigInt(a) * BigInt(a);
}
function pow(a, b) {
  return BigInt(a) ** BigInt(b);
}
function exp$1(a, b) {
  return BigInt(a) ** BigInt(b);
}
function abs$1(a) {
  return BigInt(a) >= 0 ? BigInt(a) : -BigInt(a);
}
function div(a, b) {
  return BigInt(a) / BigInt(b);
}
function mod(a, b) {
  return BigInt(a) % BigInt(b);
}
function eq(a, b) {
  return BigInt(a) == BigInt(b);
}
function neq(a, b) {
  return BigInt(a) != BigInt(b);
}
function lt(a, b) {
  return BigInt(a) < BigInt(b);
}
function gt(a, b) {
  return BigInt(a) > BigInt(b);
}
function leq(a, b) {
  return BigInt(a) <= BigInt(b);
}
function geq(a, b) {
  return BigInt(a) >= BigInt(b);
}
function band(a, b) {
  return BigInt(a) & BigInt(b);
}
function bor(a, b) {
  return BigInt(a) | BigInt(b);
}
function bxor(a, b) {
  return BigInt(a) ^ BigInt(b);
}
function land(a, b) {
  return BigInt(a) && BigInt(b);
}
function lor(a, b) {
  return BigInt(a) || BigInt(b);
}
function lnot(a) {
  return !BigInt(a);
}
function toRprLE(buff, o, e3, n8) {
  const s = "0000000" + e3.toString(16);
  const v = new Uint32Array(buff.buffer, buff.byteOffset + o, n8 / 4);
  const l = ((s.length - 7) * 4 - 1 >> 5) + 1;
  for (let i = 0; i < l; i++) v[i] = parseInt(s.substring(s.length - 8 * i - 8, s.length - 8 * i), 16);
  for (let i = l; i < v.length; i++) v[i] = 0;
  for (let i = v.length * 4; i < n8; i++) buff[i] = toNumber$1(band(shiftRight(e3, i * 8), 255));
}
function toRprBE(buff, o, e3, n8) {
  const s = "0000000" + e3.toString(16);
  const v = new DataView(buff.buffer, buff.byteOffset + o, n8);
  const l = ((s.length - 7) * 4 - 1 >> 5) + 1;
  for (let i = 0; i < l; i++) v.setUint32(n8 - i * 4 - 4, parseInt(s.substring(s.length - 8 * i - 8, s.length - 8 * i), 16), false);
  for (let i = 0; i < n8 / 4 - l; i++) v[i] = 0;
}
function fromRprLE(buff, o, n8) {
  n8 = n8 || buff.byteLength;
  o = o || 0;
  const v = new Uint32Array(buff.buffer, buff.byteOffset + o, n8 / 4);
  const a = new Array(n8 / 4);
  v.forEach((ch, i) => a[a.length - i - 1] = ch.toString(16).padStart(8, "0"));
  return fromString(a.join(""), 16);
}
function fromRprBE(buff, o, n8) {
  n8 = n8 || buff.byteLength;
  o = o || 0;
  const v = new DataView(buff.buffer, buff.byteOffset + o, n8);
  const a = new Array(n8 / 4);
  for (let i = 0; i < n8 / 4; i++) {
    a[i] = v.getUint32(i * 4, false).toString(16).padStart(8, "0");
  }
  return fromString(a.join(""), 16);
}
function toString(a, radix) {
  return a.toString(radix);
}
function toLEBuff(a) {
  const buff = new Uint8Array(Math.floor((bitLength$6(a) - 1) / 8) + 1);
  toRprLE(buff, 0, a, buff.byteLength);
  return buff;
}
function _revSlow$1(idx, bits2) {
  let res = 0;
  let a = idx;
  for (let i = 0; i < bits2; i++) {
    res <<= 1;
    res = res | a & 1;
    a >>= 1;
  }
  return res;
}
function compare(a, b) {
  return a === b ? 0 : a > b ? 1 : -1;
}
function square$1(n) {
  return n * n;
}
function isOdd$4(n) {
  return n % 2n !== 0n;
}
function isEven(n) {
  return n % 2n === 0n;
}
function isNegative$3(n) {
  return n < 0n;
}
function isPositive(n) {
  return n > 0n;
}
function bitLength$5(n) {
  if (isNegative$3(n)) {
    return n.toString(2).length - 1;
  } else {
    return n.toString(2).length;
  }
}
function abs(n) {
  return n < 0n ? -n : n;
}
function isUnit(n) {
  return abs(n) === 1n;
}
function modInv$3(a, n) {
  var t = 0n, newT = 1n, r = n, newR = abs(a), q, lastT, lastR;
  while (newR !== 0n) {
    q = r / newR;
    lastT = t;
    lastR = r;
    t = newT;
    r = newR;
    newT = lastT - q * newT;
    newR = lastR - q * newR;
  }
  if (!isUnit(r)) throw new Error(a.toString() + " and " + n.toString() + " are not co-prime");
  if (compare(t, 0n) === -1) {
    t = t + n;
  }
  if (isNegative$3(a)) {
    return -t;
  }
  return t;
}
function modPow$2(n, exp, mod2) {
  if (mod2 === 0n) throw new Error("Cannot take modPow with modulus 0");
  var r = 1n, base = n % mod2;
  if (isNegative$3(exp)) {
    exp = exp * -1n;
    base = modInv$3(base, mod2);
  }
  while (isPositive(exp)) {
    if (base === 0n) return 0n;
    if (isOdd$4(exp)) r = r * base % mod2;
    exp = exp / 2n;
    base = square$1(base) % mod2;
  }
  return r;
}
function compareAbs(a, b) {
  a = a >= 0n ? a : -a;
  b = b >= 0n ? b : -b;
  return a === b ? 0 : a > b ? 1 : -1;
}
function isDivisibleBy(a, n) {
  if (n === 0n) return false;
  if (isUnit(n)) return true;
  if (compareAbs(n, 2n) === 0) return isEven(a);
  return a % n === 0n;
}
function isBasicPrime(v) {
  var n = abs(v);
  if (isUnit(n)) return false;
  if (n === 2n || n === 3n || n === 5n) return true;
  if (isEven(n) || isDivisibleBy(n, 3n) || isDivisibleBy(n, 5n)) return false;
  if (n < 49n) return true;
}
function prev(n) {
  return n - 1n;
}
function millerRabinTest(n, a) {
  var nPrev = prev(n), b = nPrev, r = 0, d, i, x;
  while (isEven(b)) b = b / 2n, r++;
  next: for (i = 0; i < a.length; i++) {
    if (n < a[i]) continue;
    x = modPow$2(BigInt(a[i]), b, n);
    if (isUnit(x) || x === nPrev) continue;
    for (d = r - 1; d != 0; d--) {
      x = square$1(x) % n;
      if (isUnit(x)) return false;
      if (x === nPrev) continue next;
    }
    return false;
  }
  return true;
}
function isPrime$1(p) {
  var isPrime3 = isBasicPrime(p);
  if (isPrime3 !== void 0) return isPrime3;
  var n = abs(p);
  var bits2 = bitLength$5(n);
  if (bits2 <= 64)
    return millerRabinTest(n, [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]);
  var logN = Math.log(2) * Number(bits2);
  var t = Math.ceil(logN);
  for (var a = [], i = 0; i < t; i++) {
    a.push(BigInt(i + 2));
  }
  return millerRabinTest(n, a);
}
function stringifyBigInts(o) {
  if (typeof o == "bigint" || o.eq !== void 0) {
    return o.toString(10);
  } else if (o instanceof Uint8Array) {
    return fromRprLE(o, 0);
  } else if (Array.isArray(o)) {
    return o.map(stringifyBigInts);
  } else if (typeof o == "object") {
    const res = {};
    const keys = Object.keys(o);
    keys.forEach((k) => {
      res[k] = stringifyBigInts(o[k]);
    });
    return res;
  } else {
    return o;
  }
}
function unstringifyBigInts(o) {
  if (typeof o == "string" && /^[0-9]+$/.test(o)) {
    return BigInt(o);
  } else if (typeof o == "string" && /^0x[0-9a-fA-F]+$/.test(o)) {
    return BigInt(o);
  } else if (Array.isArray(o)) {
    return o.map(unstringifyBigInts);
  } else if (typeof o == "object") {
    if (o === null) return null;
    const res = {};
    const keys = Object.keys(o);
    keys.forEach((k) => {
      res[k] = unstringifyBigInts(o[k]);
    });
    return res;
  } else {
    return o;
  }
}
function beBuff2int(buff) {
  let res = BigInt(0);
  let i = buff.length;
  let offset = 0;
  const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
  while (i > 0) {
    if (i >= 4) {
      i -= 4;
      res += BigInt(buffV.getUint32(i)) << BigInt(offset * 8);
      offset += 4;
    } else if (i >= 2) {
      i -= 2;
      res += BigInt(buffV.getUint16(i)) << BigInt(offset * 8);
      offset += 2;
    } else {
      i -= 1;
      res += BigInt(buffV.getUint8(i)) << BigInt(offset * 8);
      offset += 1;
    }
  }
  return res;
}
function beInt2Buff(n, len) {
  let r = n;
  const buff = new Uint8Array(len);
  const buffV = new DataView(buff.buffer);
  let o = len;
  while (o > 0) {
    if (o - 4 >= 0) {
      o -= 4;
      buffV.setUint32(o, Number(r & BigInt(4294967295)));
      r = r >> BigInt(32);
    } else if (o - 2 >= 0) {
      o -= 2;
      buffV.setUint16(o, Number(r & BigInt(65535)));
      r = r >> BigInt(16);
    } else {
      o -= 1;
      buffV.setUint8(o, Number(r & BigInt(255)));
      r = r >> BigInt(8);
    }
  }
  if (r) {
    throw new Error("Number does not fit in this length");
  }
  return buff;
}
function leBuff2int(buff) {
  let res = BigInt(0);
  let i = 0;
  const buffV = new DataView(buff.buffer, buff.byteOffset, buff.byteLength);
  while (i < buff.length) {
    if (i + 4 <= buff.length) {
      res += BigInt(buffV.getUint32(i, true)) << BigInt(i * 8);
      i += 4;
    } else if (i + 2 <= buff.length) {
      res += BigInt(buffV.getUint16(i, true)) << BigInt(i * 8);
      i += 2;
    } else {
      res += BigInt(buffV.getUint8(i, true)) << BigInt(i * 8);
      i += 1;
    }
  }
  return res;
}
function leInt2Buff(n, len) {
  let r = n;
  if (typeof len === "undefined") {
    len = Math.floor((bitLength$6(n) - 1) / 8) + 1;
    if (len == 0) len = 1;
  }
  const buff = new Uint8Array(len);
  const buffV = new DataView(buff.buffer);
  let o = 0;
  while (o < len) {
    if (o + 4 <= len) {
      buffV.setUint32(o, Number(r & BigInt(4294967295)), true);
      o += 4;
      r = r >> BigInt(32);
    } else if (o + 2 <= len) {
      buffV.setUint16(o, Number(r & BigInt(65535)), true);
      o += 2;
      r = r >> BigInt(16);
    } else {
      buffV.setUint8(o, Number(r & BigInt(255)), true);
      o += 1;
      r = r >> BigInt(8);
    }
  }
  if (r) {
    throw new Error("Number does not fit in this length");
  }
  return buff;
}
function stringifyFElements(F, o) {
  if (typeof o == "bigint" || o.eq !== void 0) {
    return o.toString(10);
  } else if (o instanceof Uint8Array) {
    return F.toString(F.e(o));
  } else if (Array.isArray(o)) {
    return o.map(stringifyFElements.bind(this, F));
  } else if (typeof o == "object") {
    const res = {};
    const keys = Object.keys(o);
    keys.forEach((k) => {
      res[k] = stringifyFElements(F, o[k]);
    });
    return res;
  } else {
    return o;
  }
}
function unstringifyFElements(F, o) {
  if (typeof o == "string" && /^[0-9]+$/.test(o)) {
    return F.e(o);
  } else if (typeof o == "string" && /^0x[0-9a-fA-F]+$/.test(o)) {
    return F.e(o);
  } else if (Array.isArray(o)) {
    return o.map(unstringifyFElements.bind(this, F));
  } else if (typeof o == "object") {
    if (o === null) return null;
    const res = {};
    const keys = Object.keys(o);
    keys.forEach((k) => {
      res[k] = unstringifyFElements(F, o[k]);
    });
    return res;
  } else {
    return o;
  }
}
function _revSlow(idx, bits2) {
  let res = 0;
  let a = idx;
  for (let i = 0; i < bits2; i++) {
    res <<= 1;
    res = res | a & 1;
    a >>= 1;
  }
  return res;
}
function bitReverse(idx, bits2) {
  return (_revTable[idx >>> 24] | _revTable[idx >>> 16 & 255] << 8 | _revTable[idx >>> 8 & 255] << 16 | _revTable[idx & 255] << 24) >>> 32 - bits2;
}
function log2(V) {
  return ((V & 4294901760) !== 0 ? (V &= 4294901760, 16) : 0) | ((V & 4278255360) !== 0 ? (V &= 4278255360, 8) : 0) | ((V & 4042322160) !== 0 ? (V &= 4042322160, 4) : 0) | ((V & 3435973836) !== 0 ? (V &= 3435973836, 2) : 0) | (V & 2863311530) !== 0;
}
function buffReverseBits(buff, eSize) {
  const n = buff.byteLength / eSize;
  const bits2 = log2(n);
  if (n != 1 << bits2) {
    throw new Error("Invalid number of pointers");
  }
  for (let i = 0; i < n; i++) {
    const r = bitReverse(i, bits2);
    if (i > r) {
      const tmp = buff.slice(i * eSize, (i + 1) * eSize);
      buff.set(buff.slice(r * eSize, (r + 1) * eSize), i * eSize);
      buff.set(tmp, r * eSize);
    }
  }
}
function array2buffer(arr, sG) {
  const buff = new Uint8Array(sG * arr.length);
  for (let i = 0; i < arr.length; i++) {
    buff.set(arr[i], i * sG);
  }
  return buff;
}
function buffer2array(buff, sG) {
  const n = buff.byteLength / sG;
  const arr = new Array(n);
  for (let i = 0; i < n; i++) {
    arr[i] = buff.slice(i * sG, i * sG + sG);
  }
  return arr;
}
var hexLen, e, shl, shr, zero, one, _Scalar, _revTable$1, utils$6, bigint, bitLength$4, modInv$2, modPow$1, isPrime, isOdd$3, square, bitLength$3, isOdd$2, modInv$1, modPow, bitLength$2, modInv, isOdd$1, isNegative$2, bitLength$1, isOdd, isNegative$1, _revTable, _utils, PAGE_SIZE, workerSource, threadStr, bls12381r, bn128r, bls12381q, bn128q, Scalar, utils;
var init_browser_esm = __esm({
  "../sdk/node_modules/snarkjs/node_modules/ffjavascript/build/browser.esm.js"() {
    hexLen = [0, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4];
    e = fromString;
    shl = shiftLeft;
    shr = shiftRight;
    zero = e(0);
    one = e(1);
    _Scalar = /* @__PURE__ */ Object.freeze({
      __proto__: null,
      abs: abs$1,
      add,
      band,
      bitLength: bitLength$6,
      bits,
      bor,
      bxor,
      div,
      e,
      eq,
      exp: exp$1,
      fromArray,
      fromRprBE,
      fromRprLE,
      fromString,
      geq,
      gt,
      isNegative: isNegative$4,
      isOdd: isOdd$5,
      isZero: isZero$1,
      land,
      leq,
      lnot,
      lor,
      lt,
      mod,
      mul,
      naf,
      neg,
      neq,
      one,
      pow,
      shiftLeft,
      shiftRight,
      shl,
      shr,
      square: square$2,
      sub,
      toArray,
      toLEBuff,
      toNumber: toNumber$1,
      toRprBE,
      toRprLE,
      toString,
      zero
    });
    _revTable$1 = [];
    for (let i = 0; i < 256; i++) {
      _revTable$1[i] = _revSlow$1(i, 8);
    }
    utils$6 = {};
    utils$6.bigInt2BytesLE = function bigInt2BytesLE(_a, len) {
      const b = Array(len);
      let v = BigInt(_a);
      for (let i = 0; i < len; i++) {
        b[i] = Number(v & 0xFFn);
        v = v >> 8n;
      }
      return b;
    };
    utils$6.bigInt2U32LE = function bigInt2BytesLE2(_a, len) {
      const b = Array(len);
      let v = BigInt(_a);
      for (let i = 0; i < len; i++) {
        b[i] = Number(v & 0xFFFFFFFFn);
        v = v >> 32n;
      }
      return b;
    };
    utils$6.isOcamNum = function(a) {
      if (!Array.isArray(a)) return false;
      if (a.length != 3) return false;
      if (typeof a[0] !== "number") return false;
      if (typeof a[1] !== "number") return false;
      if (!Array.isArray(a[2])) return false;
      return true;
    };
    bigint = {};
    bigint.bitLength = bitLength$5;
    bigint.isOdd = isOdd$4;
    bigint.isNegative = isNegative$3;
    bigint.abs = abs;
    bigint.isUnit = isUnit;
    bigint.compare = compare;
    bigint.modInv = modInv$3;
    bigint.modPow = modPow$2;
    bigint.isPrime = isPrime$1;
    bigint.square = square$1;
    ({ bitLength: bitLength$4, modInv: modInv$2, modPow: modPow$1, isPrime, isOdd: isOdd$3, square } = bigint);
    ({ bitLength: bitLength$3 } = bigint);
    ({ isOdd: isOdd$2, modInv: modInv$1, modPow } = bigint);
    ({ bitLength: bitLength$2, modInv, isOdd: isOdd$1, isNegative: isNegative$2 } = bigint);
    ({ bitLength: bitLength$1, isOdd, isNegative: isNegative$1 } = bigint);
    _revTable = [];
    for (let i = 0; i < 256; i++) {
      _revTable[i] = _revSlow(i, 8);
    }
    _utils = /* @__PURE__ */ Object.freeze({
      __proto__: null,
      array2buffer,
      beBuff2int,
      beInt2Buff,
      bitReverse,
      buffReverseBits,
      buffer2array,
      leBuff2int,
      leInt2Buff,
      log2,
      stringifyBigInts,
      stringifyFElements,
      unstringifyBigInts,
      unstringifyFElements
    });
    PAGE_SIZE = 1 << 30;
    threadStr = `(${'function thread(self) {\n    const MAXMEM = 32767;\n    let instance;\n    let memory;\n\n    if (self) {\n        self.onmessage = function(e) {\n            let data;\n            if (e.data) {\n                data = e.data;\n            } else {\n                data = e;\n            }\n\n            if (data[0].cmd == "INIT") {\n                init(data[0]).then(function() {\n                    self.postMessage(data.result);\n                });\n            } else if (data[0].cmd == "TERMINATE") {\n                self.close();\n            } else {\n                const res = runTask(data);\n                self.postMessage(res);\n            }\n        };\n    }\n\n    async function init(data) {\n        const code = new Uint8Array(data.code);\n        const wasmModule = await WebAssembly.compile(code);\n        memory = new WebAssembly.Memory({initial:data.init, maximum: MAXMEM});\n\n        instance = await WebAssembly.instantiate(wasmModule, {\n            env: {\n                "memory": memory\n            }\n        });\n    }\n\n\n\n    function alloc(length) {\n        const u32 = new Uint32Array(memory.buffer, 0, 1);\n        while (u32[0] & 3) u32[0]++;  // Return always aligned pointers\n        const res = u32[0];\n        u32[0] += length;\n        if (u32[0] + length > memory.buffer.byteLength) {\n            const currentPages = memory.buffer.byteLength / 0x10000;\n            let requiredPages = Math.floor((u32[0] + length) / 0x10000)+1;\n            if (requiredPages>MAXMEM) requiredPages=MAXMEM;\n            memory.grow(requiredPages-currentPages);\n        }\n        return res;\n    }\n\n    function allocBuffer(buffer) {\n        const p = alloc(buffer.byteLength);\n        setBuffer(p, buffer);\n        return p;\n    }\n\n    function getBuffer(pointer, length) {\n        const u8 = new Uint8Array(memory.buffer);\n        return new Uint8Array(u8.buffer, u8.byteOffset + pointer, length);\n    }\n\n    function setBuffer(pointer, buffer) {\n        const u8 = new Uint8Array(memory.buffer);\n        u8.set(new Uint8Array(buffer), pointer);\n    }\n\n    function runTask(task) {\n        if (task[0].cmd == "INIT") {\n            return init(task[0]);\n        }\n        const ctx = {\n            vars: [],\n            out: []\n        };\n        const u32a = new Uint32Array(memory.buffer, 0, 1);\n        const oldAlloc = u32a[0];\n        for (let i=0; i<task.length; i++) {\n            switch (task[i].cmd) {\n            case "ALLOCSET":\n                ctx.vars[task[i].var] = allocBuffer(task[i].buff);\n                break;\n            case "ALLOC":\n                ctx.vars[task[i].var] = alloc(task[i].len);\n                break;\n            case "SET":\n                setBuffer(ctx.vars[task[i].var], task[i].buff);\n                break;\n            case "CALL": {\n                const params = [];\n                for (let j=0; j<task[i].params.length; j++) {\n                    const p = task[i].params[j];\n                    if (typeof p.var !== "undefined") {\n                        params.push(ctx.vars[p.var] + (p.offset || 0));\n                    } else if (typeof p.val != "undefined") {\n                        params.push(p.val);\n                    }\n                }\n                instance.exports[task[i].fnName](...params);\n                break;\n            }\n            case "GET":\n                ctx.out[task[i].out] = getBuffer(ctx.vars[task[i].var], task[i].len).slice();\n                break;\n            default:\n                throw new Error("Invalid cmd");\n            }\n        }\n        const u32b = new Uint32Array(memory.buffer, 0, 1);\n        u32b[0] = oldAlloc;\n        return ctx.out;\n    }\n\n\n    return runTask;\n}'})(self)`;
    {
      if (globalThis?.Blob) {
        const threadBytes = new TextEncoder().encode(threadStr);
        const workerBlob = new Blob([threadBytes], { type: "application/javascript" });
        workerSource = URL.createObjectURL(workerBlob);
      } else {
        workerSource = "data:application/javascript;base64," + globalThis.btoa(threadStr);
      }
    }
    globalThis.curve_bn128 = null;
    globalThis.curve_bls12381 = null;
    bls12381r = e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
    bn128r = e("21888242871839275222246405745257275088548364400416034343698204186575808495617");
    bls12381q = e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16);
    bn128q = e("21888242871839275222246405745257275088696311157297823662689037894645226208583");
    Scalar = _Scalar;
    utils = _utils;
  }
});

// ../sdk/node_modules/snarkjs/build/browser.esm.js
function number(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error(`positive integer expected, not ${n}`);
}
function isBytes(a) {
  return a instanceof Uint8Array || a != null && typeof a === "object" && a.constructor.name === "Uint8Array";
}
function bytes(b, ...lengths) {
  if (!isBytes(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error(`Uint8Array expected of length ${lengths}, not of length=${b.length}`);
}
function exists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function output(out, instance) {
  bytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error(`digestInto() expects output buffer of length at least ${min}`);
  }
}
function byteSwap32(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap(arr[i]);
  }
}
function utf8ToBytes(str) {
  if (typeof str !== "string")
    throw new Error(`utf8ToBytes expected string, got ${typeof str}`);
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes(data) {
  if (typeof data === "string")
    data = utf8ToBytes(data);
  bytes(data);
  return data;
}
function wrapConstructor(hashCons) {
  const hashC = (msg) => hashCons().update(toBytes(msg)).digest();
  const tmp = hashCons();
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = () => hashCons();
  return hashC;
}
function fromBig(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK64), l: Number(n >> _32n & U32_MASK64) };
  return { h: Number(n >> _32n & U32_MASK64) | 0, l: Number(n & U32_MASK64) | 0 };
}
function split(lst, le = false) {
  let Ah = new Uint32Array(lst.length);
  let Al = new Uint32Array(lst.length);
  for (let i = 0; i < lst.length; i++) {
    const { h, l } = fromBig(lst[i], le);
    [Ah[i], Al[i]] = [h, l];
  }
  return [Ah, Al];
}
function keccakP(s, rounds = 24) {
  const B = new Uint32Array(5 * 2);
  for (let round = 24 - rounds; round < 24; round++) {
    for (let x = 0; x < 10; x++)
      B[x] = s[x] ^ s[x + 10] ^ s[x + 20] ^ s[x + 30] ^ s[x + 40];
    for (let x = 0; x < 10; x += 2) {
      const idx1 = (x + 8) % 10;
      const idx0 = (x + 2) % 10;
      const B0 = B[idx0];
      const B1 = B[idx0 + 1];
      const Th = rotlH(B0, B1, 1) ^ B[idx1];
      const Tl = rotlL(B0, B1, 1) ^ B[idx1 + 1];
      for (let y = 0; y < 50; y += 10) {
        s[x + y] ^= Th;
        s[x + y + 1] ^= Tl;
      }
    }
    let curH = s[2];
    let curL = s[3];
    for (let t = 0; t < 24; t++) {
      const shift = SHA3_ROTL[t];
      const Th = rotlH(curH, curL, shift);
      const Tl = rotlL(curH, curL, shift);
      const PI = SHA3_PI[t];
      curH = s[PI];
      curL = s[PI + 1];
      s[PI] = Th;
      s[PI + 1] = Tl;
    }
    for (let y = 0; y < 50; y += 10) {
      for (let x = 0; x < 10; x++)
        B[x] = s[y + x];
      for (let x = 0; x < 10; x++)
        s[y + x] ^= ~B[(x + 2) % 10] & B[(x + 4) % 10];
    }
    s[0] ^= SHA3_IOTA_H[round];
    s[1] ^= SHA3_IOTA_L[round];
  }
  B.fill(0);
}
var tmpBuff32$1, tmpBuff32v$1, tmpBuff64$1, tmpBuff64v$1, PAGE_SIZE2, tmpBuff32, tmpBuff32v, tmpBuff64, tmpBuff64v, DEFAULT_CACHE_SIZE, DEFAULT_PAGE_SIZE, bls12381r$1, bn128r$1, bls12381q2, bn128q2, u32, isLE, byteSwap, Hash, U32_MASK64, _32n, rotlSH, rotlSL, rotlBH, rotlBL, stringifyBigInts$4, unstringifyBigInts$b, unstringifyBigInts$a, unstringifyBigInts$9, unstringifyBigInts$8, bls12381r2, bn128r2, unstringifyBigInts$7, stringifyBigInts$3, unstringifyBigInts$6, stringifyBigInts$2, SHA3_PI, SHA3_ROTL, _SHA3_IOTA, _0n, _1n, _2n, _7n, _256n, _0x71n, SHA3_IOTA_H, SHA3_IOTA_L, rotlH, rotlL, Keccak, gen, keccak_256, stringifyBigInts$1, unstringifyBigInts$5, unstringifyBigInts$4, unstringifyBigInts$3, stringifyBigInts2, unstringifyBigInts$2, unstringifyBigInts$1, unstringifyBigInts2;
var init_browser_esm2 = __esm({
  "../sdk/node_modules/snarkjs/build/browser.esm.js"() {
    init_browser_esm();
    tmpBuff32$1 = new Uint8Array(4);
    tmpBuff32v$1 = new DataView(tmpBuff32$1.buffer);
    tmpBuff64$1 = new Uint8Array(8);
    tmpBuff64v$1 = new DataView(tmpBuff64$1.buffer);
    PAGE_SIZE2 = 1 << 22;
    tmpBuff32 = new Uint8Array(4);
    tmpBuff32v = new DataView(tmpBuff32.buffer);
    tmpBuff64 = new Uint8Array(8);
    tmpBuff64v = new DataView(tmpBuff64.buffer);
    DEFAULT_CACHE_SIZE = 1 << 16;
    DEFAULT_PAGE_SIZE = 1 << 13;
    bls12381r$1 = Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
    bn128r$1 = Scalar.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");
    bls12381q2 = Scalar.e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16);
    bn128q2 = Scalar.e("21888242871839275222246405745257275088696311157297823662689037894645226208583");
    u32 = (arr) => new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
    isLE = new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68;
    byteSwap = (word) => word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
    Hash = class {
      // Safe version that clones internal state
      clone() {
        return this._cloneInto();
      }
    };
    U32_MASK64 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
    _32n = /* @__PURE__ */ BigInt(32);
    rotlSH = (h, l, s) => h << s | l >>> 32 - s;
    rotlSL = (h, l, s) => l << s | h >>> 32 - s;
    rotlBH = (h, l, s) => l << s - 32 | h >>> 64 - s;
    rotlBL = (h, l, s) => h << s - 32 | l >>> 64 - s;
    ({ stringifyBigInts: stringifyBigInts$4 } = utils);
    ({ unstringifyBigInts: unstringifyBigInts$b } = utils);
    ({ unstringifyBigInts: unstringifyBigInts$a } = utils);
    ({ unstringifyBigInts: unstringifyBigInts$9 } = utils);
    ({ unstringifyBigInts: unstringifyBigInts$8 } = utils);
    bls12381r2 = Scalar.e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
    bn128r2 = Scalar.e("21888242871839275222246405745257275088548364400416034343698204186575808495617");
    ({ unstringifyBigInts: unstringifyBigInts$7 } = utils);
    ({ stringifyBigInts: stringifyBigInts$3 } = utils);
    ({ unstringifyBigInts: unstringifyBigInts$6, stringifyBigInts: stringifyBigInts$2 } = utils);
    SHA3_PI = [];
    SHA3_ROTL = [];
    _SHA3_IOTA = [];
    _0n = /* @__PURE__ */ BigInt(0);
    _1n = /* @__PURE__ */ BigInt(1);
    _2n = /* @__PURE__ */ BigInt(2);
    _7n = /* @__PURE__ */ BigInt(7);
    _256n = /* @__PURE__ */ BigInt(256);
    _0x71n = /* @__PURE__ */ BigInt(113);
    for (let round = 0, R = _1n, x = 1, y = 0; round < 24; round++) {
      [x, y] = [y, (2 * x + 3 * y) % 5];
      SHA3_PI.push(2 * (5 * y + x));
      SHA3_ROTL.push((round + 1) * (round + 2) / 2 % 64);
      let t = _0n;
      for (let j = 0; j < 7; j++) {
        R = (R << _1n ^ (R >> _7n) * _0x71n) % _256n;
        if (R & _2n)
          t ^= _1n << (_1n << /* @__PURE__ */ BigInt(j)) - _1n;
      }
      _SHA3_IOTA.push(t);
    }
    [SHA3_IOTA_H, SHA3_IOTA_L] = /* @__PURE__ */ split(_SHA3_IOTA, true);
    rotlH = (h, l, s) => s > 32 ? rotlBH(h, l, s) : rotlSH(h, l, s);
    rotlL = (h, l, s) => s > 32 ? rotlBL(h, l, s) : rotlSL(h, l, s);
    Keccak = class _Keccak extends Hash {
      // NOTE: we accept arguments in bytes instead of bits here.
      constructor(blockLen, suffix, outputLen, enableXOF = false, rounds = 24) {
        super();
        this.blockLen = blockLen;
        this.suffix = suffix;
        this.outputLen = outputLen;
        this.enableXOF = enableXOF;
        this.rounds = rounds;
        this.pos = 0;
        this.posOut = 0;
        this.finished = false;
        this.destroyed = false;
        number(outputLen);
        if (0 >= this.blockLen || this.blockLen >= 200)
          throw new Error("Sha3 supports only keccak-f1600 function");
        this.state = new Uint8Array(200);
        this.state32 = u32(this.state);
      }
      keccak() {
        if (!isLE)
          byteSwap32(this.state32);
        keccakP(this.state32, this.rounds);
        if (!isLE)
          byteSwap32(this.state32);
        this.posOut = 0;
        this.pos = 0;
      }
      update(data) {
        exists(this);
        const { blockLen, state: state2 } = this;
        data = toBytes(data);
        const len = data.length;
        for (let pos = 0; pos < len; ) {
          const take = Math.min(blockLen - this.pos, len - pos);
          for (let i = 0; i < take; i++)
            state2[this.pos++] ^= data[pos++];
          if (this.pos === blockLen)
            this.keccak();
        }
        return this;
      }
      finish() {
        if (this.finished)
          return;
        this.finished = true;
        const { state: state2, suffix, pos, blockLen } = this;
        state2[pos] ^= suffix;
        if ((suffix & 128) !== 0 && pos === blockLen - 1)
          this.keccak();
        state2[blockLen - 1] ^= 128;
        this.keccak();
      }
      writeInto(out) {
        exists(this, false);
        bytes(out);
        this.finish();
        const bufferOut = this.state;
        const { blockLen } = this;
        for (let pos = 0, len = out.length; pos < len; ) {
          if (this.posOut >= blockLen)
            this.keccak();
          const take = Math.min(blockLen - this.posOut, len - pos);
          out.set(bufferOut.subarray(this.posOut, this.posOut + take), pos);
          this.posOut += take;
          pos += take;
        }
        return out;
      }
      xofInto(out) {
        if (!this.enableXOF)
          throw new Error("XOF is not possible for this instance");
        return this.writeInto(out);
      }
      xof(bytes2) {
        number(bytes2);
        return this.xofInto(new Uint8Array(bytes2));
      }
      digestInto(out) {
        output(out, this);
        if (this.finished)
          throw new Error("digest() was already called");
        this.writeInto(out);
        this.destroy();
        return out;
      }
      digest() {
        return this.digestInto(new Uint8Array(this.outputLen));
      }
      destroy() {
        this.destroyed = true;
        this.state.fill(0);
      }
      _cloneInto(to) {
        const { blockLen, suffix, outputLen, rounds, enableXOF } = this;
        to || (to = new _Keccak(blockLen, suffix, outputLen, enableXOF, rounds));
        to.state32.set(this.state32);
        to.pos = this.pos;
        to.posOut = this.posOut;
        to.finished = this.finished;
        to.rounds = rounds;
        to.suffix = suffix;
        to.outputLen = outputLen;
        to.enableXOF = enableXOF;
        to.destroyed = this.destroyed;
        return to;
      }
    };
    gen = (suffix, blockLen, outputLen) => wrapConstructor(() => new Keccak(blockLen, suffix, outputLen));
    keccak_256 = /* @__PURE__ */ gen(1, 136, 256 / 8);
    ({ stringifyBigInts: stringifyBigInts$1 } = utils);
    ({ unstringifyBigInts: unstringifyBigInts$5 } = utils);
    ({ unstringifyBigInts: unstringifyBigInts$4 } = utils);
    ({ unstringifyBigInts: unstringifyBigInts$3 } = utils);
    ({ stringifyBigInts: stringifyBigInts2 } = utils);
    ({ unstringifyBigInts: unstringifyBigInts$2 } = utils);
    ({ unstringifyBigInts: unstringifyBigInts$1 } = utils);
    ({ unstringifyBigInts: unstringifyBigInts2 } = utils);
  }
});

// ../sdk/dist/types.js
var init_types = __esm({
  "../sdk/dist/types.js"() {
    "use strict";
  }
});

// ../sdk/dist/prover.js
var init_prover = __esm({
  "../sdk/dist/prover.js"() {
    "use strict";
    init_browser_esm2();
    init_types();
  }
});

// ../sdk/dist/fmd.js
function fmdGenDetectionKey(randomScalar, gamma = FMD_DEFAULT_GAMMA) {
  const x = Array.from({ length: gamma }, () => {
    const xi = randomScalar() % BABYJUB_SUBGROUP_ORDER;
    return xi === 0n ? 1n : xi;
  });
  return { x };
}
function fmdFlagKeyFromDetection(J, dk) {
  return { X: dk.x.map((xi) => J.mulPointEscalar(J.base8, xi)) };
}
function fmdFlag(J, P, fk, r) {
  const gamma = fk.X.length;
  const rMod = r % BABYJUB_SUBGROUP_ORDER;
  if (rMod === 0n)
    throw new Error("fmd flag: r must be non-zero mod q");
  const R = J.mulPointEscalar(J.base8, rMod);
  const Rpacked = J.packPoint(R);
  const cBits = fk.X.map((Xi, i) => {
    const shared = J.mulPointEscalar(Xi, rMod);
    return sharedBit(P, R, i, shared) ^ 1;
  });
  return { R: Rpacked, bits: packBits(cBits), gamma };
}
function fmdTest(J, P, dk, clue) {
  if (dk.x.length !== clue.gamma)
    return false;
  const R = J.unpackPoint(clue.R);
  if (!R || !J.inSubgroup(R))
    return false;
  const cBits = unpackBits(clue.bits, clue.gamma);
  for (let i = 0; i < clue.gamma; i++) {
    const shared = J.mulPointEscalar(R, dk.x[i]);
    if ((sharedBit(P, R, i, shared) ^ cBits[i]) !== 1)
      return false;
  }
  return true;
}
function sharedBit(P, R, i, shared) {
  const h = P.hash([TAG_FMD_BIT2, R[0], R[1], BigInt(i), shared[0], shared[1]]);
  return Number(h & 1n);
}
function packBits(bits2) {
  const out = new Uint8Array(Math.ceil(bits2.length / 8));
  for (let i = 0; i < bits2.length; i++) {
    if (bits2[i])
      out[i >> 3] |= 1 << (i & 7);
  }
  return out;
}
function unpackBits(buf, gamma) {
  const out = new Array(gamma);
  for (let i = 0; i < gamma; i++)
    out[i] = buf[i >> 3] >> (i & 7) & 1;
  return out;
}
var FMD_DEFAULT_GAMMA, TAG_FMD_BIT2;
var init_fmd = __esm({
  "../sdk/dist/fmd.js"() {
    "use strict";
    init_crypto();
    FMD_DEFAULT_GAMMA = 5;
    TAG_FMD_BIT2 = 8n;
  }
});

// ../sdk/node_modules/@noble/ciphers/esm/utils.js
function isBytes2(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function abool(b) {
  if (typeof b !== "boolean")
    throw new Error(`boolean expected, not ${b}`);
}
function anumber(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function abytes(b, ...lengths) {
  if (!isBytes2(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput(out, instance) {
  abytes(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function u322(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function utf8ToBytes2(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes2(data) {
  if (typeof data === "string")
    data = utf8ToBytes2(data);
  else if (isBytes2(data))
    data = copyBytes(data);
  else
    throw new Error("Uint8Array expected, got " + typeof data);
  return data;
}
function checkOpts(defaults, opts) {
  if (opts == null || typeof opts !== "object")
    throw new Error("options must be defined");
  const merged = Object.assign(defaults, opts);
  return merged;
}
function equalBytes(a, b) {
  if (a.length !== b.length)
    return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++)
    diff |= a[i] ^ b[i];
  return diff === 0;
}
function getOutput(expectedLength, out, onlyAligned = true) {
  if (out === void 0)
    return new Uint8Array(expectedLength);
  if (out.length !== expectedLength)
    throw new Error("invalid output length, expected " + expectedLength + ", got: " + out.length);
  if (onlyAligned && !isAligned32(out))
    throw new Error("invalid output, must be aligned");
  return out;
}
function setBigUint64(view, byteOffset, value, isLE4) {
  if (typeof view.setBigUint64 === "function")
    return view.setBigUint64(byteOffset, value, isLE4);
  const _32n3 = BigInt(32);
  const _u32_max = BigInt(4294967295);
  const wh = Number(value >> _32n3 & _u32_max);
  const wl = Number(value & _u32_max);
  const h = isLE4 ? 4 : 0;
  const l = isLE4 ? 0 : 4;
  view.setUint32(byteOffset + h, wh, isLE4);
  view.setUint32(byteOffset + l, wl, isLE4);
}
function u64Lengths(dataLength, aadLength, isLE4) {
  abool(isLE4);
  const num = new Uint8Array(16);
  const view = createView(num);
  setBigUint64(view, 0, BigInt(aadLength), isLE4);
  setBigUint64(view, 8, BigInt(dataLength), isLE4);
  return num;
}
function isAligned32(bytes2) {
  return bytes2.byteOffset % 4 === 0;
}
function copyBytes(bytes2) {
  return Uint8Array.from(bytes2);
}
var isLE2, wrapCipher;
var init_utils = __esm({
  "../sdk/node_modules/@noble/ciphers/esm/utils.js"() {
    isLE2 = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
    wrapCipher = /* @__NO_SIDE_EFFECTS__ */ (params, constructor) => {
      function wrappedCipher(key, ...args) {
        abytes(key);
        if (!isLE2)
          throw new Error("Non little-endian hardware is not yet supported");
        if (params.nonceLength !== void 0) {
          const nonce = args[0];
          if (!nonce)
            throw new Error("nonce / iv required");
          if (params.varSizeNonce)
            abytes(nonce);
          else
            abytes(nonce, params.nonceLength);
        }
        const tagl = params.tagLength;
        if (tagl && args[1] !== void 0) {
          abytes(args[1]);
        }
        const cipher = constructor(key, ...args);
        const checkOutput = (fnLength, output2) => {
          if (output2 !== void 0) {
            if (fnLength !== 2)
              throw new Error("cipher output not supported");
            abytes(output2);
          }
        };
        let called = false;
        const wrCipher = {
          encrypt(data, output2) {
            if (called)
              throw new Error("cannot encrypt() twice with same key + nonce");
            called = true;
            abytes(data);
            checkOutput(cipher.encrypt.length, output2);
            return cipher.encrypt(data, output2);
          },
          decrypt(data, output2) {
            abytes(data);
            if (tagl && data.length < tagl)
              throw new Error("invalid ciphertext length: smaller than tagLength=" + tagl);
            checkOutput(cipher.decrypt.length, output2);
            return cipher.decrypt(data, output2);
          }
        };
        return wrCipher;
      }
      Object.assign(wrappedCipher, params);
      return wrappedCipher;
    };
  }
});

// ../sdk/node_modules/@noble/ciphers/esm/_arx.js
function rotl(a, b) {
  return a << b | a >>> 32 - b;
}
function isAligned322(b) {
  return b.byteOffset % 4 === 0;
}
function runCipher(core, sigma, key, nonce, data, output2, counter, rounds) {
  const len = data.length;
  const block = new Uint8Array(BLOCK_LEN);
  const b32 = u322(block);
  const isAligned = isAligned322(data) && isAligned322(output2);
  const d32 = isAligned ? u322(data) : U32_EMPTY;
  const o32 = isAligned ? u322(output2) : U32_EMPTY;
  for (let pos = 0; pos < len; counter++) {
    core(sigma, key, nonce, b32, counter, rounds);
    if (counter >= MAX_COUNTER)
      throw new Error("arx: counter overflow");
    const take = Math.min(BLOCK_LEN, len - pos);
    if (isAligned && take === BLOCK_LEN) {
      const pos32 = pos / 4;
      if (pos % 4 !== 0)
        throw new Error("arx: invalid block position");
      for (let j = 0, posj; j < BLOCK_LEN32; j++) {
        posj = pos32 + j;
        o32[posj] = d32[posj] ^ b32[j];
      }
      pos += BLOCK_LEN;
      continue;
    }
    for (let j = 0, posj; j < take; j++) {
      posj = pos + j;
      output2[posj] = data[posj] ^ block[j];
    }
    pos += take;
  }
}
function createCipher(core, opts) {
  const { allowShortKeys, extendNonceFn, counterLength, counterRight, rounds } = checkOpts({ allowShortKeys: false, counterLength: 8, counterRight: false, rounds: 20 }, opts);
  if (typeof core !== "function")
    throw new Error("core must be a function");
  anumber(counterLength);
  anumber(rounds);
  abool(counterRight);
  abool(allowShortKeys);
  return (key, nonce, data, output2, counter = 0) => {
    abytes(key);
    abytes(nonce);
    abytes(data);
    const len = data.length;
    if (output2 === void 0)
      output2 = new Uint8Array(len);
    abytes(output2);
    anumber(counter);
    if (counter < 0 || counter >= MAX_COUNTER)
      throw new Error("arx: counter overflow");
    if (output2.length < len)
      throw new Error(`arx: output (${output2.length}) is shorter than data (${len})`);
    const toClean = [];
    let l = key.length;
    let k;
    let sigma;
    if (l === 32) {
      toClean.push(k = copyBytes(key));
      sigma = sigma32_32;
    } else if (l === 16 && allowShortKeys) {
      k = new Uint8Array(32);
      k.set(key);
      k.set(key, 16);
      sigma = sigma16_32;
      toClean.push(k);
    } else {
      throw new Error(`arx: invalid 32-byte key, got length=${l}`);
    }
    if (!isAligned322(nonce))
      toClean.push(nonce = copyBytes(nonce));
    const k32 = u322(k);
    if (extendNonceFn) {
      if (nonce.length !== 24)
        throw new Error(`arx: extended nonce must be 24 bytes`);
      extendNonceFn(sigma, k32, u322(nonce.subarray(0, 16)), k32);
      nonce = nonce.subarray(16);
    }
    const nonceNcLen = 16 - counterLength;
    if (nonceNcLen !== nonce.length)
      throw new Error(`arx: nonce must be ${nonceNcLen} or 16 bytes`);
    if (nonceNcLen !== 12) {
      const nc = new Uint8Array(12);
      nc.set(nonce, counterRight ? 0 : 12 - nonce.length);
      nonce = nc;
      toClean.push(nonce);
    }
    const n32 = u322(nonce);
    runCipher(core, sigma, k32, n32, data, output2, counter, rounds);
    clean(...toClean);
    return output2;
  };
}
var _utf8ToBytes, sigma16, sigma32, sigma16_32, sigma32_32, BLOCK_LEN, BLOCK_LEN32, MAX_COUNTER, U32_EMPTY;
var init_arx = __esm({
  "../sdk/node_modules/@noble/ciphers/esm/_arx.js"() {
    init_utils();
    _utf8ToBytes = (str) => Uint8Array.from(str.split("").map((c) => c.charCodeAt(0)));
    sigma16 = _utf8ToBytes("expand 16-byte k");
    sigma32 = _utf8ToBytes("expand 32-byte k");
    sigma16_32 = u322(sigma16);
    sigma32_32 = u322(sigma32);
    BLOCK_LEN = 64;
    BLOCK_LEN32 = 16;
    MAX_COUNTER = 2 ** 32 - 1;
    U32_EMPTY = new Uint32Array();
  }
});

// ../sdk/node_modules/@noble/ciphers/esm/_poly1305.js
function wrapConstructorWithKey(hashCons) {
  const hashC = (msg, key) => hashCons(key).update(toBytes2(msg)).digest();
  const tmp = hashCons(new Uint8Array(32));
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (key) => hashCons(key);
  return hashC;
}
var u8to16, Poly1305, poly1305;
var init_poly1305 = __esm({
  "../sdk/node_modules/@noble/ciphers/esm/_poly1305.js"() {
    init_utils();
    u8to16 = (a, i) => a[i++] & 255 | (a[i++] & 255) << 8;
    Poly1305 = class {
      constructor(key) {
        this.blockLen = 16;
        this.outputLen = 16;
        this.buffer = new Uint8Array(16);
        this.r = new Uint16Array(10);
        this.h = new Uint16Array(10);
        this.pad = new Uint16Array(8);
        this.pos = 0;
        this.finished = false;
        key = toBytes2(key);
        abytes(key, 32);
        const t0 = u8to16(key, 0);
        const t1 = u8to16(key, 2);
        const t2 = u8to16(key, 4);
        const t3 = u8to16(key, 6);
        const t4 = u8to16(key, 8);
        const t5 = u8to16(key, 10);
        const t6 = u8to16(key, 12);
        const t7 = u8to16(key, 14);
        this.r[0] = t0 & 8191;
        this.r[1] = (t0 >>> 13 | t1 << 3) & 8191;
        this.r[2] = (t1 >>> 10 | t2 << 6) & 7939;
        this.r[3] = (t2 >>> 7 | t3 << 9) & 8191;
        this.r[4] = (t3 >>> 4 | t4 << 12) & 255;
        this.r[5] = t4 >>> 1 & 8190;
        this.r[6] = (t4 >>> 14 | t5 << 2) & 8191;
        this.r[7] = (t5 >>> 11 | t6 << 5) & 8065;
        this.r[8] = (t6 >>> 8 | t7 << 8) & 8191;
        this.r[9] = t7 >>> 5 & 127;
        for (let i = 0; i < 8; i++)
          this.pad[i] = u8to16(key, 16 + 2 * i);
      }
      process(data, offset, isLast = false) {
        const hibit = isLast ? 0 : 1 << 11;
        const { h, r } = this;
        const r0 = r[0];
        const r1 = r[1];
        const r2 = r[2];
        const r3 = r[3];
        const r4 = r[4];
        const r5 = r[5];
        const r6 = r[6];
        const r7 = r[7];
        const r8 = r[8];
        const r9 = r[9];
        const t0 = u8to16(data, offset + 0);
        const t1 = u8to16(data, offset + 2);
        const t2 = u8to16(data, offset + 4);
        const t3 = u8to16(data, offset + 6);
        const t4 = u8to16(data, offset + 8);
        const t5 = u8to16(data, offset + 10);
        const t6 = u8to16(data, offset + 12);
        const t7 = u8to16(data, offset + 14);
        let h0 = h[0] + (t0 & 8191);
        let h1 = h[1] + ((t0 >>> 13 | t1 << 3) & 8191);
        let h2 = h[2] + ((t1 >>> 10 | t2 << 6) & 8191);
        let h3 = h[3] + ((t2 >>> 7 | t3 << 9) & 8191);
        let h4 = h[4] + ((t3 >>> 4 | t4 << 12) & 8191);
        let h5 = h[5] + (t4 >>> 1 & 8191);
        let h6 = h[6] + ((t4 >>> 14 | t5 << 2) & 8191);
        let h7 = h[7] + ((t5 >>> 11 | t6 << 5) & 8191);
        let h8 = h[8] + ((t6 >>> 8 | t7 << 8) & 8191);
        let h9 = h[9] + (t7 >>> 5 | hibit);
        let c = 0;
        let d0 = c + h0 * r0 + h1 * (5 * r9) + h2 * (5 * r8) + h3 * (5 * r7) + h4 * (5 * r6);
        c = d0 >>> 13;
        d0 &= 8191;
        d0 += h5 * (5 * r5) + h6 * (5 * r4) + h7 * (5 * r3) + h8 * (5 * r2) + h9 * (5 * r1);
        c += d0 >>> 13;
        d0 &= 8191;
        let d1 = c + h0 * r1 + h1 * r0 + h2 * (5 * r9) + h3 * (5 * r8) + h4 * (5 * r7);
        c = d1 >>> 13;
        d1 &= 8191;
        d1 += h5 * (5 * r6) + h6 * (5 * r5) + h7 * (5 * r4) + h8 * (5 * r3) + h9 * (5 * r2);
        c += d1 >>> 13;
        d1 &= 8191;
        let d2 = c + h0 * r2 + h1 * r1 + h2 * r0 + h3 * (5 * r9) + h4 * (5 * r8);
        c = d2 >>> 13;
        d2 &= 8191;
        d2 += h5 * (5 * r7) + h6 * (5 * r6) + h7 * (5 * r5) + h8 * (5 * r4) + h9 * (5 * r3);
        c += d2 >>> 13;
        d2 &= 8191;
        let d3 = c + h0 * r3 + h1 * r2 + h2 * r1 + h3 * r0 + h4 * (5 * r9);
        c = d3 >>> 13;
        d3 &= 8191;
        d3 += h5 * (5 * r8) + h6 * (5 * r7) + h7 * (5 * r6) + h8 * (5 * r5) + h9 * (5 * r4);
        c += d3 >>> 13;
        d3 &= 8191;
        let d4 = c + h0 * r4 + h1 * r3 + h2 * r2 + h3 * r1 + h4 * r0;
        c = d4 >>> 13;
        d4 &= 8191;
        d4 += h5 * (5 * r9) + h6 * (5 * r8) + h7 * (5 * r7) + h8 * (5 * r6) + h9 * (5 * r5);
        c += d4 >>> 13;
        d4 &= 8191;
        let d5 = c + h0 * r5 + h1 * r4 + h2 * r3 + h3 * r2 + h4 * r1;
        c = d5 >>> 13;
        d5 &= 8191;
        d5 += h5 * r0 + h6 * (5 * r9) + h7 * (5 * r8) + h8 * (5 * r7) + h9 * (5 * r6);
        c += d5 >>> 13;
        d5 &= 8191;
        let d6 = c + h0 * r6 + h1 * r5 + h2 * r4 + h3 * r3 + h4 * r2;
        c = d6 >>> 13;
        d6 &= 8191;
        d6 += h5 * r1 + h6 * r0 + h7 * (5 * r9) + h8 * (5 * r8) + h9 * (5 * r7);
        c += d6 >>> 13;
        d6 &= 8191;
        let d7 = c + h0 * r7 + h1 * r6 + h2 * r5 + h3 * r4 + h4 * r3;
        c = d7 >>> 13;
        d7 &= 8191;
        d7 += h5 * r2 + h6 * r1 + h7 * r0 + h8 * (5 * r9) + h9 * (5 * r8);
        c += d7 >>> 13;
        d7 &= 8191;
        let d8 = c + h0 * r8 + h1 * r7 + h2 * r6 + h3 * r5 + h4 * r4;
        c = d8 >>> 13;
        d8 &= 8191;
        d8 += h5 * r3 + h6 * r2 + h7 * r1 + h8 * r0 + h9 * (5 * r9);
        c += d8 >>> 13;
        d8 &= 8191;
        let d9 = c + h0 * r9 + h1 * r8 + h2 * r7 + h3 * r6 + h4 * r5;
        c = d9 >>> 13;
        d9 &= 8191;
        d9 += h5 * r4 + h6 * r3 + h7 * r2 + h8 * r1 + h9 * r0;
        c += d9 >>> 13;
        d9 &= 8191;
        c = (c << 2) + c | 0;
        c = c + d0 | 0;
        d0 = c & 8191;
        c = c >>> 13;
        d1 += c;
        h[0] = d0;
        h[1] = d1;
        h[2] = d2;
        h[3] = d3;
        h[4] = d4;
        h[5] = d5;
        h[6] = d6;
        h[7] = d7;
        h[8] = d8;
        h[9] = d9;
      }
      finalize() {
        const { h, pad } = this;
        const g = new Uint16Array(10);
        let c = h[1] >>> 13;
        h[1] &= 8191;
        for (let i = 2; i < 10; i++) {
          h[i] += c;
          c = h[i] >>> 13;
          h[i] &= 8191;
        }
        h[0] += c * 5;
        c = h[0] >>> 13;
        h[0] &= 8191;
        h[1] += c;
        c = h[1] >>> 13;
        h[1] &= 8191;
        h[2] += c;
        g[0] = h[0] + 5;
        c = g[0] >>> 13;
        g[0] &= 8191;
        for (let i = 1; i < 10; i++) {
          g[i] = h[i] + c;
          c = g[i] >>> 13;
          g[i] &= 8191;
        }
        g[9] -= 1 << 13;
        let mask = (c ^ 1) - 1;
        for (let i = 0; i < 10; i++)
          g[i] &= mask;
        mask = ~mask;
        for (let i = 0; i < 10; i++)
          h[i] = h[i] & mask | g[i];
        h[0] = (h[0] | h[1] << 13) & 65535;
        h[1] = (h[1] >>> 3 | h[2] << 10) & 65535;
        h[2] = (h[2] >>> 6 | h[3] << 7) & 65535;
        h[3] = (h[3] >>> 9 | h[4] << 4) & 65535;
        h[4] = (h[4] >>> 12 | h[5] << 1 | h[6] << 14) & 65535;
        h[5] = (h[6] >>> 2 | h[7] << 11) & 65535;
        h[6] = (h[7] >>> 5 | h[8] << 8) & 65535;
        h[7] = (h[8] >>> 8 | h[9] << 5) & 65535;
        let f = h[0] + pad[0];
        h[0] = f & 65535;
        for (let i = 1; i < 8; i++) {
          f = (h[i] + pad[i] | 0) + (f >>> 16) | 0;
          h[i] = f & 65535;
        }
        clean(g);
      }
      update(data) {
        aexists(this);
        data = toBytes2(data);
        abytes(data);
        const { buffer, blockLen } = this;
        const len = data.length;
        for (let pos = 0; pos < len; ) {
          const take = Math.min(blockLen - this.pos, len - pos);
          if (take === blockLen) {
            for (; blockLen <= len - pos; pos += blockLen)
              this.process(data, pos);
            continue;
          }
          buffer.set(data.subarray(pos, pos + take), this.pos);
          this.pos += take;
          pos += take;
          if (this.pos === blockLen) {
            this.process(buffer, 0, false);
            this.pos = 0;
          }
        }
        return this;
      }
      destroy() {
        clean(this.h, this.r, this.buffer, this.pad);
      }
      digestInto(out) {
        aexists(this);
        aoutput(out, this);
        this.finished = true;
        const { buffer, h } = this;
        let { pos } = this;
        if (pos) {
          buffer[pos++] = 1;
          for (; pos < 16; pos++)
            buffer[pos] = 0;
          this.process(buffer, 0, true);
        }
        this.finalize();
        let opos = 0;
        for (let i = 0; i < 8; i++) {
          out[opos++] = h[i] >>> 0;
          out[opos++] = h[i] >>> 8;
        }
        return out;
      }
      digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
      }
    };
    poly1305 = wrapConstructorWithKey((key) => new Poly1305(key));
  }
});

// ../sdk/node_modules/@noble/ciphers/esm/chacha.js
function chachaCore(s, k, n, out, cnt, rounds = 20) {
  let y00 = s[0], y01 = s[1], y02 = s[2], y03 = s[3], y04 = k[0], y05 = k[1], y06 = k[2], y07 = k[3], y08 = k[4], y09 = k[5], y10 = k[6], y11 = k[7], y12 = cnt, y13 = n[0], y14 = n[1], y15 = n[2];
  let x00 = y00, x01 = y01, x02 = y02, x03 = y03, x04 = y04, x05 = y05, x06 = y06, x07 = y07, x08 = y08, x09 = y09, x10 = y10, x11 = y11, x12 = y12, x13 = y13, x14 = y14, x15 = y15;
  for (let r = 0; r < rounds; r += 2) {
    x00 = x00 + x04 | 0;
    x12 = rotl(x12 ^ x00, 16);
    x08 = x08 + x12 | 0;
    x04 = rotl(x04 ^ x08, 12);
    x00 = x00 + x04 | 0;
    x12 = rotl(x12 ^ x00, 8);
    x08 = x08 + x12 | 0;
    x04 = rotl(x04 ^ x08, 7);
    x01 = x01 + x05 | 0;
    x13 = rotl(x13 ^ x01, 16);
    x09 = x09 + x13 | 0;
    x05 = rotl(x05 ^ x09, 12);
    x01 = x01 + x05 | 0;
    x13 = rotl(x13 ^ x01, 8);
    x09 = x09 + x13 | 0;
    x05 = rotl(x05 ^ x09, 7);
    x02 = x02 + x06 | 0;
    x14 = rotl(x14 ^ x02, 16);
    x10 = x10 + x14 | 0;
    x06 = rotl(x06 ^ x10, 12);
    x02 = x02 + x06 | 0;
    x14 = rotl(x14 ^ x02, 8);
    x10 = x10 + x14 | 0;
    x06 = rotl(x06 ^ x10, 7);
    x03 = x03 + x07 | 0;
    x15 = rotl(x15 ^ x03, 16);
    x11 = x11 + x15 | 0;
    x07 = rotl(x07 ^ x11, 12);
    x03 = x03 + x07 | 0;
    x15 = rotl(x15 ^ x03, 8);
    x11 = x11 + x15 | 0;
    x07 = rotl(x07 ^ x11, 7);
    x00 = x00 + x05 | 0;
    x15 = rotl(x15 ^ x00, 16);
    x10 = x10 + x15 | 0;
    x05 = rotl(x05 ^ x10, 12);
    x00 = x00 + x05 | 0;
    x15 = rotl(x15 ^ x00, 8);
    x10 = x10 + x15 | 0;
    x05 = rotl(x05 ^ x10, 7);
    x01 = x01 + x06 | 0;
    x12 = rotl(x12 ^ x01, 16);
    x11 = x11 + x12 | 0;
    x06 = rotl(x06 ^ x11, 12);
    x01 = x01 + x06 | 0;
    x12 = rotl(x12 ^ x01, 8);
    x11 = x11 + x12 | 0;
    x06 = rotl(x06 ^ x11, 7);
    x02 = x02 + x07 | 0;
    x13 = rotl(x13 ^ x02, 16);
    x08 = x08 + x13 | 0;
    x07 = rotl(x07 ^ x08, 12);
    x02 = x02 + x07 | 0;
    x13 = rotl(x13 ^ x02, 8);
    x08 = x08 + x13 | 0;
    x07 = rotl(x07 ^ x08, 7);
    x03 = x03 + x04 | 0;
    x14 = rotl(x14 ^ x03, 16);
    x09 = x09 + x14 | 0;
    x04 = rotl(x04 ^ x09, 12);
    x03 = x03 + x04 | 0;
    x14 = rotl(x14 ^ x03, 8);
    x09 = x09 + x14 | 0;
    x04 = rotl(x04 ^ x09, 7);
  }
  let oi = 0;
  out[oi++] = y00 + x00 | 0;
  out[oi++] = y01 + x01 | 0;
  out[oi++] = y02 + x02 | 0;
  out[oi++] = y03 + x03 | 0;
  out[oi++] = y04 + x04 | 0;
  out[oi++] = y05 + x05 | 0;
  out[oi++] = y06 + x06 | 0;
  out[oi++] = y07 + x07 | 0;
  out[oi++] = y08 + x08 | 0;
  out[oi++] = y09 + x09 | 0;
  out[oi++] = y10 + x10 | 0;
  out[oi++] = y11 + x11 | 0;
  out[oi++] = y12 + x12 | 0;
  out[oi++] = y13 + x13 | 0;
  out[oi++] = y14 + x14 | 0;
  out[oi++] = y15 + x15 | 0;
}
function hchacha(s, k, i, o32) {
  let x00 = s[0], x01 = s[1], x02 = s[2], x03 = s[3], x04 = k[0], x05 = k[1], x06 = k[2], x07 = k[3], x08 = k[4], x09 = k[5], x10 = k[6], x11 = k[7], x12 = i[0], x13 = i[1], x14 = i[2], x15 = i[3];
  for (let r = 0; r < 20; r += 2) {
    x00 = x00 + x04 | 0;
    x12 = rotl(x12 ^ x00, 16);
    x08 = x08 + x12 | 0;
    x04 = rotl(x04 ^ x08, 12);
    x00 = x00 + x04 | 0;
    x12 = rotl(x12 ^ x00, 8);
    x08 = x08 + x12 | 0;
    x04 = rotl(x04 ^ x08, 7);
    x01 = x01 + x05 | 0;
    x13 = rotl(x13 ^ x01, 16);
    x09 = x09 + x13 | 0;
    x05 = rotl(x05 ^ x09, 12);
    x01 = x01 + x05 | 0;
    x13 = rotl(x13 ^ x01, 8);
    x09 = x09 + x13 | 0;
    x05 = rotl(x05 ^ x09, 7);
    x02 = x02 + x06 | 0;
    x14 = rotl(x14 ^ x02, 16);
    x10 = x10 + x14 | 0;
    x06 = rotl(x06 ^ x10, 12);
    x02 = x02 + x06 | 0;
    x14 = rotl(x14 ^ x02, 8);
    x10 = x10 + x14 | 0;
    x06 = rotl(x06 ^ x10, 7);
    x03 = x03 + x07 | 0;
    x15 = rotl(x15 ^ x03, 16);
    x11 = x11 + x15 | 0;
    x07 = rotl(x07 ^ x11, 12);
    x03 = x03 + x07 | 0;
    x15 = rotl(x15 ^ x03, 8);
    x11 = x11 + x15 | 0;
    x07 = rotl(x07 ^ x11, 7);
    x00 = x00 + x05 | 0;
    x15 = rotl(x15 ^ x00, 16);
    x10 = x10 + x15 | 0;
    x05 = rotl(x05 ^ x10, 12);
    x00 = x00 + x05 | 0;
    x15 = rotl(x15 ^ x00, 8);
    x10 = x10 + x15 | 0;
    x05 = rotl(x05 ^ x10, 7);
    x01 = x01 + x06 | 0;
    x12 = rotl(x12 ^ x01, 16);
    x11 = x11 + x12 | 0;
    x06 = rotl(x06 ^ x11, 12);
    x01 = x01 + x06 | 0;
    x12 = rotl(x12 ^ x01, 8);
    x11 = x11 + x12 | 0;
    x06 = rotl(x06 ^ x11, 7);
    x02 = x02 + x07 | 0;
    x13 = rotl(x13 ^ x02, 16);
    x08 = x08 + x13 | 0;
    x07 = rotl(x07 ^ x08, 12);
    x02 = x02 + x07 | 0;
    x13 = rotl(x13 ^ x02, 8);
    x08 = x08 + x13 | 0;
    x07 = rotl(x07 ^ x08, 7);
    x03 = x03 + x04 | 0;
    x14 = rotl(x14 ^ x03, 16);
    x09 = x09 + x14 | 0;
    x04 = rotl(x04 ^ x09, 12);
    x03 = x03 + x04 | 0;
    x14 = rotl(x14 ^ x03, 8);
    x09 = x09 + x14 | 0;
    x04 = rotl(x04 ^ x09, 7);
  }
  let oi = 0;
  o32[oi++] = x00;
  o32[oi++] = x01;
  o32[oi++] = x02;
  o32[oi++] = x03;
  o32[oi++] = x12;
  o32[oi++] = x13;
  o32[oi++] = x14;
  o32[oi++] = x15;
}
function computeTag(fn, key, nonce, data, AAD) {
  const authKey = fn(key, nonce, ZEROS32);
  const h = poly1305.create(authKey);
  if (AAD)
    updatePadded(h, AAD);
  updatePadded(h, data);
  const num = u64Lengths(data.length, AAD ? AAD.length : 0, true);
  h.update(num);
  const res = h.digest();
  clean(authKey, num);
  return res;
}
var chacha20, xchacha20, ZEROS16, updatePadded, ZEROS32, _poly1305_aead, chacha20poly1305, xchacha20poly1305;
var init_chacha = __esm({
  "../sdk/node_modules/@noble/ciphers/esm/chacha.js"() {
    init_arx();
    init_poly1305();
    init_utils();
    chacha20 = /* @__PURE__ */ createCipher(chachaCore, {
      counterRight: false,
      counterLength: 4,
      allowShortKeys: false
    });
    xchacha20 = /* @__PURE__ */ createCipher(chachaCore, {
      counterRight: false,
      counterLength: 8,
      extendNonceFn: hchacha,
      allowShortKeys: false
    });
    ZEROS16 = /* @__PURE__ */ new Uint8Array(16);
    updatePadded = (h, msg) => {
      h.update(msg);
      const left = msg.length % 16;
      if (left)
        h.update(ZEROS16.subarray(left));
    };
    ZEROS32 = /* @__PURE__ */ new Uint8Array(32);
    _poly1305_aead = (xorStream) => (key, nonce, AAD) => {
      const tagLength = 16;
      return {
        encrypt(plaintext, output2) {
          const plength = plaintext.length;
          output2 = getOutput(plength + tagLength, output2, false);
          output2.set(plaintext);
          const oPlain = output2.subarray(0, -tagLength);
          xorStream(key, nonce, oPlain, oPlain, 1);
          const tag = computeTag(xorStream, key, nonce, oPlain, AAD);
          output2.set(tag, plength);
          clean(tag);
          return output2;
        },
        decrypt(ciphertext, output2) {
          output2 = getOutput(ciphertext.length - tagLength, output2, false);
          const data = ciphertext.subarray(0, -tagLength);
          const passedTag = ciphertext.subarray(-tagLength);
          const tag = computeTag(xorStream, key, nonce, data, AAD);
          if (!equalBytes(passedTag, tag))
            throw new Error("invalid tag");
          output2.set(ciphertext.subarray(0, -tagLength));
          xorStream(key, nonce, output2, output2, 1);
          clean(tag);
          return output2;
        }
      };
    };
    chacha20poly1305 = /* @__PURE__ */ wrapCipher({ blockSize: 64, nonceLength: 12, tagLength: 16 }, _poly1305_aead(chacha20));
    xchacha20poly1305 = /* @__PURE__ */ wrapCipher({ blockSize: 64, nonceLength: 24, tagLength: 16 }, _poly1305_aead(xchacha20));
  }
});

// ../sdk/node_modules/@noble/hashes/esm/utils.js
function isBytes3(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array";
}
function anumber2(n) {
  if (!Number.isSafeInteger(n) || n < 0)
    throw new Error("positive integer expected, got " + n);
}
function abytes2(b, ...lengths) {
  if (!isBytes3(b))
    throw new Error("Uint8Array expected");
  if (lengths.length > 0 && !lengths.includes(b.length))
    throw new Error("Uint8Array expected of length " + lengths + ", got length=" + b.length);
}
function aexists2(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("Hash instance has been destroyed");
  if (checkFinished && instance.finished)
    throw new Error("Hash#digest() has already been called");
}
function aoutput2(out, instance) {
  abytes2(out);
  const min = instance.outputLen;
  if (out.length < min) {
    throw new Error("digestInto() expects output buffer of length at least " + min);
  }
}
function u323(arr) {
  return new Uint32Array(arr.buffer, arr.byteOffset, Math.floor(arr.byteLength / 4));
}
function clean2(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function byteSwap2(word) {
  return word << 24 & 4278190080 | word << 8 & 16711680 | word >>> 8 & 65280 | word >>> 24 & 255;
}
function byteSwap322(arr) {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = byteSwap2(arr[i]);
  }
  return arr;
}
function utf8ToBytes3(str) {
  if (typeof str !== "string")
    throw new Error("string expected");
  return new Uint8Array(new TextEncoder().encode(str));
}
function toBytes3(data) {
  if (typeof data === "string")
    data = utf8ToBytes3(data);
  abytes2(data);
  return data;
}
function createOptHasher(hashCons) {
  const hashC = (msg, opts) => hashCons(opts).update(toBytes3(msg)).digest();
  const tmp = hashCons({});
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.create = (opts) => hashCons(opts);
  return hashC;
}
var isLE3, swap8IfBE, swap32IfBE, Hash3;
var init_utils2 = __esm({
  "../sdk/node_modules/@noble/hashes/esm/utils.js"() {
    isLE3 = /* @__PURE__ */ (() => new Uint8Array(new Uint32Array([287454020]).buffer)[0] === 68)();
    swap8IfBE = isLE3 ? (n) => n : (n) => byteSwap2(n);
    swap32IfBE = isLE3 ? (u) => u : byteSwap322;
    Hash3 = class {
    };
  }
});

// ../sdk/node_modules/@noble/hashes/esm/_blake.js
var BSIGMA;
var init_blake = __esm({
  "../sdk/node_modules/@noble/hashes/esm/_blake.js"() {
    BSIGMA = /* @__PURE__ */ Uint8Array.from([
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      14,
      10,
      4,
      8,
      9,
      15,
      13,
      6,
      1,
      12,
      0,
      2,
      11,
      7,
      5,
      3,
      11,
      8,
      12,
      0,
      5,
      2,
      15,
      13,
      10,
      14,
      3,
      6,
      7,
      1,
      9,
      4,
      7,
      9,
      3,
      1,
      13,
      12,
      11,
      14,
      2,
      6,
      5,
      10,
      4,
      0,
      15,
      8,
      9,
      0,
      5,
      7,
      2,
      4,
      10,
      15,
      14,
      1,
      11,
      12,
      6,
      8,
      3,
      13,
      2,
      12,
      6,
      10,
      0,
      11,
      8,
      3,
      4,
      13,
      7,
      5,
      15,
      14,
      1,
      9,
      12,
      5,
      1,
      15,
      14,
      13,
      4,
      10,
      0,
      7,
      6,
      3,
      9,
      2,
      8,
      11,
      13,
      11,
      7,
      14,
      12,
      1,
      3,
      9,
      5,
      0,
      15,
      4,
      8,
      6,
      2,
      10,
      6,
      15,
      14,
      9,
      11,
      3,
      0,
      8,
      12,
      2,
      13,
      7,
      1,
      4,
      10,
      5,
      10,
      2,
      8,
      4,
      7,
      6,
      1,
      5,
      15,
      11,
      9,
      14,
      3,
      12,
      13,
      0,
      0,
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      8,
      9,
      10,
      11,
      12,
      13,
      14,
      15,
      14,
      10,
      4,
      8,
      9,
      15,
      13,
      6,
      1,
      12,
      0,
      2,
      11,
      7,
      5,
      3,
      // Blake1, unused in others
      11,
      8,
      12,
      0,
      5,
      2,
      15,
      13,
      10,
      14,
      3,
      6,
      7,
      1,
      9,
      4,
      7,
      9,
      3,
      1,
      13,
      12,
      11,
      14,
      2,
      6,
      5,
      10,
      4,
      0,
      15,
      8,
      9,
      0,
      5,
      7,
      2,
      4,
      10,
      15,
      14,
      1,
      11,
      12,
      6,
      8,
      3,
      13,
      2,
      12,
      6,
      10,
      0,
      11,
      8,
      3,
      4,
      13,
      7,
      5,
      15,
      14,
      1,
      9
    ]);
  }
});

// ../sdk/node_modules/@noble/hashes/esm/_u64.js
function fromBig2(n, le = false) {
  if (le)
    return { h: Number(n & U32_MASK642), l: Number(n >> _32n2 & U32_MASK642) };
  return { h: Number(n >> _32n2 & U32_MASK642) | 0, l: Number(n & U32_MASK642) | 0 };
}
function add2(Ah, Al, Bh, Bl) {
  const l = (Al >>> 0) + (Bl >>> 0);
  return { h: Ah + Bh + (l / 2 ** 32 | 0) | 0, l: l | 0 };
}
var U32_MASK642, _32n2, rotrSH, rotrSL, rotrBH, rotrBL, rotr32H, rotr32L, add3L, add3H;
var init_u64 = __esm({
  "../sdk/node_modules/@noble/hashes/esm/_u64.js"() {
    U32_MASK642 = /* @__PURE__ */ BigInt(2 ** 32 - 1);
    _32n2 = /* @__PURE__ */ BigInt(32);
    rotrSH = (h, l, s) => h >>> s | l << 32 - s;
    rotrSL = (h, l, s) => h << 32 - s | l >>> s;
    rotrBH = (h, l, s) => h << 64 - s | l >>> s - 32;
    rotrBL = (h, l, s) => h >>> s - 32 | l << 64 - s;
    rotr32H = (_h, l) => l;
    rotr32L = (h, _l) => h;
    add3L = (Al, Bl, Cl) => (Al >>> 0) + (Bl >>> 0) + (Cl >>> 0);
    add3H = (low, Ah, Bh, Ch) => Ah + Bh + Ch + (low / 2 ** 32 | 0) | 0;
  }
});

// ../sdk/node_modules/@noble/hashes/esm/blake2.js
function G1b(a, b, c, d, msg, x) {
  const Xl = msg[x], Xh = msg[x + 1];
  let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1];
  let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
  let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1];
  let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1];
  let ll = add3L(Al, Bl, Xl);
  Ah = add3H(ll, Ah, Bh, Xh);
  Al = ll | 0;
  ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
  ({ Dh, Dl } = { Dh: rotr32H(Dh, Dl), Dl: rotr32L(Dh, Dl) });
  ({ h: Ch, l: Cl } = add2(Ch, Cl, Dh, Dl));
  ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
  ({ Bh, Bl } = { Bh: rotrSH(Bh, Bl, 24), Bl: rotrSL(Bh, Bl, 24) });
  BBUF[2 * a] = Al, BBUF[2 * a + 1] = Ah;
  BBUF[2 * b] = Bl, BBUF[2 * b + 1] = Bh;
  BBUF[2 * c] = Cl, BBUF[2 * c + 1] = Ch;
  BBUF[2 * d] = Dl, BBUF[2 * d + 1] = Dh;
}
function G2b(a, b, c, d, msg, x) {
  const Xl = msg[x], Xh = msg[x + 1];
  let Al = BBUF[2 * a], Ah = BBUF[2 * a + 1];
  let Bl = BBUF[2 * b], Bh = BBUF[2 * b + 1];
  let Cl = BBUF[2 * c], Ch = BBUF[2 * c + 1];
  let Dl = BBUF[2 * d], Dh = BBUF[2 * d + 1];
  let ll = add3L(Al, Bl, Xl);
  Ah = add3H(ll, Ah, Bh, Xh);
  Al = ll | 0;
  ({ Dh, Dl } = { Dh: Dh ^ Ah, Dl: Dl ^ Al });
  ({ Dh, Dl } = { Dh: rotrSH(Dh, Dl, 16), Dl: rotrSL(Dh, Dl, 16) });
  ({ h: Ch, l: Cl } = add2(Ch, Cl, Dh, Dl));
  ({ Bh, Bl } = { Bh: Bh ^ Ch, Bl: Bl ^ Cl });
  ({ Bh, Bl } = { Bh: rotrBH(Bh, Bl, 63), Bl: rotrBL(Bh, Bl, 63) });
  BBUF[2 * a] = Al, BBUF[2 * a + 1] = Ah;
  BBUF[2 * b] = Bl, BBUF[2 * b + 1] = Bh;
  BBUF[2 * c] = Cl, BBUF[2 * c + 1] = Ch;
  BBUF[2 * d] = Dl, BBUF[2 * d + 1] = Dh;
}
function checkBlake2Opts(outputLen, opts = {}, keyLen, saltLen, persLen) {
  anumber2(keyLen);
  if (outputLen < 0 || outputLen > keyLen)
    throw new Error("outputLen bigger than keyLen");
  const { key, salt, personalization } = opts;
  if (key !== void 0 && (key.length < 1 || key.length > keyLen))
    throw new Error("key length must be undefined or 1.." + keyLen);
  if (salt !== void 0 && salt.length !== saltLen)
    throw new Error("salt must be undefined or " + saltLen);
  if (personalization !== void 0 && personalization.length !== persLen)
    throw new Error("personalization must be undefined or " + persLen);
}
var B2B_IV, BBUF, BLAKE2, BLAKE2b, blake2b;
var init_blake2 = __esm({
  "../sdk/node_modules/@noble/hashes/esm/blake2.js"() {
    init_blake();
    init_u64();
    init_utils2();
    B2B_IV = /* @__PURE__ */ Uint32Array.from([
      4089235720,
      1779033703,
      2227873595,
      3144134277,
      4271175723,
      1013904242,
      1595750129,
      2773480762,
      2917565137,
      1359893119,
      725511199,
      2600822924,
      4215389547,
      528734635,
      327033209,
      1541459225
    ]);
    BBUF = /* @__PURE__ */ new Uint32Array(32);
    BLAKE2 = class extends Hash3 {
      constructor(blockLen, outputLen) {
        super();
        this.finished = false;
        this.destroyed = false;
        this.length = 0;
        this.pos = 0;
        anumber2(blockLen);
        anumber2(outputLen);
        this.blockLen = blockLen;
        this.outputLen = outputLen;
        this.buffer = new Uint8Array(blockLen);
        this.buffer32 = u323(this.buffer);
      }
      update(data) {
        aexists2(this);
        data = toBytes3(data);
        abytes2(data);
        const { blockLen, buffer, buffer32 } = this;
        const len = data.length;
        const offset = data.byteOffset;
        const buf = data.buffer;
        for (let pos = 0; pos < len; ) {
          if (this.pos === blockLen) {
            swap32IfBE(buffer32);
            this.compress(buffer32, 0, false);
            swap32IfBE(buffer32);
            this.pos = 0;
          }
          const take = Math.min(blockLen - this.pos, len - pos);
          const dataOffset = offset + pos;
          if (take === blockLen && !(dataOffset % 4) && pos + take < len) {
            const data32 = new Uint32Array(buf, dataOffset, Math.floor((len - pos) / 4));
            swap32IfBE(data32);
            for (let pos32 = 0; pos + blockLen < len; pos32 += buffer32.length, pos += blockLen) {
              this.length += blockLen;
              this.compress(data32, pos32, false);
            }
            swap32IfBE(data32);
            continue;
          }
          buffer.set(data.subarray(pos, pos + take), this.pos);
          this.pos += take;
          this.length += take;
          pos += take;
        }
        return this;
      }
      digestInto(out) {
        aexists2(this);
        aoutput2(out, this);
        const { pos, buffer32 } = this;
        this.finished = true;
        clean2(this.buffer.subarray(pos));
        swap32IfBE(buffer32);
        this.compress(buffer32, 0, true);
        swap32IfBE(buffer32);
        const out32 = u323(out);
        this.get().forEach((v, i) => out32[i] = swap8IfBE(v));
      }
      digest() {
        const { buffer, outputLen } = this;
        this.digestInto(buffer);
        const res = buffer.slice(0, outputLen);
        this.destroy();
        return res;
      }
      _cloneInto(to) {
        const { buffer, length, finished, destroyed, outputLen, pos } = this;
        to || (to = new this.constructor({ dkLen: outputLen }));
        to.set(...this.get());
        to.buffer.set(buffer);
        to.destroyed = destroyed;
        to.finished = finished;
        to.length = length;
        to.pos = pos;
        to.outputLen = outputLen;
        return to;
      }
      clone() {
        return this._cloneInto();
      }
    };
    BLAKE2b = class extends BLAKE2 {
      constructor(opts = {}) {
        const olen = opts.dkLen === void 0 ? 64 : opts.dkLen;
        super(128, olen);
        this.v0l = B2B_IV[0] | 0;
        this.v0h = B2B_IV[1] | 0;
        this.v1l = B2B_IV[2] | 0;
        this.v1h = B2B_IV[3] | 0;
        this.v2l = B2B_IV[4] | 0;
        this.v2h = B2B_IV[5] | 0;
        this.v3l = B2B_IV[6] | 0;
        this.v3h = B2B_IV[7] | 0;
        this.v4l = B2B_IV[8] | 0;
        this.v4h = B2B_IV[9] | 0;
        this.v5l = B2B_IV[10] | 0;
        this.v5h = B2B_IV[11] | 0;
        this.v6l = B2B_IV[12] | 0;
        this.v6h = B2B_IV[13] | 0;
        this.v7l = B2B_IV[14] | 0;
        this.v7h = B2B_IV[15] | 0;
        checkBlake2Opts(olen, opts, 64, 16, 16);
        let { key, personalization, salt } = opts;
        let keyLength = 0;
        if (key !== void 0) {
          key = toBytes3(key);
          keyLength = key.length;
        }
        this.v0l ^= this.outputLen | keyLength << 8 | 1 << 16 | 1 << 24;
        if (salt !== void 0) {
          salt = toBytes3(salt);
          const slt = u323(salt);
          this.v4l ^= swap8IfBE(slt[0]);
          this.v4h ^= swap8IfBE(slt[1]);
          this.v5l ^= swap8IfBE(slt[2]);
          this.v5h ^= swap8IfBE(slt[3]);
        }
        if (personalization !== void 0) {
          personalization = toBytes3(personalization);
          const pers = u323(personalization);
          this.v6l ^= swap8IfBE(pers[0]);
          this.v6h ^= swap8IfBE(pers[1]);
          this.v7l ^= swap8IfBE(pers[2]);
          this.v7h ^= swap8IfBE(pers[3]);
        }
        if (key !== void 0) {
          const tmp = new Uint8Array(this.blockLen);
          tmp.set(key);
          this.update(tmp);
        }
      }
      // prettier-ignore
      get() {
        let { v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h } = this;
        return [v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h];
      }
      // prettier-ignore
      set(v0l, v0h, v1l, v1h, v2l, v2h, v3l, v3h, v4l, v4h, v5l, v5h, v6l, v6h, v7l, v7h) {
        this.v0l = v0l | 0;
        this.v0h = v0h | 0;
        this.v1l = v1l | 0;
        this.v1h = v1h | 0;
        this.v2l = v2l | 0;
        this.v2h = v2h | 0;
        this.v3l = v3l | 0;
        this.v3h = v3h | 0;
        this.v4l = v4l | 0;
        this.v4h = v4h | 0;
        this.v5l = v5l | 0;
        this.v5h = v5h | 0;
        this.v6l = v6l | 0;
        this.v6h = v6h | 0;
        this.v7l = v7l | 0;
        this.v7h = v7h | 0;
      }
      compress(msg, offset, isLast) {
        this.get().forEach((v, i) => BBUF[i] = v);
        BBUF.set(B2B_IV, 16);
        let { h, l } = fromBig2(BigInt(this.length));
        BBUF[24] = B2B_IV[8] ^ l;
        BBUF[25] = B2B_IV[9] ^ h;
        if (isLast) {
          BBUF[28] = ~BBUF[28];
          BBUF[29] = ~BBUF[29];
        }
        let j = 0;
        const s = BSIGMA;
        for (let i = 0; i < 12; i++) {
          G1b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
          G2b(0, 4, 8, 12, msg, offset + 2 * s[j++]);
          G1b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
          G2b(1, 5, 9, 13, msg, offset + 2 * s[j++]);
          G1b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
          G2b(2, 6, 10, 14, msg, offset + 2 * s[j++]);
          G1b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
          G2b(3, 7, 11, 15, msg, offset + 2 * s[j++]);
          G1b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
          G2b(0, 5, 10, 15, msg, offset + 2 * s[j++]);
          G1b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
          G2b(1, 6, 11, 12, msg, offset + 2 * s[j++]);
          G1b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
          G2b(2, 7, 8, 13, msg, offset + 2 * s[j++]);
          G1b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
          G2b(3, 4, 9, 14, msg, offset + 2 * s[j++]);
        }
        this.v0l ^= BBUF[0] ^ BBUF[16];
        this.v0h ^= BBUF[1] ^ BBUF[17];
        this.v1l ^= BBUF[2] ^ BBUF[18];
        this.v1h ^= BBUF[3] ^ BBUF[19];
        this.v2l ^= BBUF[4] ^ BBUF[20];
        this.v2h ^= BBUF[5] ^ BBUF[21];
        this.v3l ^= BBUF[6] ^ BBUF[22];
        this.v3h ^= BBUF[7] ^ BBUF[23];
        this.v4l ^= BBUF[8] ^ BBUF[24];
        this.v4h ^= BBUF[9] ^ BBUF[25];
        this.v5l ^= BBUF[10] ^ BBUF[26];
        this.v5h ^= BBUF[11] ^ BBUF[27];
        this.v6l ^= BBUF[12] ^ BBUF[28];
        this.v6h ^= BBUF[13] ^ BBUF[29];
        this.v7l ^= BBUF[14] ^ BBUF[30];
        this.v7h ^= BBUF[15] ^ BBUF[31];
        clean2(BBUF);
      }
      destroy() {
        this.destroyed = true;
        clean2(this.buffer32);
        this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      }
    };
    blake2b = /* @__PURE__ */ createOptHasher((opts) => new BLAKE2b(opts));
  }
});

// ../sdk/dist/note-encrypt.js
function encryptNote({ J, recipientPkD, esk, plaintext }) {
  const eskMod = esk % BABYJUB_SUBGROUP_ORDER;
  if (eskMod === 0n)
    throw new Error("esk must be non-zero mod q");
  const epk = J.mulPointEscalar(J.base8, eskMod);
  const shared = J.mulPointEscalar(recipientPkD, eskMod);
  if (!J.inSubgroup(shared))
    throw new Error("shared not in subgroup");
  const epkPacked = J.packPoint(epk);
  const key = noteKey(epkPacked, J.packPoint(shared));
  const ciphertext = chacha20poly1305(key, ZERO_NONCE).encrypt(plaintext);
  return { epk: epkPacked, ciphertext };
}
function decryptNote({ J, ivk, note }) {
  if (J instanceof WasmJubjub) {
    return J.tryDecryptNote(ivk, note.epk, note.ciphertext);
  }
  const epk = J.unpackPoint(note.epk);
  if (!epk || !J.inSubgroup(epk))
    return null;
  const shared = J.mulPointEscalar(epk, ivk % BABYJUB_SUBGROUP_ORDER);
  const key = noteKey(note.epk, J.packPoint(shared));
  try {
    return chacha20poly1305(key, ZERO_NONCE).decrypt(note.ciphertext);
  } catch {
    return null;
  }
}
function noteKey(epkPacked, sharedPacked) {
  const h = blake2b.create({ dkLen: 32 });
  h.update(KDF_DOMAIN);
  h.update(epkPacked);
  h.update(sharedPacked);
  return h.digest();
}
var KDF_DOMAIN, ZERO_NONCE;
var init_note_encrypt = __esm({
  "../sdk/dist/note-encrypt.js"() {
    "use strict";
    init_chacha();
    init_blake2();
    init_crypto();
    init_jubjub_wasm2();
    KDF_DOMAIN = new TextEncoder().encode("lelantos.note.kdf.v1");
    ZERO_NONCE = new Uint8Array(12);
  }
});

// ../sdk/dist/note-codec.js
function encodeNotePayload(p) {
  const out = new Uint8Array(NOTE_PLAINTEXT_BYTES);
  out.set(toLeBytes(p.asset, NOTE_ASSET_BYTES), 0);
  out.set(toLeBytes(p.value, NOTE_VALUE_BYTES), NOTE_ASSET_BYTES);
  out.set(toLeBytes(p.rho, NOTE_RHO_BYTES), NOTE_ASSET_BYTES + NOTE_VALUE_BYTES);
  out.set(toLeBytes(p.rcm, NOTE_RCM_BYTES), NOTE_ASSET_BYTES + NOTE_VALUE_BYTES + NOTE_RHO_BYTES);
  return out;
}
function decodeNotePayload(buf) {
  if (buf.length !== NOTE_PLAINTEXT_BYTES) {
    throw new Error(`note plaintext: expected ${NOTE_PLAINTEXT_BYTES}B, got ${buf.length}`);
  }
  const a = NOTE_ASSET_BYTES;
  const v = a + NOTE_VALUE_BYTES;
  const r = v + NOTE_RHO_BYTES;
  return {
    asset: fromLeBytes(buf.slice(0, a)),
    value: fromLeBytes(buf.slice(a, v)),
    rho: fromLeBytes(buf.slice(v, r)),
    rcm: fromLeBytes(buf.slice(r, r + NOTE_RCM_BYTES))
  };
}
function withClueBitsPrefix(prefix, body) {
  if (prefix.length !== CLUE_BITS_PREFIX_BYTES) {
    throw new Error(`clue prefix must be ${CLUE_BITS_PREFIX_BYTES}B`);
  }
  const out = new Uint8Array(prefix.length + body.length);
  out.set(prefix, 0);
  out.set(body, prefix.length);
  return out;
}
function stripClueBitsPrefix(wire) {
  if (wire.length < CLUE_BITS_PREFIX_BYTES) {
    throw new Error("ciphertext shorter than clue prefix");
  }
  return {
    prefix: wire.slice(0, CLUE_BITS_PREFIX_BYTES),
    body: wire.slice(CLUE_BITS_PREFIX_BYTES)
  };
}
function clueBitsToPrefix(bits2, gamma) {
  let acc = 0;
  for (let i = 0; i < gamma; i++) {
    const b = bits2[i >> 3] >> (i & 7) & 1;
    if (b)
      acc |= 1 << i;
  }
  const out = new Uint8Array(CLUE_BITS_PREFIX_BYTES);
  out[0] = acc >> 8 & 255;
  out[1] = acc & 255;
  return out;
}
var NOTE_ASSET_BYTES, NOTE_VALUE_BYTES, NOTE_RHO_BYTES, NOTE_RCM_BYTES, NOTE_PLAINTEXT_BYTES, CLUE_BITS_PREFIX_BYTES;
var init_note_codec = __esm({
  "../sdk/dist/note-codec.js"() {
    "use strict";
    init_crypto();
    NOTE_ASSET_BYTES = 8;
    NOTE_VALUE_BYTES = 8;
    NOTE_RHO_BYTES = FIELD_BYTES;
    NOTE_RCM_BYTES = FIELD_BYTES;
    NOTE_PLAINTEXT_BYTES = NOTE_ASSET_BYTES + NOTE_VALUE_BYTES + NOTE_RHO_BYTES + NOTE_RCM_BYTES;
    CLUE_BITS_PREFIX_BYTES = 2;
  }
});

// ../sdk/dist/aux.js
var ON_CURVE_IDENTITY, EMPTY_AUX;
var init_aux = __esm({
  "../sdk/dist/aux.js"() {
    "use strict";
    init_crypto();
    init_fmd();
    init_note_encrypt();
    init_note_codec();
    ON_CURVE_IDENTITY = [0n, 1n];
    EMPTY_AUX = {
      clueR: ON_CURVE_IDENTITY,
      ephPub: ON_CURVE_IDENTITY,
      ciphertext: new Uint8Array([0, 0])
    };
  }
});

// ../sdk/dist/wallet/randomness.js
var init_randomness = __esm({
  "../sdk/dist/wallet/randomness.js"() {
    "use strict";
    init_crypto();
  }
});

// ../sdk/dist/bundle.js
var init_bundle = __esm({
  "../sdk/dist/bundle.js"() {
    "use strict";
    init_crypto();
    init_witness();
    init_snark_compression();
    init_prover();
    init_aux();
    init_randomness();
  }
});

// ../sdk/node_modules/@scure/bip39/esm/index.js
var init_esm = __esm({
  "../sdk/node_modules/@scure/bip39/esm/index.js"() {
  }
});

// ../sdk/node_modules/@scure/bip39/esm/wordlists/english.js
var wordlist;
var init_english = __esm({
  "../sdk/node_modules/@scure/bip39/esm/wordlists/english.js"() {
    wordlist = `abandon
ability
able
about
above
absent
absorb
abstract
absurd
abuse
access
accident
account
accuse
achieve
acid
acoustic
acquire
across
act
action
actor
actress
actual
adapt
add
addict
address
adjust
admit
adult
advance
advice
aerobic
affair
afford
afraid
again
age
agent
agree
ahead
aim
air
airport
aisle
alarm
album
alcohol
alert
alien
all
alley
allow
almost
alone
alpha
already
also
alter
always
amateur
amazing
among
amount
amused
analyst
anchor
ancient
anger
angle
angry
animal
ankle
announce
annual
another
answer
antenna
antique
anxiety
any
apart
apology
appear
apple
approve
april
arch
arctic
area
arena
argue
arm
armed
armor
army
around
arrange
arrest
arrive
arrow
art
artefact
artist
artwork
ask
aspect
assault
asset
assist
assume
asthma
athlete
atom
attack
attend
attitude
attract
auction
audit
august
aunt
author
auto
autumn
average
avocado
avoid
awake
aware
away
awesome
awful
awkward
axis
baby
bachelor
bacon
badge
bag
balance
balcony
ball
bamboo
banana
banner
bar
barely
bargain
barrel
base
basic
basket
battle
beach
bean
beauty
because
become
beef
before
begin
behave
behind
believe
below
belt
bench
benefit
best
betray
better
between
beyond
bicycle
bid
bike
bind
biology
bird
birth
bitter
black
blade
blame
blanket
blast
bleak
bless
blind
blood
blossom
blouse
blue
blur
blush
board
boat
body
boil
bomb
bone
bonus
book
boost
border
boring
borrow
boss
bottom
bounce
box
boy
bracket
brain
brand
brass
brave
bread
breeze
brick
bridge
brief
bright
bring
brisk
broccoli
broken
bronze
broom
brother
brown
brush
bubble
buddy
budget
buffalo
build
bulb
bulk
bullet
bundle
bunker
burden
burger
burst
bus
business
busy
butter
buyer
buzz
cabbage
cabin
cable
cactus
cage
cake
call
calm
camera
camp
can
canal
cancel
candy
cannon
canoe
canvas
canyon
capable
capital
captain
car
carbon
card
cargo
carpet
carry
cart
case
cash
casino
castle
casual
cat
catalog
catch
category
cattle
caught
cause
caution
cave
ceiling
celery
cement
census
century
cereal
certain
chair
chalk
champion
change
chaos
chapter
charge
chase
chat
cheap
check
cheese
chef
cherry
chest
chicken
chief
child
chimney
choice
choose
chronic
chuckle
chunk
churn
cigar
cinnamon
circle
citizen
city
civil
claim
clap
clarify
claw
clay
clean
clerk
clever
click
client
cliff
climb
clinic
clip
clock
clog
close
cloth
cloud
clown
club
clump
cluster
clutch
coach
coast
coconut
code
coffee
coil
coin
collect
color
column
combine
come
comfort
comic
common
company
concert
conduct
confirm
congress
connect
consider
control
convince
cook
cool
copper
copy
coral
core
corn
correct
cost
cotton
couch
country
couple
course
cousin
cover
coyote
crack
cradle
craft
cram
crane
crash
crater
crawl
crazy
cream
credit
creek
crew
cricket
crime
crisp
critic
crop
cross
crouch
crowd
crucial
cruel
cruise
crumble
crunch
crush
cry
crystal
cube
culture
cup
cupboard
curious
current
curtain
curve
cushion
custom
cute
cycle
dad
damage
damp
dance
danger
daring
dash
daughter
dawn
day
deal
debate
debris
decade
december
decide
decline
decorate
decrease
deer
defense
define
defy
degree
delay
deliver
demand
demise
denial
dentist
deny
depart
depend
deposit
depth
deputy
derive
describe
desert
design
desk
despair
destroy
detail
detect
develop
device
devote
diagram
dial
diamond
diary
dice
diesel
diet
differ
digital
dignity
dilemma
dinner
dinosaur
direct
dirt
disagree
discover
disease
dish
dismiss
disorder
display
distance
divert
divide
divorce
dizzy
doctor
document
dog
doll
dolphin
domain
donate
donkey
donor
door
dose
double
dove
draft
dragon
drama
drastic
draw
dream
dress
drift
drill
drink
drip
drive
drop
drum
dry
duck
dumb
dune
during
dust
dutch
duty
dwarf
dynamic
eager
eagle
early
earn
earth
easily
east
easy
echo
ecology
economy
edge
edit
educate
effort
egg
eight
either
elbow
elder
electric
elegant
element
elephant
elevator
elite
else
embark
embody
embrace
emerge
emotion
employ
empower
empty
enable
enact
end
endless
endorse
enemy
energy
enforce
engage
engine
enhance
enjoy
enlist
enough
enrich
enroll
ensure
enter
entire
entry
envelope
episode
equal
equip
era
erase
erode
erosion
error
erupt
escape
essay
essence
estate
eternal
ethics
evidence
evil
evoke
evolve
exact
example
excess
exchange
excite
exclude
excuse
execute
exercise
exhaust
exhibit
exile
exist
exit
exotic
expand
expect
expire
explain
expose
express
extend
extra
eye
eyebrow
fabric
face
faculty
fade
faint
faith
fall
false
fame
family
famous
fan
fancy
fantasy
farm
fashion
fat
fatal
father
fatigue
fault
favorite
feature
february
federal
fee
feed
feel
female
fence
festival
fetch
fever
few
fiber
fiction
field
figure
file
film
filter
final
find
fine
finger
finish
fire
firm
first
fiscal
fish
fit
fitness
fix
flag
flame
flash
flat
flavor
flee
flight
flip
float
flock
floor
flower
fluid
flush
fly
foam
focus
fog
foil
fold
follow
food
foot
force
forest
forget
fork
fortune
forum
forward
fossil
foster
found
fox
fragile
frame
frequent
fresh
friend
fringe
frog
front
frost
frown
frozen
fruit
fuel
fun
funny
furnace
fury
future
gadget
gain
galaxy
gallery
game
gap
garage
garbage
garden
garlic
garment
gas
gasp
gate
gather
gauge
gaze
general
genius
genre
gentle
genuine
gesture
ghost
giant
gift
giggle
ginger
giraffe
girl
give
glad
glance
glare
glass
glide
glimpse
globe
gloom
glory
glove
glow
glue
goat
goddess
gold
good
goose
gorilla
gospel
gossip
govern
gown
grab
grace
grain
grant
grape
grass
gravity
great
green
grid
grief
grit
grocery
group
grow
grunt
guard
guess
guide
guilt
guitar
gun
gym
habit
hair
half
hammer
hamster
hand
happy
harbor
hard
harsh
harvest
hat
have
hawk
hazard
head
health
heart
heavy
hedgehog
height
hello
helmet
help
hen
hero
hidden
high
hill
hint
hip
hire
history
hobby
hockey
hold
hole
holiday
hollow
home
honey
hood
hope
horn
horror
horse
hospital
host
hotel
hour
hover
hub
huge
human
humble
humor
hundred
hungry
hunt
hurdle
hurry
hurt
husband
hybrid
ice
icon
idea
identify
idle
ignore
ill
illegal
illness
image
imitate
immense
immune
impact
impose
improve
impulse
inch
include
income
increase
index
indicate
indoor
industry
infant
inflict
inform
inhale
inherit
initial
inject
injury
inmate
inner
innocent
input
inquiry
insane
insect
inside
inspire
install
intact
interest
into
invest
invite
involve
iron
island
isolate
issue
item
ivory
jacket
jaguar
jar
jazz
jealous
jeans
jelly
jewel
job
join
joke
journey
joy
judge
juice
jump
jungle
junior
junk
just
kangaroo
keen
keep
ketchup
key
kick
kid
kidney
kind
kingdom
kiss
kit
kitchen
kite
kitten
kiwi
knee
knife
knock
know
lab
label
labor
ladder
lady
lake
lamp
language
laptop
large
later
latin
laugh
laundry
lava
law
lawn
lawsuit
layer
lazy
leader
leaf
learn
leave
lecture
left
leg
legal
legend
leisure
lemon
lend
length
lens
leopard
lesson
letter
level
liar
liberty
library
license
life
lift
light
like
limb
limit
link
lion
liquid
list
little
live
lizard
load
loan
lobster
local
lock
logic
lonely
long
loop
lottery
loud
lounge
love
loyal
lucky
luggage
lumber
lunar
lunch
luxury
lyrics
machine
mad
magic
magnet
maid
mail
main
major
make
mammal
man
manage
mandate
mango
mansion
manual
maple
marble
march
margin
marine
market
marriage
mask
mass
master
match
material
math
matrix
matter
maximum
maze
meadow
mean
measure
meat
mechanic
medal
media
melody
melt
member
memory
mention
menu
mercy
merge
merit
merry
mesh
message
metal
method
middle
midnight
milk
million
mimic
mind
minimum
minor
minute
miracle
mirror
misery
miss
mistake
mix
mixed
mixture
mobile
model
modify
mom
moment
monitor
monkey
monster
month
moon
moral
more
morning
mosquito
mother
motion
motor
mountain
mouse
move
movie
much
muffin
mule
multiply
muscle
museum
mushroom
music
must
mutual
myself
mystery
myth
naive
name
napkin
narrow
nasty
nation
nature
near
neck
need
negative
neglect
neither
nephew
nerve
nest
net
network
neutral
never
news
next
nice
night
noble
noise
nominee
noodle
normal
north
nose
notable
note
nothing
notice
novel
now
nuclear
number
nurse
nut
oak
obey
object
oblige
obscure
observe
obtain
obvious
occur
ocean
october
odor
off
offer
office
often
oil
okay
old
olive
olympic
omit
once
one
onion
online
only
open
opera
opinion
oppose
option
orange
orbit
orchard
order
ordinary
organ
orient
original
orphan
ostrich
other
outdoor
outer
output
outside
oval
oven
over
own
owner
oxygen
oyster
ozone
pact
paddle
page
pair
palace
palm
panda
panel
panic
panther
paper
parade
parent
park
parrot
party
pass
patch
path
patient
patrol
pattern
pause
pave
payment
peace
peanut
pear
peasant
pelican
pen
penalty
pencil
people
pepper
perfect
permit
person
pet
phone
photo
phrase
physical
piano
picnic
picture
piece
pig
pigeon
pill
pilot
pink
pioneer
pipe
pistol
pitch
pizza
place
planet
plastic
plate
play
please
pledge
pluck
plug
plunge
poem
poet
point
polar
pole
police
pond
pony
pool
popular
portion
position
possible
post
potato
pottery
poverty
powder
power
practice
praise
predict
prefer
prepare
present
pretty
prevent
price
pride
primary
print
priority
prison
private
prize
problem
process
produce
profit
program
project
promote
proof
property
prosper
protect
proud
provide
public
pudding
pull
pulp
pulse
pumpkin
punch
pupil
puppy
purchase
purity
purpose
purse
push
put
puzzle
pyramid
quality
quantum
quarter
question
quick
quit
quiz
quote
rabbit
raccoon
race
rack
radar
radio
rail
rain
raise
rally
ramp
ranch
random
range
rapid
rare
rate
rather
raven
raw
razor
ready
real
reason
rebel
rebuild
recall
receive
recipe
record
recycle
reduce
reflect
reform
refuse
region
regret
regular
reject
relax
release
relief
rely
remain
remember
remind
remove
render
renew
rent
reopen
repair
repeat
replace
report
require
rescue
resemble
resist
resource
response
result
retire
retreat
return
reunion
reveal
review
reward
rhythm
rib
ribbon
rice
rich
ride
ridge
rifle
right
rigid
ring
riot
ripple
risk
ritual
rival
river
road
roast
robot
robust
rocket
romance
roof
rookie
room
rose
rotate
rough
round
route
royal
rubber
rude
rug
rule
run
runway
rural
sad
saddle
sadness
safe
sail
salad
salmon
salon
salt
salute
same
sample
sand
satisfy
satoshi
sauce
sausage
save
say
scale
scan
scare
scatter
scene
scheme
school
science
scissors
scorpion
scout
scrap
screen
script
scrub
sea
search
season
seat
second
secret
section
security
seed
seek
segment
select
sell
seminar
senior
sense
sentence
series
service
session
settle
setup
seven
shadow
shaft
shallow
share
shed
shell
sheriff
shield
shift
shine
ship
shiver
shock
shoe
shoot
shop
short
shoulder
shove
shrimp
shrug
shuffle
shy
sibling
sick
side
siege
sight
sign
silent
silk
silly
silver
similar
simple
since
sing
siren
sister
situate
six
size
skate
sketch
ski
skill
skin
skirt
skull
slab
slam
sleep
slender
slice
slide
slight
slim
slogan
slot
slow
slush
small
smart
smile
smoke
smooth
snack
snake
snap
sniff
snow
soap
soccer
social
sock
soda
soft
solar
soldier
solid
solution
solve
someone
song
soon
sorry
sort
soul
sound
soup
source
south
space
spare
spatial
spawn
speak
special
speed
spell
spend
sphere
spice
spider
spike
spin
spirit
split
spoil
sponsor
spoon
sport
spot
spray
spread
spring
spy
square
squeeze
squirrel
stable
stadium
staff
stage
stairs
stamp
stand
start
state
stay
steak
steel
stem
step
stereo
stick
still
sting
stock
stomach
stone
stool
story
stove
strategy
street
strike
strong
struggle
student
stuff
stumble
style
subject
submit
subway
success
such
sudden
suffer
sugar
suggest
suit
summer
sun
sunny
sunset
super
supply
supreme
sure
surface
surge
surprise
surround
survey
suspect
sustain
swallow
swamp
swap
swarm
swear
sweet
swift
swim
swing
switch
sword
symbol
symptom
syrup
system
table
tackle
tag
tail
talent
talk
tank
tape
target
task
taste
tattoo
taxi
teach
team
tell
ten
tenant
tennis
tent
term
test
text
thank
that
theme
then
theory
there
they
thing
this
thought
three
thrive
throw
thumb
thunder
ticket
tide
tiger
tilt
timber
time
tiny
tip
tired
tissue
title
toast
tobacco
today
toddler
toe
together
toilet
token
tomato
tomorrow
tone
tongue
tonight
tool
tooth
top
topic
topple
torch
tornado
tortoise
toss
total
tourist
toward
tower
town
toy
track
trade
traffic
tragic
train
transfer
trap
trash
travel
tray
treat
tree
trend
trial
tribe
trick
trigger
trim
trip
trophy
trouble
truck
true
truly
trumpet
trust
truth
try
tube
tuition
tumble
tuna
tunnel
turkey
turn
turtle
twelve
twenty
twice
twin
twist
two
type
typical
ugly
umbrella
unable
unaware
uncle
uncover
under
undo
unfair
unfold
unhappy
uniform
unique
unit
universe
unknown
unlock
until
unusual
unveil
update
upgrade
uphold
upon
upper
upset
urban
urge
usage
use
used
useful
useless
usual
utility
vacant
vacuum
vague
valid
valley
valve
van
vanish
vapor
various
vast
vault
vehicle
velvet
vendor
venture
venue
verb
verify
version
very
vessel
veteran
viable
vibrant
vicious
victory
video
view
village
vintage
violin
virtual
virus
visa
visit
visual
vital
vivid
vocal
voice
void
volcano
volume
vote
voyage
wage
wagon
wait
walk
wall
walnut
want
warfare
warm
warrior
wash
wasp
waste
water
wave
way
wealth
weapon
wear
weasel
weather
web
wedding
weekend
weird
welcome
west
wet
whale
what
wheat
wheel
when
where
whip
whisper
wide
width
wife
wild
will
win
window
wine
wing
wink
winner
winter
wire
wisdom
wise
wish
witness
wolf
woman
wonder
wood
wool
word
work
world
worry
worth
wrap
wreck
wrestle
wrist
write
wrong
yard
year
yellow
you
young
youth
zebra
zero
zone
zoo`.split("\n");
  }
});

// ../sdk/dist/metamask.js
var init_metamask = __esm({
  "../sdk/dist/metamask.js"() {
    "use strict";
    init_crypto();
  }
});

// ../sdk/dist/wallet/key-source.js
var NSK_DOMAIN;
var init_key_source = __esm({
  "../sdk/dist/wallet/key-source.js"() {
    "use strict";
    init_esm();
    init_english();
    init_crypto();
    init_metamask();
    NSK_DOMAIN = new TextEncoder().encode("lelantos.nsk.v1");
  }
});

// ../sdk/dist/wallet/selection.js
var init_selection = __esm({
  "../sdk/dist/wallet/selection.js"() {
    "use strict";
  }
});

// ../sdk/dist/sync.js
function scanNotes(J, P, ivk, inputs, detectionKey) {
  const hits = [];
  for (const inp of inputs) {
    if (detectionKey && inp.clue) {
      if (!fmdTest(J, P, detectionKey, inp.clue))
        continue;
    }
    const { body } = stripClueBitsPrefix(inp.ciphertext);
    const plain = decryptNote({ J, ivk, note: { epk: inp.epk, ciphertext: body } });
    if (!plain)
      continue;
    try {
      const payload = decodeNotePayload(plain);
      hits.push({ ...payload, cm: inp.cm, leafIndex: inp.leafIndex });
    } catch {
    }
  }
  return hits;
}
var init_sync = __esm({
  "../sdk/dist/sync.js"() {
    "use strict";
    init_crypto();
    init_note_encrypt();
    init_note_codec();
    init_fmd();
  }
});

// ../sdk/dist/wallet/scanner.js
var init_scanner = __esm({
  "../sdk/dist/wallet/scanner.js"() {
    "use strict";
    init_sync();
  }
});

// ../sdk/dist/wallet/note-store.js
var init_note_store = __esm({
  "../sdk/dist/wallet/note-store.js"() {
    "use strict";
  }
});

// ../sdk/dist/wallet/sync.js
var init_sync2 = __esm({
  "../sdk/dist/wallet/sync.js"() {
    "use strict";
    init_aux();
    init_note_store();
  }
});

// ../sdk/dist/wallet/errors.js
var init_errors = __esm({
  "../sdk/dist/wallet/errors.js"() {
    "use strict";
  }
});

// ../sdk/dist/wallet/http.js
var init_http = __esm({
  "../sdk/dist/wallet/http.js"() {
    "use strict";
    init_errors();
  }
});

// ../sdk/dist/wallet/fmd-client.js
var init_fmd_client = __esm({
  "../sdk/dist/wallet/fmd-client.js"() {
    "use strict";
    init_http();
  }
});

// ../sdk/dist/wallet/note-source.js
var init_note_source = __esm({
  "../sdk/dist/wallet/note-source.js"() {
    "use strict";
  }
});

// ../sdk/dist/relayer.js
var init_relayer = __esm({
  "../sdk/dist/relayer.js"() {
    "use strict";
    init_http();
  }
});

// ../sdk/dist/wallet/submitter.js
var init_submitter = __esm({
  "../sdk/dist/wallet/submitter.js"() {
    "use strict";
    init_relayer();
  }
});

// ../sdk/dist/wallet/prover.js
var init_prover2 = __esm({
  "../sdk/dist/wallet/prover.js"() {
    "use strict";
    init_prover();
  }
});

// ../sdk/dist/wallet/defaults.js
var init_defaults = __esm({
  "../sdk/dist/wallet/defaults.js"() {
    "use strict";
    init_errors();
    init_fmd_client();
    init_note_source();
    init_submitter();
    init_prover2();
  }
});

// ../sdk/dist/wallet/internal.js
var init_internal = __esm({
  "../sdk/dist/wallet/internal.js"() {
    "use strict";
    init_randomness();
  }
});

// ../sdk/dist/wallet/index.js
var init_wallet = __esm({
  "../sdk/dist/wallet/index.js"() {
    "use strict";
    init_crypto();
    init_jubjub_wasm2();
    init_keys();
    init_address();
    init_bundle();
    init_key_source();
    init_randomness();
    init_selection();
    init_scanner();
    init_note_store();
    init_sync2();
    init_errors();
    init_defaults();
    init_internal();
  }
});

// ../sdk/dist/wallet/networks.js
var init_networks = __esm({
  "../sdk/dist/wallet/networks.js"() {
    "use strict";
  }
});

// ../sdk/dist/permit.js
var init_permit = __esm({
  "../sdk/dist/permit.js"() {
    "use strict";
  }
});

// ../sdk/dist/wallet/adapters/ethers-chain.js
var init_ethers_chain = __esm({
  "../sdk/dist/wallet/adapters/ethers-chain.js"() {
    "use strict";
    init_permit();
  }
});

// ../sdk/node_modules/circom_runtime/js/utils.js
var init_utils3 = __esm({
  "../sdk/node_modules/circom_runtime/js/utils.js"() {
  }
});

// ../sdk/node_modules/circom_runtime/node_modules/ffjavascript/build/browser.esm.js
function fromString2(s, radix) {
  if (!radix || radix == 10) {
    return BigInt(s);
  } else if (radix == 16) {
    if (s.slice(0, 2) == "0x") {
      return BigInt(s);
    } else {
      return BigInt("0x" + s);
    }
  }
}
function _revSlow$12(idx, bits2) {
  let res = 0;
  let a = idx;
  for (let i = 0; i < bits2; i++) {
    res <<= 1;
    res = res | a & 1;
    a >>= 1;
  }
  return res;
}
function compare2(a, b) {
  return a === b ? 0 : a > b ? 1 : -1;
}
function square$12(n) {
  return n * n;
}
function isOdd$42(n) {
  return n % 2n !== 0n;
}
function isEven2(n) {
  return n % 2n === 0n;
}
function isNegative$32(n) {
  return n < 0n;
}
function isPositive2(n) {
  return n > 0n;
}
function bitLength$52(n) {
  if (isNegative$32(n)) {
    return n.toString(2).length - 1;
  } else {
    return n.toString(2).length;
  }
}
function abs2(n) {
  return n < 0n ? -n : n;
}
function isUnit2(n) {
  return abs2(n) === 1n;
}
function modInv$32(a, n) {
  var t = 0n, newT = 1n, r = n, newR = abs2(a), q, lastT, lastR;
  while (newR !== 0n) {
    q = r / newR;
    lastT = t;
    lastR = r;
    t = newT;
    r = newR;
    newT = lastT - q * newT;
    newR = lastR - q * newR;
  }
  if (!isUnit2(r)) throw new Error(a.toString() + " and " + n.toString() + " are not co-prime");
  if (compare2(t, 0n) === -1) {
    t = t + n;
  }
  if (isNegative$32(a)) {
    return -t;
  }
  return t;
}
function modPow$22(n, exp, mod2) {
  if (mod2 === 0n) throw new Error("Cannot take modPow with modulus 0");
  var r = 1n, base = n % mod2;
  if (isNegative$32(exp)) {
    exp = exp * -1n;
    base = modInv$32(base, mod2);
  }
  while (isPositive2(exp)) {
    if (base === 0n) return 0n;
    if (isOdd$42(exp)) r = r * base % mod2;
    exp = exp / 2n;
    base = square$12(base) % mod2;
  }
  return r;
}
function compareAbs2(a, b) {
  a = a >= 0n ? a : -a;
  b = b >= 0n ? b : -b;
  return a === b ? 0 : a > b ? 1 : -1;
}
function isDivisibleBy2(a, n) {
  if (n === 0n) return false;
  if (isUnit2(n)) return true;
  if (compareAbs2(n, 2n) === 0) return isEven2(a);
  return a % n === 0n;
}
function isBasicPrime2(v) {
  var n = abs2(v);
  if (isUnit2(n)) return false;
  if (n === 2n || n === 3n || n === 5n) return true;
  if (isEven2(n) || isDivisibleBy2(n, 3n) || isDivisibleBy2(n, 5n)) return false;
  if (n < 49n) return true;
}
function prev2(n) {
  return n - 1n;
}
function millerRabinTest2(n, a) {
  var nPrev = prev2(n), b = nPrev, r = 0, d, i, x;
  while (isEven2(b)) b = b / 2n, r++;
  next: for (i = 0; i < a.length; i++) {
    if (n < a[i]) continue;
    x = modPow$22(BigInt(a[i]), b, n);
    if (isUnit2(x) || x === nPrev) continue;
    for (d = r - 1; d != 0; d--) {
      x = square$12(x) % n;
      if (isUnit2(x)) return false;
      if (x === nPrev) continue next;
    }
    return false;
  }
  return true;
}
function isPrime$12(p) {
  var isPrime3 = isBasicPrime2(p);
  if (isPrime3 !== void 0) return isPrime3;
  var n = abs2(p);
  var bits2 = bitLength$52(n);
  if (bits2 <= 64)
    return millerRabinTest2(n, [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]);
  var logN = Math.log(2) * Number(bits2);
  var t = Math.ceil(logN);
  for (var a = [], i = 0; i < t; i++) {
    a.push(BigInt(i + 2));
  }
  return millerRabinTest2(n, a);
}
function _revSlow2(idx, bits2) {
  let res = 0;
  let a = idx;
  for (let i = 0; i < bits2; i++) {
    res <<= 1;
    res = res | a & 1;
    a >>= 1;
  }
  return res;
}
var e2, zero2, one2, _revTable$12, utils$62, bigint2, bitLength$42, modInv$22, modPow$12, isPrime2, isOdd$32, square2, bitLength$32, isOdd$22, modInv$12, modPow2, bitLength$22, modInv2, isOdd$12, isNegative$22, bitLength$12, isOdd2, isNegative$12, _revTable2, PAGE_SIZE3, workerSource2, threadStr2, bls12381r3, bn128r3, bls12381q3, bn128q3;
var init_browser_esm3 = __esm({
  "../sdk/node_modules/circom_runtime/node_modules/ffjavascript/build/browser.esm.js"() {
    e2 = fromString2;
    zero2 = e2(0);
    one2 = e2(1);
    _revTable$12 = [];
    for (let i = 0; i < 256; i++) {
      _revTable$12[i] = _revSlow$12(i, 8);
    }
    utils$62 = {};
    utils$62.bigInt2BytesLE = function bigInt2BytesLE3(_a, len) {
      const b = Array(len);
      let v = BigInt(_a);
      for (let i = 0; i < len; i++) {
        b[i] = Number(v & 0xFFn);
        v = v >> 8n;
      }
      return b;
    };
    utils$62.bigInt2U32LE = function bigInt2BytesLE4(_a, len) {
      const b = Array(len);
      let v = BigInt(_a);
      for (let i = 0; i < len; i++) {
        b[i] = Number(v & 0xFFFFFFFFn);
        v = v >> 32n;
      }
      return b;
    };
    utils$62.isOcamNum = function(a) {
      if (!Array.isArray(a)) return false;
      if (a.length != 3) return false;
      if (typeof a[0] !== "number") return false;
      if (typeof a[1] !== "number") return false;
      if (!Array.isArray(a[2])) return false;
      return true;
    };
    bigint2 = {};
    bigint2.bitLength = bitLength$52;
    bigint2.isOdd = isOdd$42;
    bigint2.isNegative = isNegative$32;
    bigint2.abs = abs2;
    bigint2.isUnit = isUnit2;
    bigint2.compare = compare2;
    bigint2.modInv = modInv$32;
    bigint2.modPow = modPow$22;
    bigint2.isPrime = isPrime$12;
    bigint2.square = square$12;
    ({ bitLength: bitLength$42, modInv: modInv$22, modPow: modPow$12, isPrime: isPrime2, isOdd: isOdd$32, square: square2 } = bigint2);
    ({ bitLength: bitLength$32 } = bigint2);
    ({ isOdd: isOdd$22, modInv: modInv$12, modPow: modPow2 } = bigint2);
    ({ bitLength: bitLength$22, modInv: modInv2, isOdd: isOdd$12, isNegative: isNegative$22 } = bigint2);
    ({ bitLength: bitLength$12, isOdd: isOdd2, isNegative: isNegative$12 } = bigint2);
    _revTable2 = [];
    for (let i = 0; i < 256; i++) {
      _revTable2[i] = _revSlow2(i, 8);
    }
    PAGE_SIZE3 = 1 << 30;
    threadStr2 = `(${'function thread(self) {\n    const MAXMEM = 32767;\n    let instance;\n    let memory;\n\n    if (self) {\n        self.onmessage = function(e) {\n            let data;\n            if (e.data) {\n                data = e.data;\n            } else {\n                data = e;\n            }\n\n            if (data[0].cmd == "INIT") {\n                init(data[0]).then(function() {\n                    self.postMessage(data.result);\n                });\n            } else if (data[0].cmd == "TERMINATE") {\n                self.close();\n            } else {\n                const res = runTask(data);\n                self.postMessage(res);\n            }\n        };\n    }\n\n    async function init(data) {\n        const code = new Uint8Array(data.code);\n        const wasmModule = await WebAssembly.compile(code);\n        memory = new WebAssembly.Memory({initial:data.init, maximum: MAXMEM});\n\n        instance = await WebAssembly.instantiate(wasmModule, {\n            env: {\n                "memory": memory\n            }\n        });\n    }\n\n\n\n    function alloc(length) {\n        const u32 = new Uint32Array(memory.buffer, 0, 1);\n        while (u32[0] & 3) u32[0]++;  // Return always aligned pointers\n        const res = u32[0];\n        u32[0] += length;\n        if (u32[0] + length > memory.buffer.byteLength) {\n            const currentPages = memory.buffer.byteLength / 0x10000;\n            let requiredPages = Math.floor((u32[0] + length) / 0x10000)+1;\n            if (requiredPages>MAXMEM) requiredPages=MAXMEM;\n            memory.grow(requiredPages-currentPages);\n        }\n        return res;\n    }\n\n    function allocBuffer(buffer) {\n        const p = alloc(buffer.byteLength);\n        setBuffer(p, buffer);\n        return p;\n    }\n\n    function getBuffer(pointer, length) {\n        const u8 = new Uint8Array(memory.buffer);\n        return new Uint8Array(u8.buffer, u8.byteOffset + pointer, length);\n    }\n\n    function setBuffer(pointer, buffer) {\n        const u8 = new Uint8Array(memory.buffer);\n        u8.set(new Uint8Array(buffer), pointer);\n    }\n\n    function runTask(task) {\n        if (task[0].cmd == "INIT") {\n            return init(task[0]);\n        }\n        const ctx = {\n            vars: [],\n            out: []\n        };\n        const u32a = new Uint32Array(memory.buffer, 0, 1);\n        const oldAlloc = u32a[0];\n        for (let i=0; i<task.length; i++) {\n            switch (task[i].cmd) {\n            case "ALLOCSET":\n                ctx.vars[task[i].var] = allocBuffer(task[i].buff);\n                break;\n            case "ALLOC":\n                ctx.vars[task[i].var] = alloc(task[i].len);\n                break;\n            case "SET":\n                setBuffer(ctx.vars[task[i].var], task[i].buff);\n                break;\n            case "CALL": {\n                const params = [];\n                for (let j=0; j<task[i].params.length; j++) {\n                    const p = task[i].params[j];\n                    if (typeof p.var !== "undefined") {\n                        params.push(ctx.vars[p.var] + (p.offset || 0));\n                    } else if (typeof p.val != "undefined") {\n                        params.push(p.val);\n                    }\n                }\n                instance.exports[task[i].fnName](...params);\n                break;\n            }\n            case "GET":\n                ctx.out[task[i].out] = getBuffer(ctx.vars[task[i].var], task[i].len).slice();\n                break;\n            default:\n                throw new Error("Invalid cmd");\n            }\n        }\n        const u32b = new Uint32Array(memory.buffer, 0, 1);\n        u32b[0] = oldAlloc;\n        return ctx.out;\n    }\n\n\n    return runTask;\n}'})(self)`;
    {
      if (globalThis?.Blob) {
        const threadBytes = new TextEncoder().encode(threadStr2);
        const workerBlob = new Blob([threadBytes], { type: "application/javascript" });
        workerSource2 = URL.createObjectURL(workerBlob);
      } else {
        workerSource2 = "data:application/javascript;base64," + globalThis.btoa(threadStr2);
      }
    }
    globalThis.curve_bn128 = null;
    globalThis.curve_bls12381 = null;
    bls12381r3 = e2("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
    bn128r3 = e2("21888242871839275222246405745257275088548364400416034343698204186575808495617");
    bls12381q3 = e2("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16);
    bn128q3 = e2("21888242871839275222246405745257275088696311157297823662689037894645226208583");
  }
});

// ../sdk/node_modules/circom_runtime/js/witness_calculator.js
var init_witness_calculator = __esm({
  "../sdk/node_modules/circom_runtime/js/witness_calculator.js"() {
    init_utils3();
    init_browser_esm3();
  }
});

// ../sdk/node_modules/circom_runtime/main.js
var init_main = __esm({
  "../sdk/node_modules/circom_runtime/main.js"() {
    init_witness_calculator();
  }
});

// ../sdk/wasm/prover/pkg/snippets/wasm-bindgen-rayon-38edf6e439f6d70d/src/workerHelpers.js
function waitForMsgType(target, type) {
  return new Promise((resolve) => {
    target.addEventListener("message", function onMsg({ data }) {
      if (data?.type !== type) return;
      target.removeEventListener("message", onMsg);
      resolve(data);
    });
  });
}
async function startWorkers(module, memory, builder2) {
  if (builder2.numThreads() === 0) {
    throw new Error(`num_threads must be > 0.`);
  }
  const workerInit = {
    type: "wasm_bindgen_worker_init",
    init: { module_or_path: module, memory },
    receiver: builder2.receiver()
  };
  _workers = await Promise.all(
    Array.from({ length: builder2.numThreads() }, async () => {
      const worker = new Worker(new URL("./workerHelpers.js", import.meta.url), {
        type: "module"
      });
      worker.postMessage(workerInit);
      await waitForMsgType(worker, "wasm_bindgen_worker_ready");
      return worker;
    })
  );
  builder2.build();
}
var _workers;
var init_workerHelpers = __esm({
  "../sdk/wasm/prover/pkg/snippets/wasm-bindgen-rayon-38edf6e439f6d70d/src/workerHelpers.js"() {
    "use strict";
    waitForMsgType(self, "wasm_bindgen_worker_init").then(async ({ init, receiver }) => {
      const pkg = await Promise.resolve().then(() => (init_prover3(), prover_exports));
      await pkg.default(init);
      postMessage({ type: "wasm_bindgen_worker_ready" });
      pkg.wbg_rayon_start_worker(receiver);
    });
  }
});

// ../sdk/wasm/prover/pkg/prover.js
var prover_exports = {};
__export(prover_exports, {
  ProverSession: () => ProverSession,
  _start: () => _start2,
  default: () => __wbg_init2,
  initSync: () => initSync2,
  initThreadPool: () => initThreadPool,
  wbg_rayon_PoolBuilder: () => wbg_rayon_PoolBuilder,
  wbg_rayon_start_worker: () => wbg_rayon_start_worker
});
function _start2() {
  wasm2._start();
}
function initThreadPool(num_threads) {
  const ret = wasm2.initThreadPool(num_threads);
  return takeObject2(ret);
}
function wbg_rayon_start_worker(receiver) {
  wasm2.wbg_rayon_start_worker(receiver);
}
function __wbg_get_imports2(memory) {
  const import0 = {
    __proto__: null,
    __wbg_String_b51de6b05a10845b: function(arg0, arg1) {
      const ret = String(getObject2(arg1));
      const ptr1 = passStringToWasm02(ret, wasm2.__wbindgen_export, wasm2.__wbindgen_export2);
      const len1 = WASM_VECTOR_LEN2;
      getDataViewMemory02().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory02().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg___wbindgen_is_undefined_244a92c34d3b6ec0: function(arg0) {
      const ret = getObject2(arg0) === void 0;
      return ret;
    },
    __wbg___wbindgen_memory_c2356dd1a089dfbd: function() {
      const ret = wasm2.memory;
      return addHeapObject2(ret);
    },
    __wbg___wbindgen_module_df704393dfd1853c: function() {
      const ret = wasmModule2;
      return addHeapObject2(ret);
    },
    __wbg___wbindgen_throw_9c75d47bf9e7731e: function(arg0, arg1) {
      throw new Error(getStringFromWasm02(arg0, arg1));
    },
    __wbg_error_a6fa202b58aa1cd3: function(arg0, arg1) {
      let deferred0_0;
      let deferred0_1;
      try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm02(arg0, arg1));
      } finally {
        wasm2.__wbindgen_export3(deferred0_0, deferred0_1, 1);
      }
    },
    __wbg_instanceof_Window_4153c1818a1c0c0b: function(arg0) {
      let result;
      try {
        result = getObject2(arg0) instanceof Window;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    },
    __wbg_new_227d7c05414eb861: function() {
      const ret = new Error();
      return addHeapObject2(ret);
    },
    __wbg_new_2fad8ca02fd00684: function() {
      const ret = new Object();
      return addHeapObject2(ret);
    },
    __wbg_new_3baa8d9866155c79: function() {
      const ret = new Array();
      return addHeapObject2(ret);
    },
    __wbg_set_f071dbb3bd088e0e: function(arg0, arg1, arg2) {
      getObject2(arg0)[takeObject2(arg1)] = takeObject2(arg2);
    },
    __wbg_set_f614f6a0608d1d1d: function(arg0, arg1, arg2) {
      getObject2(arg0)[arg1 >>> 0] = takeObject2(arg2);
    },
    __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
      const ret = getObject2(arg1).stack;
      const ptr1 = passStringToWasm02(ret, wasm2.__wbindgen_export, wasm2.__wbindgen_export2);
      const len1 = WASM_VECTOR_LEN2;
      getDataViewMemory02().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory02().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg_startWorkers_8b582d57e92bd2d4: function(arg0, arg1, arg2) {
      const ret = startWorkers(takeObject2(arg0), takeObject2(arg1), wbg_rayon_PoolBuilder.__wrap(arg2));
      return addHeapObject2(ret);
    },
    __wbg_static_accessor_GLOBAL_THIS_1c7f1bd6c6941fdb: function() {
      const ret = typeof globalThis === "undefined" ? null : globalThis;
      return isLikeNone(ret) ? 0 : addHeapObject2(ret);
    },
    __wbg_static_accessor_GLOBAL_e039bc914f83e74e: function() {
      const ret = typeof global === "undefined" ? null : global;
      return isLikeNone(ret) ? 0 : addHeapObject2(ret);
    },
    __wbg_static_accessor_SELF_8bf8c48c28420ad5: function() {
      const ret = typeof self === "undefined" ? null : self;
      return isLikeNone(ret) ? 0 : addHeapObject2(ret);
    },
    __wbg_static_accessor_WINDOW_6aeee9b51652ee0f: function() {
      const ret = typeof window === "undefined" ? null : window;
      return isLikeNone(ret) ? 0 : addHeapObject2(ret);
    },
    __wbindgen_cast_0000000000000001: function(arg0, arg1) {
      const ret = getStringFromWasm02(arg0, arg1);
      return addHeapObject2(ret);
    },
    __wbindgen_object_clone_ref: function(arg0) {
      const ret = getObject2(arg0);
      return addHeapObject2(ret);
    },
    __wbindgen_object_drop_ref: function(arg0) {
      takeObject2(arg0);
    },
    memory: memory || new WebAssembly.Memory({ initial: 18, maximum: 16384, shared: true })
  };
  return {
    __proto__: null,
    "./prover_bg.js": import0
  };
}
function addHeapObject2(obj) {
  if (heap_next2 === heap2.length) heap2.push(heap2.length + 1);
  const idx = heap_next2;
  heap_next2 = heap2[idx];
  heap2[idx] = obj;
  return idx;
}
function dropObject2(idx) {
  if (idx < 1028) return;
  heap2[idx] = heap_next2;
  heap_next2 = idx;
}
function getDataViewMemory02() {
  if (cachedDataViewMemory02 === null || cachedDataViewMemory02.buffer !== wasm2.memory.buffer) {
    cachedDataViewMemory02 = new DataView(wasm2.memory.buffer);
  }
  return cachedDataViewMemory02;
}
function getStringFromWasm02(ptr, len) {
  return decodeText2(ptr >>> 0, len);
}
function getUint8ArrayMemory02() {
  if (cachedUint8ArrayMemory02 === null || cachedUint8ArrayMemory02.buffer !== wasm2.memory.buffer) {
    cachedUint8ArrayMemory02 = new Uint8Array(wasm2.memory.buffer);
  }
  return cachedUint8ArrayMemory02;
}
function getObject2(idx) {
  return heap2[idx];
}
function isLikeNone(x) {
  return x === void 0 || x === null;
}
function passArray8ToWasm02(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory02().set(arg, ptr / 1);
  WASM_VECTOR_LEN2 = arg.length;
  return ptr;
}
function passStringToWasm02(arg, malloc, realloc) {
  if (realloc === void 0) {
    const buf = cachedTextEncoder2.encode(arg);
    const ptr2 = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory02().subarray(ptr2, ptr2 + buf.length).set(buf);
    WASM_VECTOR_LEN2 = buf.length;
    return ptr2;
  }
  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;
  const mem = getUint8ArrayMemory02();
  let offset = 0;
  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 127) break;
    mem[ptr + offset] = code;
  }
  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
    const view = getUint8ArrayMemory02().subarray(ptr + offset, ptr + len);
    const ret = cachedTextEncoder2.encodeInto(arg, view);
    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }
  WASM_VECTOR_LEN2 = offset;
  return ptr;
}
function takeObject2(idx) {
  const ret = getObject2(idx);
  dropObject2(idx);
  return ret;
}
function decodeText2(ptr, len) {
  numBytesDecoded2 += len;
  if (numBytesDecoded2 >= MAX_SAFARI_DECODE_BYTES2) {
    cachedTextDecoder2 = new TextDecoder("utf-8", { ignoreBOM: true, fatal: true });
    cachedTextDecoder2.decode();
    numBytesDecoded2 = len;
  }
  return cachedTextDecoder2.decode(getUint8ArrayMemory02().slice(ptr, ptr + len));
}
function __wbg_finalize_init2(instance, module, thread_stack_size) {
  wasmInstance2 = instance;
  wasm2 = instance.exports;
  wasmModule2 = module;
  cachedDataViewMemory02 = null;
  cachedUint8ArrayMemory02 = null;
  if (typeof thread_stack_size !== "undefined" && (typeof thread_stack_size !== "number" || thread_stack_size === 0 || thread_stack_size % 65536 !== 0)) {
    throw new Error("invalid stack size");
  }
  wasm2.__wbindgen_start(thread_stack_size);
  return wasm2;
}
async function __wbg_load2(module, imports) {
  if (typeof Response === "function" && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e3) {
        const validResponse = module.ok && expectedResponseType(module.type);
        if (validResponse && module.headers.get("Content-Type") !== "application/wasm") {
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e3);
        } else {
          throw e3;
        }
      }
    }
    const bytes2 = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes2, imports);
  } else {
    const instance = await WebAssembly.instantiate(module, imports);
    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }
  function expectedResponseType(type) {
    switch (type) {
      case "basic":
      case "cors":
      case "default":
        return true;
    }
    return false;
  }
}
function initSync2(module, memory) {
  if (wasm2 !== void 0) return wasm2;
  let thread_stack_size;
  if (module !== void 0) {
    if (Object.getPrototypeOf(module) === Object.prototype) {
      ({ module, memory, thread_stack_size } = module);
    } else {
      console.warn("using deprecated parameters for `initSync()`; pass a single object instead");
    }
  }
  const imports = __wbg_get_imports2(memory);
  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }
  const instance = new WebAssembly.Instance(module, imports);
  return __wbg_finalize_init2(instance, module, thread_stack_size);
}
async function __wbg_init2(module_or_path, memory) {
  if (wasm2 !== void 0) return wasm2;
  let thread_stack_size;
  if (module_or_path !== void 0) {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path, memory, thread_stack_size } = module_or_path);
    } else {
      console.warn("using deprecated parameters for the initialization function; pass a single object instead");
    }
  }
  if (module_or_path === void 0) {
    module_or_path = new URL("prover_bg.wasm", import.meta.url);
  }
  const imports = __wbg_get_imports2(memory);
  if (typeof module_or_path === "string" || typeof Request === "function" && module_or_path instanceof Request || typeof URL === "function" && module_or_path instanceof URL) {
    module_or_path = fetch(module_or_path);
  }
  const { instance, module } = await __wbg_load2(await module_or_path, imports);
  return __wbg_finalize_init2(instance, module, thread_stack_size);
}
var ProverSession, wbg_rayon_PoolBuilder, ProverSessionFinalization, wbg_rayon_PoolBuilderFinalization, cachedDataViewMemory02, cachedUint8ArrayMemory02, heap2, heap_next2, cachedTextDecoder2, MAX_SAFARI_DECODE_BYTES2, numBytesDecoded2, cachedTextEncoder2, WASM_VECTOR_LEN2, wasmModule2, wasmInstance2, wasm2;
var init_prover3 = __esm({
  "../sdk/wasm/prover/pkg/prover.js"() {
    "use strict";
    init_workerHelpers();
    ProverSession = class {
      __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ProverSessionFinalization.unregister(this);
        return ptr;
      }
      free() {
        const ptr = this.__destroy_into_raw();
        wasm2.__wbg_proversession_free(ptr, 0);
      }
      /**
       * @param {Uint8Array} zkey_bytes
       */
      constructor(zkey_bytes) {
        try {
          const retptr = wasm2.__wbindgen_add_to_stack_pointer(-16);
          const ptr0 = passArray8ToWasm02(zkey_bytes, wasm2.__wbindgen_export);
          const len0 = WASM_VECTOR_LEN2;
          wasm2.proversession_new(retptr, ptr0, len0);
          var r0 = getDataViewMemory02().getInt32(retptr + 4 * 0, true);
          var r1 = getDataViewMemory02().getInt32(retptr + 4 * 1, true);
          var r2 = getDataViewMemory02().getInt32(retptr + 4 * 2, true);
          if (r2) {
            throw takeObject2(r1);
          }
          this.__wbg_ptr = r0;
          ProverSessionFinalization.register(this, this.__wbg_ptr, this);
          return this;
        } finally {
          wasm2.__wbindgen_add_to_stack_pointer(16);
        }
      }
      /**
       * @param {Uint8Array} wtns_bytes
       * @returns {any}
       */
      prove(wtns_bytes) {
        try {
          const retptr = wasm2.__wbindgen_add_to_stack_pointer(-16);
          const ptr0 = passArray8ToWasm02(wtns_bytes, wasm2.__wbindgen_export);
          const len0 = WASM_VECTOR_LEN2;
          wasm2.proversession_prove(retptr, this.__wbg_ptr, ptr0, len0);
          var r0 = getDataViewMemory02().getInt32(retptr + 4 * 0, true);
          var r1 = getDataViewMemory02().getInt32(retptr + 4 * 1, true);
          var r2 = getDataViewMemory02().getInt32(retptr + 4 * 2, true);
          if (r2) {
            throw takeObject2(r1);
          }
          return takeObject2(r0);
        } finally {
          wasm2.__wbindgen_add_to_stack_pointer(16);
        }
      }
    };
    if (Symbol.dispose) ProverSession.prototype[Symbol.dispose] = ProverSession.prototype.free;
    wbg_rayon_PoolBuilder = class _wbg_rayon_PoolBuilder {
      static __wrap(ptr) {
        const obj = Object.create(_wbg_rayon_PoolBuilder.prototype);
        obj.__wbg_ptr = ptr;
        wbg_rayon_PoolBuilderFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
      }
      __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        wbg_rayon_PoolBuilderFinalization.unregister(this);
        return ptr;
      }
      free() {
        const ptr = this.__destroy_into_raw();
        wasm2.__wbg_wbg_rayon_poolbuilder_free(ptr, 0);
      }
      build() {
        wasm2.wbg_rayon_poolbuilder_build(this.__wbg_ptr);
      }
      /**
       * @returns {number}
       */
      numThreads() {
        const ret = wasm2.wbg_rayon_poolbuilder_numThreads(this.__wbg_ptr);
        return ret >>> 0;
      }
      /**
       * @returns {number}
       */
      receiver() {
        const ret = wasm2.wbg_rayon_poolbuilder_receiver(this.__wbg_ptr);
        return ret >>> 0;
      }
    };
    if (Symbol.dispose) wbg_rayon_PoolBuilder.prototype[Symbol.dispose] = wbg_rayon_PoolBuilder.prototype.free;
    ProverSessionFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
    }, unregister: () => {
    } } : new FinalizationRegistry((ptr) => wasm2.__wbg_proversession_free(ptr, 1));
    wbg_rayon_PoolBuilderFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
    }, unregister: () => {
    } } : new FinalizationRegistry((ptr) => wasm2.__wbg_wbg_rayon_poolbuilder_free(ptr, 1));
    cachedDataViewMemory02 = null;
    cachedUint8ArrayMemory02 = null;
    heap2 = new Array(1024).fill(void 0);
    heap2.push(void 0, null, true, false);
    heap_next2 = heap2.length;
    cachedTextDecoder2 = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }) : void 0;
    if (cachedTextDecoder2) cachedTextDecoder2.decode();
    MAX_SAFARI_DECODE_BYTES2 = 2146435072;
    numBytesDecoded2 = 0;
    cachedTextEncoder2 = typeof TextEncoder !== "undefined" ? new TextEncoder() : void 0;
    if (cachedTextEncoder2) {
      cachedTextEncoder2.encodeInto = function(arg, view) {
        const buf = cachedTextEncoder2.encode(arg);
        view.set(buf);
        return {
          read: arg.length,
          written: buf.length
        };
      };
    }
    WASM_VECTOR_LEN2 = 0;
  }
});

// ../sdk/dist/wallet/wasm-prover.js
async function maybeInitNodeThreadPool(mod2) {
  if (!mod2.initThreadPool)
    return;
  const envN = parseInt(process.env.LELANTOS_PROVER_THREADS ?? "", 10);
  const n = proverThreadCount ?? (Number.isFinite(envN) ? envN : await defaultThreadCount());
  if (n <= 1)
    return;
  try {
    await installNodeRayonWorker();
    const initPromise = mod2.initThreadPool(n);
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("initThreadPool timeout (10s)")), 1e4));
    await Promise.race([initPromise, timeout]);
  } catch (err) {
    console.warn("[WasmProver] rayon thread pool init failed; running single-threaded:", err);
  }
}
async function defaultThreadCount() {
  try {
    const os = await import("node:os");
    return os.availableParallelism?.() ?? os.cpus().length;
  } catch {
    return 4;
  }
}
async function installNodeRayonWorker() {
  if (nodeRayonInstalled)
    return;
  if (!nodePkgUrl)
    throw new Error("nodePkgUrl not set; call after wasm init");
  const { Worker: NodeWorker } = await import("node:worker_threads");
  const bootstrap = RAYON_BOOTSTRAP_URL;
  const pkgUrl = nodePkgUrl;
  class NodeBrowserWorker {
    w;
    listeners = /* @__PURE__ */ new Map();
    constructor(url) {
      const target = url instanceof URL ? url.href : String(url);
      this.w = new NodeWorker(bootstrap, {
        env: {
          ...process.env,
          LELANTOS_RAYON_PKG_URL: pkgUrl,
          LELANTOS_RAYON_WORKER_URL: target
        }
      });
      const dbg = (m) => {
        if (process.env.LELANTOS_RAYON_DEBUG)
          console.error(`[rayon-main ${target}]`, m);
      };
      dbg("worker spawned");
      this.w.on("message", (data) => {
        dbg(`message ${data?.type}`);
        const set = this.listeners.get("message");
        if (set)
          for (const cb of set)
            cb({ data });
      });
      this.w.on("error", (err) => {
        dbg(`error ${err.message}`);
        const set = this.listeners.get("error");
        if (set)
          for (const cb of set)
            cb({ data: err });
      });
      this.w.on("exit", (code) => dbg(`exit ${code}`));
    }
    postMessage(msg) {
      this.w.postMessage(msg);
    }
    addEventListener(type, cb) {
      let set = this.listeners.get(type);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        this.listeners.set(type, set);
      }
      set.add(cb);
    }
    removeEventListener(type, cb) {
      this.listeners.get(type)?.delete(cb);
    }
    terminate() {
      void this.w.terminate();
    }
  }
  const g = globalThis;
  if (g.Worker === void 0)
    g.Worker = NodeBrowserWorker;
  nodeRayonInstalled = true;
}
var IS_NODE2, proverThreadCount, PKG_JS_URL2, PKG_WASM_URL2, proverLoader, RAYON_BOOTSTRAP_URL, nodeRayonInstalled, nodePkgUrl;
var init_wasm_prover = __esm({
  "../sdk/dist/wallet/wasm-prover.js"() {
    "use strict";
    init_main();
    init_loader();
    IS_NODE2 = typeof process !== "undefined" && !!process.versions?.node;
    proverThreadCount = null;
    PKG_JS_URL2 = new URL("../../wasm/prover/pkg/prover.js", import.meta.url);
    PKG_WASM_URL2 = new URL("../../wasm/prover/pkg/prover_bg.wasm", import.meta.url);
    proverLoader = createWasmLoader({
      name: "prover",
      defaultImport: () => Promise.resolve().then(() => (init_prover3(), prover_exports)),
      nodeJsUrl: async () => PKG_JS_URL2.href,
      nodeWasmPath: async () => {
        const { fileURLToPath } = await import("node:url");
        return fileURLToPath(PKG_WASM_URL2);
      },
      postInit: async (mod2, ctx) => {
        if (ctx.isNode) {
          nodePkgUrl = ctx.nodePkgUrl;
          await maybeInitNodeThreadPool(mod2);
        }
      }
    });
    RAYON_BOOTSTRAP_URL = new URL("../wasm/rayon-worker-bootstrap.mjs", import.meta.url);
    nodeRayonInstalled = false;
    nodePkgUrl = null;
  }
});

// ../sdk/dist/wasm/config.js
var init_config = __esm({
  "../sdk/dist/wasm/config.js"() {
    "use strict";
    init_jubjub_wasm2();
    init_wasm_prover();
  }
});

// ../sdk/dist/wallet/connect.js
var init_connect = __esm({
  "../sdk/dist/wallet/connect.js"() {
    "use strict";
    init_wallet();
    init_networks();
    init_ethers_chain();
    init_prover();
    init_config();
    init_errors();
    init_prover2();
  }
});

// ../sdk/dist/index.js
init_connect();
init_networks();
init_types();
init_wallet();
init_errors();
init_key_source();
init_sync2();

// ../sdk/dist/preload.js
init_jubjub_wasm2();

// ../sdk/dist/presets.js
init_wallet();

// ../sdk/dist/index.js
init_note_source();
init_note_store();
init_submitter();
init_prover2();
init_selection();
init_scanner();

// ../sdk/dist/wallet/prover-worker-client.js
init_prover();

// ../sdk/dist/index.js
init_randomness();
init_fmd_client();
init_ethers_chain();
init_jubjub_wasm2();
init_config();
init_crypto();
init_address();
init_keys();
init_note_codec();
init_note_encrypt();
init_fmd();
init_aux();
init_permit();
init_metamask();
init_prover();
init_bundle();
init_relayer();

// ../sdk/dist/operator.js
init_crypto();
init_prover();

// ../sdk/dist/witness/tree-update.js
init_snark_compression();

// ../sdk/dist/index.js
init_snark_compression();
init_witness();
init_sync();

// src/scan-worker.ts
var state = null;
var post = (msg) => self.postMessage(msg);
function makeIdentity(J, ivkSeed, dkSeed) {
  const ivk = ivkSeed % BABYJUB_SUBGROUP_ORDER || 1n;
  const pkD = J.mulPointEscalar(J.base8, ivk);
  const dk = fmdGenDetectionKey(() => dkSeed);
  const fk = fmdFlagKeyFromDetection(J, dk);
  return { ivk, pkD, fk };
}
async function prepare() {
  const [J, P] = await Promise.all([buildJubjub(), Poseidon.build()]);
  const me = makeIdentity(J, 1234n, 7n);
  const eve = makeIdentity(J, 9999n, 13n);
  const dk = fmdGenDetectionKey(() => 7n);
  state = { J, P, me, eve, dk };
  post({ type: "prepared" });
}
function rand(seed) {
  return (BigInt(seed) * 0x9e3779b97f4a7c15n + 1n) % BABYJUB_SUBGROUP_ORDER || 1n;
}
function buildNote(s, i, mine) {
  const id = mine ? s.me : s.eve;
  const enc = encryptNote({
    J: s.J,
    recipientPkD: id.pkD,
    esk: rand(i + 1),
    plaintext: encodeNotePayload({
      asset: 1n,
      value: BigInt(i + 1),
      rho: BigInt(i + 1e3),
      rcm: BigInt(i + 2e3)
    })
  });
  const clue = fmdFlag(s.J, s.P, id.fk, rand(i + 12345));
  const wire = withClueBitsPrefix(
    clueBitsToPrefix(clue.bits, clue.gamma),
    enc.ciphertext
  );
  return { ciphertext: wire, epk: enc.epk, cm: BigInt(i), leafIndex: i, clue };
}
function buildBatch(s, n, mineFrac) {
  const mineCount = Math.round(n * mineFrac);
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = buildNote(s, i, i < mineCount);
  return out;
}
async function run(req) {
  if (!state) throw new Error("worker not prepared");
  const s = state;
  const inputs = buildBatch(s, req.n, req.mineFrac);
  scanNotes(s.J, s.P, s.me.ivk, inputs.slice(0, Math.min(50, inputs.length)), s.dk);
  const t0 = performance.now();
  const hits = scanNotes(s.J, s.P, s.me.ivk, inputs, s.dk);
  const totalMs = performance.now() - t0;
  const result = {
    type: "result",
    n: req.n,
    mineFrac: req.mineFrac,
    hits: hits.length,
    totalMs,
    perNoteMs: totalMs / req.n,
    notesPerSec: req.n / totalMs * 1e3
  };
  post(result);
}
self.addEventListener("message", async (ev) => {
  const msg = ev.data;
  try {
    if (msg.type === "prepare") await prepare();
    else if (msg.type === "run") await run(msg);
  } catch (e3) {
    post({ type: "error", message: e3 instanceof Error ? e3.message : String(e3) });
  }
});
/*! Bundled license information:

snarkjs/build/browser.esm.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@noble/ciphers/esm/utils.js:
  (*! noble-ciphers - MIT License (c) 2023 Paul Miller (paulmillr.com) *)

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)

@scure/bip39/esm/index.js:
  (*! scure-bip39 - MIT License (c) 2022 Patricio Palladino, Paul Miller (paulmillr.com) *)
*/
