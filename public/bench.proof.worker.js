var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/@lelantos-org/sdk/wasm/prover/pkg/snippets/wasm-bindgen-rayon-38edf6e439f6d70d/src/workerHelpers.js
function waitForMsgType(target, type) {
  return new Promise((resolve) => {
    target.addEventListener("message", function onMsg({ data }) {
      if (data?.type !== type) return;
      target.removeEventListener("message", onMsg);
      resolve(data);
    });
  });
}
async function startWorkers(module2, memory, builder2) {
  if (builder2.numThreads() === 0) {
    throw new Error(`num_threads must be > 0.`);
  }
  const workerInit = {
    type: "wasm_bindgen_worker_init",
    init: { module_or_path: module2, memory },
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
  "node_modules/@lelantos-org/sdk/wasm/prover/pkg/snippets/wasm-bindgen-rayon-38edf6e439f6d70d/src/workerHelpers.js"() {
    waitForMsgType(self, "wasm_bindgen_worker_init").then(async ({ init, receiver }) => {
      const pkg = await Promise.resolve().then(() => (init_prover(), prover_exports));
      await pkg.default(init);
      postMessage({ type: "wasm_bindgen_worker_ready" });
      pkg.wbg_rayon_start_worker(receiver);
    });
  }
});

// node_modules/@lelantos-org/sdk/wasm/prover/pkg/prover.js
var prover_exports = {};
__export(prover_exports, {
  ProverSession: () => ProverSession,
  _start: () => _start,
  default: () => __wbg_init,
  initSync: () => initSync,
  initThreadPool: () => initThreadPool,
  wbg_rayon_PoolBuilder: () => wbg_rayon_PoolBuilder,
  wbg_rayon_start_worker: () => wbg_rayon_start_worker
});
function _start() {
  wasm._start();
}
function initThreadPool(num_threads) {
  const ret = wasm.initThreadPool(num_threads);
  return takeObject(ret);
}
function wbg_rayon_start_worker(receiver) {
  wasm.wbg_rayon_start_worker(receiver);
}
function __wbg_get_imports(memory) {
  const import0 = {
    __proto__: null,
    __wbg_String_b51de6b05a10845b: function(arg0, arg1) {
      const ret = String(getObject(arg1));
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      const len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg___wbindgen_is_function_2f0fd7ceb86e64c5: function(arg0) {
      const ret = typeof getObject(arg0) === "function";
      return ret;
    },
    __wbg___wbindgen_is_object_5b22ff2418063a9c: function(arg0) {
      const val = getObject(arg0);
      const ret = typeof val === "object" && val !== null;
      return ret;
    },
    __wbg___wbindgen_is_string_eddc07a3efad52e6: function(arg0) {
      const ret = typeof getObject(arg0) === "string";
      return ret;
    },
    __wbg___wbindgen_is_undefined_244a92c34d3b6ec0: function(arg0) {
      const ret = getObject(arg0) === void 0;
      return ret;
    },
    __wbg___wbindgen_memory_c2356dd1a089dfbd: function() {
      const ret = wasm.memory;
      return addHeapObject(ret);
    },
    __wbg___wbindgen_module_df704393dfd1853c: function() {
      const ret = wasmModule;
      return addHeapObject(ret);
    },
    __wbg___wbindgen_throw_9c75d47bf9e7731e: function(arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    },
    __wbg_call_a41d6421b30a32c5: function() {
      return handleError(function(arg0, arg1, arg2) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
      }, arguments);
    },
    __wbg_crypto_38df2bab126b63dc: function(arg0) {
      const ret = getObject(arg0).crypto;
      return addHeapObject(ret);
    },
    __wbg_error_a6fa202b58aa1cd3: function(arg0, arg1) {
      let deferred0_0;
      let deferred0_1;
      try {
        deferred0_0 = arg0;
        deferred0_1 = arg1;
        console.error(getStringFromWasm0(arg0, arg1));
      } finally {
        wasm.__wbindgen_export4(deferred0_0, deferred0_1, 1);
      }
    },
    __wbg_getRandomValues_c44a50d8cfdaebeb: function() {
      return handleError(function(arg0, arg1) {
        getObject(arg0).getRandomValues(getObject(arg1));
      }, arguments);
    },
    __wbg_instanceof_Window_4153c1818a1c0c0b: function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof Window;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    },
    __wbg_length_ba3c032602efe310: function(arg0) {
      const ret = getObject(arg0).length;
      return ret;
    },
    __wbg_msCrypto_bd5a034af96bcba6: function(arg0) {
      const ret = getObject(arg0).msCrypto;
      return addHeapObject(ret);
    },
    __wbg_new_227d7c05414eb861: function() {
      const ret = new Error();
      return addHeapObject(ret);
    },
    __wbg_new_2fad8ca02fd00684: function() {
      const ret = new Object();
      return addHeapObject(ret);
    },
    __wbg_new_3baa8d9866155c79: function() {
      const ret = new Array();
      return addHeapObject(ret);
    },
    __wbg_new_with_length_9011f5da794bf5d9: function(arg0) {
      const ret = new Uint8Array(arg0 >>> 0);
      return addHeapObject(ret);
    },
    __wbg_node_84ea875411254db1: function(arg0) {
      const ret = getObject(arg0).node;
      return addHeapObject(ret);
    },
    __wbg_process_44c7a14e11e9f69e: function(arg0) {
      const ret = getObject(arg0).process;
      return addHeapObject(ret);
    },
    __wbg_prototypesetcall_fd4050e806e1d519: function(arg0, arg1, arg2) {
      Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), getObject(arg2));
    },
    __wbg_randomFillSync_6c25eac9869eb53c: function() {
      return handleError(function(arg0, arg1) {
        getObject(arg0).randomFillSync(takeObject(arg1));
      }, arguments);
    },
    __wbg_require_b4edbdcf3e2a1ef0: function() {
      return handleError(function() {
        const ret = module.require;
        return addHeapObject(ret);
      }, arguments);
    },
    __wbg_set_f071dbb3bd088e0e: function(arg0, arg1, arg2) {
      getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
    },
    __wbg_set_f614f6a0608d1d1d: function(arg0, arg1, arg2) {
      getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    },
    __wbg_stack_3b0d974bbf31e44f: function(arg0, arg1) {
      const ret = getObject(arg1).stack;
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
      const len1 = WASM_VECTOR_LEN;
      getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
      getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    },
    __wbg_startWorkers_8b582d57e92bd2d4: function(arg0, arg1, arg2) {
      const ret = startWorkers(takeObject(arg0), takeObject(arg1), wbg_rayon_PoolBuilder.__wrap(arg2));
      return addHeapObject(ret);
    },
    __wbg_static_accessor_GLOBAL_THIS_1c7f1bd6c6941fdb: function() {
      const ret = typeof globalThis === "undefined" ? null : globalThis;
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    },
    __wbg_static_accessor_GLOBAL_e039bc914f83e74e: function() {
      const ret = typeof global === "undefined" ? null : global;
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    },
    __wbg_static_accessor_SELF_8bf8c48c28420ad5: function() {
      const ret = typeof self === "undefined" ? null : self;
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    },
    __wbg_static_accessor_WINDOW_6aeee9b51652ee0f: function() {
      const ret = typeof window === "undefined" ? null : window;
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    },
    __wbg_subarray_fbe3cef290e1fa43: function(arg0, arg1, arg2) {
      const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
      return addHeapObject(ret);
    },
    __wbg_versions_276b2795b1c6a219: function(arg0) {
      const ret = getObject(arg0).versions;
      return addHeapObject(ret);
    },
    __wbindgen_cast_0000000000000001: function(arg0, arg1) {
      const ret = getArrayU8FromWasm0(arg0, arg1);
      return addHeapObject(ret);
    },
    __wbindgen_cast_0000000000000002: function(arg0, arg1) {
      const ret = getStringFromWasm0(arg0, arg1);
      return addHeapObject(ret);
    },
    __wbindgen_object_clone_ref: function(arg0) {
      const ret = getObject(arg0);
      return addHeapObject(ret);
    },
    __wbindgen_object_drop_ref: function(arg0) {
      takeObject(arg0);
    },
    memory: memory || new WebAssembly.Memory({ initial: 18, maximum: 16384, shared: true })
  };
  return {
    __proto__: null,
    "./prover_bg.js": import0
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
function handleError(f, args) {
  try {
    return f.apply(this, args);
  } catch (e2) {
    wasm.__wbindgen_export3(addHeapObject(e2));
  }
}
function isLikeNone(x) {
  return x === void 0 || x === null;
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
function __wbg_finalize_init(instance, module2, thread_stack_size) {
  wasmInstance = instance;
  wasm = instance.exports;
  wasmModule = module2;
  cachedDataViewMemory0 = null;
  cachedUint8ArrayMemory0 = null;
  if (typeof thread_stack_size !== "undefined" && (typeof thread_stack_size !== "number" || thread_stack_size === 0 || thread_stack_size % 65536 !== 0)) {
    throw new Error("invalid stack size");
  }
  wasm.__wbindgen_start(thread_stack_size);
  return wasm;
}
async function __wbg_load(module2, imports) {
  if (typeof Response === "function" && module2 instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === "function") {
      try {
        return await WebAssembly.instantiateStreaming(module2, imports);
      } catch (e2) {
        const validResponse = module2.ok && expectedResponseType(module2.type);
        if (validResponse && module2.headers.get("Content-Type") !== "application/wasm") {
          console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e2);
        } else {
          throw e2;
        }
      }
    }
    const bytes = await module2.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    const instance = await WebAssembly.instantiate(module2, imports);
    if (instance instanceof WebAssembly.Instance) {
      return { instance, module: module2 };
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
function initSync(module2, memory) {
  if (wasm !== void 0) return wasm;
  let thread_stack_size;
  if (module2 !== void 0) {
    if (Object.getPrototypeOf(module2) === Object.prototype) {
      ({ module: module2, memory, thread_stack_size } = module2);
    } else {
      console.warn("using deprecated parameters for `initSync()`; pass a single object instead");
    }
  }
  const imports = __wbg_get_imports(memory);
  if (!(module2 instanceof WebAssembly.Module)) {
    module2 = new WebAssembly.Module(module2);
  }
  const instance = new WebAssembly.Instance(module2, imports);
  return __wbg_finalize_init(instance, module2, thread_stack_size);
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
    module_or_path = new URL("prover_bg.wasm", import.meta.url);
  }
  const imports = __wbg_get_imports(memory);
  if (typeof module_or_path === "string" || typeof Request === "function" && module_or_path instanceof Request || typeof URL === "function" && module_or_path instanceof URL) {
    module_or_path = fetch(module_or_path);
  }
  const { instance, module: module2 } = await __wbg_load(await module_or_path, imports);
  return __wbg_finalize_init(instance, module2, thread_stack_size);
}
var ProverSession, wbg_rayon_PoolBuilder, ProverSessionFinalization, wbg_rayon_PoolBuilderFinalization, cachedDataViewMemory0, cachedUint8ArrayMemory0, heap, heap_next, cachedTextDecoder, MAX_SAFARI_DECODE_BYTES, numBytesDecoded, cachedTextEncoder, WASM_VECTOR_LEN, wasmModule, wasmInstance, wasm;
var init_prover = __esm({
  "node_modules/@lelantos-org/sdk/wasm/prover/pkg/prover.js"() {
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
        wasm.__wbg_proversession_free(ptr, 0);
      }
      /**
       * @param {Uint8Array} zkey_bytes
       */
      constructor(zkey_bytes) {
        try {
          const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
          const ptr0 = passArray8ToWasm0(zkey_bytes, wasm.__wbindgen_export);
          const len0 = WASM_VECTOR_LEN;
          wasm.proversession_new(retptr, ptr0, len0);
          var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
          var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
          var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
          if (r2) {
            throw takeObject(r1);
          }
          this.__wbg_ptr = r0;
          ProverSessionFinalization.register(this, this.__wbg_ptr, this);
          return this;
        } finally {
          wasm.__wbindgen_add_to_stack_pointer(16);
        }
      }
      /**
       * @param {Uint8Array} wtns_bytes
       * @returns {any}
       */
      prove(wtns_bytes) {
        try {
          const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
          const ptr0 = passArray8ToWasm0(wtns_bytes, wasm.__wbindgen_export);
          const len0 = WASM_VECTOR_LEN;
          wasm.proversession_prove(retptr, this.__wbg_ptr, ptr0, len0);
          var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
          var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
          var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
          if (r2) {
            throw takeObject(r1);
          }
          return takeObject(r0);
        } finally {
          wasm.__wbindgen_add_to_stack_pointer(16);
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
        wasm.__wbg_wbg_rayon_poolbuilder_free(ptr, 0);
      }
      build() {
        wasm.wbg_rayon_poolbuilder_build(this.__wbg_ptr);
      }
      /**
       * @returns {number}
       */
      numThreads() {
        const ret = wasm.wbg_rayon_poolbuilder_numThreads(this.__wbg_ptr);
        return ret >>> 0;
      }
      /**
       * @returns {number}
       */
      receiver() {
        const ret = wasm.wbg_rayon_poolbuilder_receiver(this.__wbg_ptr);
        return ret >>> 0;
      }
    };
    if (Symbol.dispose) wbg_rayon_PoolBuilder.prototype[Symbol.dispose] = wbg_rayon_PoolBuilder.prototype.free;
    ProverSessionFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
    }, unregister: () => {
    } } : new FinalizationRegistry((ptr) => wasm.__wbg_proversession_free(ptr, 1));
    wbg_rayon_PoolBuilderFinalization = typeof FinalizationRegistry === "undefined" ? { register: () => {
    }, unregister: () => {
    } } : new FinalizationRegistry((ptr) => wasm.__wbg_wbg_rayon_poolbuilder_free(ptr, 1));
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

// node_modules/circom_runtime/js/utils.js
function flatArray(a) {
  let res = [];
  fillArray(res, a);
  return res;
  function fillArray(res2, a2) {
    if (Array.isArray(a2)) {
      for (let i = 0; i < a2.length; i++) {
        fillArray(res2, a2[i]);
      }
    } else {
      res2.push(a2);
    }
  }
}
function normalize(n, prime) {
  let res = BigInt(n) % prime;
  if (res < 0) res += prime;
  return res;
}
function fnvHash(str) {
  const uint64_max = BigInt(2) ** BigInt(64);
  let hash = BigInt("0xCBF29CE484222325");
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str[i].charCodeAt(0));
    hash *= BigInt(1099511628211);
    hash %= uint64_max;
  }
  let shash = hash.toString(16);
  let n = 16 - shash.length;
  shash = "0".repeat(n).concat(shash);
  return shash;
}
function toArray32(s, size) {
  const res = [];
  let rem = BigInt(s);
  const radix = BigInt(4294967296);
  while (rem) {
    res.unshift(Number(rem % radix));
    rem = rem / radix;
  }
  if (size) {
    let i = size - res.length;
    while (i > 0) {
      res.unshift(0);
      i--;
    }
  }
  return res;
}

// node_modules/circom_runtime/node_modules/ffjavascript/build/browser.esm.js
var hexLen = [0, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4, 4];
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
var e = fromString;
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
var shl = shiftLeft;
var shr = shiftRight;
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
function toRprLE(buff, o, e2, n8) {
  const s = "0000000" + e2.toString(16);
  const v = new Uint32Array(buff.buffer, buff.byteOffset + o, n8 / 4);
  const l = ((s.length - 7) * 4 - 1 >> 5) + 1;
  for (let i = 0; i < l; i++) v[i] = parseInt(s.substring(s.length - 8 * i - 8, s.length - 8 * i), 16);
  for (let i = l; i < v.length; i++) v[i] = 0;
  for (let i = v.length * 4; i < n8; i++) buff[i] = toNumber$1(band(shiftRight(e2, i * 8), 255));
}
function toRprBE(buff, o, e2, n8) {
  const s = "0000000" + e2.toString(16);
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
var zero = e(0);
var one = e(1);
var _Scalar = /* @__PURE__ */ Object.freeze({
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
var _revTable$1 = [];
for (let i = 0; i < 256; i++) {
  _revTable$1[i] = _revSlow$1(i, 8);
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
function exp(F, base, e2) {
  if (isZero$1(e2)) return F.one;
  const n = bits(e2);
  if (n.length == 0) return F.one;
  let res = base;
  for (let i = n.length - 2; i >= 0; i--) {
    res = F.square(res);
    if (n[i]) {
      res = F.mul(res, base);
    }
  }
  return res;
}
function buildSqrt(F) {
  if (F.m % 2 == 1) {
    if (eq(mod(F.p, 4), 1)) {
      if (eq(mod(F.p, 8), 1)) {
        if (eq(mod(F.p, 16), 1)) {
          alg5_tonelliShanks(F);
        } else if (eq(mod(F.p, 16), 9)) {
          alg4_kong(F);
        } else {
          throw new Error("Field withot sqrt");
        }
      } else if (eq(mod(F.p, 8), 5)) {
        alg3_atkin(F);
      } else {
        throw new Error("Field withot sqrt");
      }
    } else if (eq(mod(F.p, 4), 3)) {
      alg2_shanks(F);
    }
  } else {
    const pm2mod4 = mod(pow(F.p, F.m / 2), 4);
    if (pm2mod4 == 1) {
      alg10_adj(F);
    } else if (pm2mod4 == 3) {
      alg9_adj(F);
    } else {
      alg8_complex(F);
    }
  }
}
function alg5_tonelliShanks(F) {
  F.sqrt_q = pow(F.p, F.m);
  F.sqrt_s = 0;
  F.sqrt_t = sub(F.sqrt_q, 1);
  while (!isOdd$5(F.sqrt_t)) {
    F.sqrt_s = F.sqrt_s + 1;
    F.sqrt_t = div(F.sqrt_t, 2);
  }
  let c0 = F.one;
  while (F.eq(c0, F.one)) {
    const c = F.random();
    F.sqrt_z = F.pow(c, F.sqrt_t);
    c0 = F.pow(F.sqrt_z, 2 ** (F.sqrt_s - 1));
  }
  F.sqrt_tm1d2 = div(sub(F.sqrt_t, 1), 2);
  F.sqrt = function(a) {
    const F2 = this;
    if (F2.isZero(a)) return F2.zero;
    let w = F2.pow(a, F2.sqrt_tm1d2);
    const a0 = F2.pow(F2.mul(F2.square(w), a), 2 ** (F2.sqrt_s - 1));
    if (F2.eq(a0, F2.negone)) return null;
    let v = F2.sqrt_s;
    let x = F2.mul(a, w);
    let b = F2.mul(x, w);
    let z = F2.sqrt_z;
    while (!F2.eq(b, F2.one)) {
      let b2k = F2.square(b);
      let k = 1;
      while (!F2.eq(b2k, F2.one)) {
        b2k = F2.square(b2k);
        k++;
      }
      w = z;
      for (let i = 0; i < v - k - 1; i++) {
        w = F2.square(w);
      }
      z = F2.square(w);
      b = F2.mul(b, z);
      x = F2.mul(x, w);
      v = k;
    }
    return F2.geq(x, F2.zero) ? x : F2.neg(x);
  };
}
function alg4_kong(F) {
  F.sqrt = function() {
    throw new Error("Sqrt alg 4 not implemented");
  };
}
function alg3_atkin(F) {
  F.sqrt = function() {
    throw new Error("Sqrt alg 3 not implemented");
  };
}
function alg2_shanks(F) {
  F.sqrt_q = pow(F.p, F.m);
  F.sqrt_e1 = div(sub(F.sqrt_q, 3), 4);
  F.sqrt = function(a) {
    if (this.isZero(a)) return this.zero;
    const a1 = this.pow(a, this.sqrt_e1);
    const a0 = this.mul(this.square(a1), a);
    if (this.eq(a0, this.negone)) return null;
    const x = this.mul(a1, a);
    return F.geq(x, F.zero) ? x : F.neg(x);
  };
}
function alg10_adj(F) {
  F.sqrt = function() {
    throw new Error("Sqrt alg 10 not implemented");
  };
}
function alg9_adj(F) {
  F.sqrt_q = pow(F.p, F.m / 2);
  F.sqrt_e34 = div(sub(F.sqrt_q, 3), 4);
  F.sqrt_e12 = div(sub(F.sqrt_q, 1), 2);
  F.frobenius = function(n, x) {
    if (n % 2 == 1) {
      return F.conjugate(x);
    } else {
      return x;
    }
  };
  F.sqrt = function(a) {
    const F2 = this;
    const a1 = F2.pow(a, F2.sqrt_e34);
    const alfa = F2.mul(F2.square(a1), a);
    const a0 = F2.mul(F2.frobenius(1, alfa), alfa);
    if (F2.eq(a0, F2.negone)) return null;
    const x0 = F2.mul(a1, a);
    let x;
    if (F2.eq(alfa, F2.negone)) {
      x = F2.mul(x0, [F2.F.zero, F2.F.one]);
    } else {
      const b = F2.pow(F2.add(F2.one, alfa), F2.sqrt_e12);
      x = F2.mul(b, x0);
    }
    return F2.geq(x, F2.zero) ? x : F2.neg(x);
  };
}
function alg8_complex(F) {
  F.sqrt = function() {
    throw new Error("Sqrt alg 8 not implemented");
  };
}
function getRandomBytes(n) {
  let array = new Uint8Array(n);
  {
    if (typeof globalThis.crypto !== "undefined") {
      globalThis.crypto.getRandomValues(array);
    } else {
      for (let i = 0; i < n; i++) {
        array[i] = Math.random() * 4294967296 >>> 0;
      }
    }
  }
  return array;
}
var FFT = class {
  constructor(G, F, opMulGF) {
    this.F = F;
    this.G = G;
    this.opMulGF = opMulGF;
    let rem = F.sqrt_t || F.t;
    let s = F.sqrt_s || F.s;
    let nqr = F.one;
    while (F.eq(F.pow(nqr, F.half), F.one)) nqr = F.add(nqr, F.one);
    this.w = new Array(s + 1);
    this.wi = new Array(s + 1);
    this.w[s] = this.F.pow(nqr, rem);
    this.wi[s] = this.F.inv(this.w[s]);
    let n = s - 1;
    while (n >= 0) {
      this.w[n] = this.F.square(this.w[n + 1]);
      this.wi[n] = this.F.square(this.wi[n + 1]);
      n--;
    }
    this.roots = [];
    this._setRoots(Math.min(s, 15));
  }
  _setRoots(n) {
    for (let i = n; i >= 0 && !this.roots[i]; i--) {
      let r = this.F.one;
      const nroots = 1 << i;
      const rootsi = new Array(nroots);
      for (let j = 0; j < nroots; j++) {
        rootsi[j] = r;
        r = this.F.mul(r, this.w[i]);
      }
      this.roots[i] = rootsi;
    }
  }
  fft(p) {
    if (p.length <= 1) return p;
    const bits2 = log2$1(p.length - 1) + 1;
    this._setRoots(bits2);
    const m = 1 << bits2;
    if (p.length != m) {
      throw new Error("Size must be multiple of 2");
    }
    const res = __fft(this, p, bits2, 0, 1);
    return res;
  }
  ifft(p) {
    if (p.length <= 1) return p;
    const bits2 = log2$1(p.length - 1) + 1;
    this._setRoots(bits2);
    const m = 1 << bits2;
    if (p.length != m) {
      throw new Error("Size must be multiple of 2");
    }
    const res = __fft(this, p, bits2, 0, 1);
    const twoinvm = this.F.inv(this.F.mulScalar(this.F.one, m));
    const resn = new Array(m);
    for (let i = 0; i < m; i++) {
      resn[i] = this.opMulGF(res[(m - i) % m], twoinvm);
    }
    return resn;
  }
};
function log2$1(V) {
  return ((V & 4294901760) !== 0 ? (V &= 4294901760, 16) : 0) | ((V & 4278255360) !== 0 ? (V &= 4278255360, 8) : 0) | ((V & 4042322160) !== 0 ? (V &= 4042322160, 4) : 0) | ((V & 3435973836) !== 0 ? (V &= 3435973836, 2) : 0) | (V & 2863311530) !== 0;
}
function __fft(PF, pall, bits2, offset, step) {
  const n = 1 << bits2;
  if (n == 1) {
    return [pall[offset]];
  } else if (n == 2) {
    return [
      PF.G.add(pall[offset], pall[offset + step]),
      PF.G.sub(pall[offset], pall[offset + step])
    ];
  }
  const ndiv2 = n >> 1;
  const p1 = __fft(PF, pall, bits2 - 1, offset, step * 2);
  const p2 = __fft(PF, pall, bits2 - 1, offset + step, step * 2);
  const out = new Array(n);
  for (let i = 0; i < ndiv2; i++) {
    out[i] = PF.G.add(p1[i], PF.opMulGF(p2[i], PF.roots[bits2][i]));
    out[i + ndiv2] = PF.G.sub(p1[i], PF.opMulGF(p2[i], PF.roots[bits2][i]));
  }
  return out;
}
var ZqField = class {
  constructor(p) {
    this.type = "F1";
    this.one = BigInt(1);
    this.zero = BigInt(0);
    this.p = BigInt(p);
    this.m = 1;
    this.negone = this.p - this.one;
    this.two = BigInt(2);
    this.half = this.p >> this.one;
    this.bitLength = bitLength$6(this.p);
    this.mask = (this.one << BigInt(this.bitLength)) - this.one;
    this.n64 = Math.floor((this.bitLength - 1) / 64) + 1;
    this.n32 = this.n64 * 2;
    this.n8 = this.n64 * 8;
    this.R = this.e(this.one << BigInt(this.n64 * 64));
    this.Ri = this.inv(this.R);
    const e2 = this.negone >> this.one;
    this.nqr = this.two;
    let r = this.pow(this.nqr, e2);
    while (!this.eq(r, this.negone)) {
      this.nqr = this.nqr + this.one;
      r = this.pow(this.nqr, e2);
    }
    this.s = 0;
    this.t = this.negone;
    while ((this.t & this.one) == this.zero) {
      this.s = this.s + 1;
      this.t = this.t >> this.one;
    }
    this.nqr_to_t = this.pow(this.nqr, this.t);
    buildSqrt(this);
    this.FFT = new FFT(this, this, this.mul.bind(this));
    this.fft = this.FFT.fft.bind(this.FFT);
    this.ifft = this.FFT.ifft.bind(this.FFT);
    this.w = this.FFT.w;
    this.wi = this.FFT.wi;
    this.shift = this.square(this.nqr);
    this.k = this.exp(this.nqr, 2 ** this.s);
  }
  e(a, b) {
    let res;
    if (!b) {
      res = BigInt(a);
    } else if (b == 16) {
      res = BigInt("0x" + a);
    }
    if (res < 0) {
      let nres = -res;
      if (nres >= this.p) nres = nres % this.p;
      return this.p - nres;
    } else {
      return res >= this.p ? res % this.p : res;
    }
  }
  add(a, b) {
    const res = a + b;
    return res >= this.p ? res - this.p : res;
  }
  sub(a, b) {
    return a >= b ? a - b : this.p - b + a;
  }
  neg(a) {
    return a ? this.p - a : a;
  }
  mul(a, b) {
    return a * b % this.p;
  }
  mulScalar(base, s) {
    return base * this.e(s) % this.p;
  }
  square(a) {
    return a * a % this.p;
  }
  eq(a, b) {
    return a == b;
  }
  neq(a, b) {
    return a != b;
  }
  lt(a, b) {
    const aa = a > this.half ? a - this.p : a;
    const bb = b > this.half ? b - this.p : b;
    return aa < bb;
  }
  gt(a, b) {
    const aa = a > this.half ? a - this.p : a;
    const bb = b > this.half ? b - this.p : b;
    return aa > bb;
  }
  leq(a, b) {
    const aa = a > this.half ? a - this.p : a;
    const bb = b > this.half ? b - this.p : b;
    return aa <= bb;
  }
  geq(a, b) {
    const aa = a > this.half ? a - this.p : a;
    const bb = b > this.half ? b - this.p : b;
    return aa >= bb;
  }
  div(a, b) {
    return this.mul(a, this.inv(b));
  }
  idiv(a, b) {
    if (!b) throw new Error("Division by zero");
    return a / b;
  }
  inv(a) {
    if (!a) throw new Error("Division by zero");
    let t = this.zero;
    let r = this.p;
    let newt = this.one;
    let newr = a % this.p;
    while (newr) {
      let q = r / newr;
      [t, newt] = [newt, t - q * newt];
      [r, newr] = [newr, r - q * newr];
    }
    if (t < this.zero) t += this.p;
    return t;
  }
  mod(a, b) {
    return a % b;
  }
  pow(b, e2) {
    return exp(this, b, e2);
  }
  exp(b, e2) {
    return exp(this, b, e2);
  }
  band(a, b) {
    const res = a & b & this.mask;
    return res >= this.p ? res - this.p : res;
  }
  bor(a, b) {
    const res = (a | b) & this.mask;
    return res >= this.p ? res - this.p : res;
  }
  bxor(a, b) {
    const res = (a ^ b) & this.mask;
    return res >= this.p ? res - this.p : res;
  }
  bnot(a) {
    const res = a ^ this.mask;
    return res >= this.p ? res - this.p : res;
  }
  shl(a, b) {
    if (Number(b) < this.bitLength) {
      const res = a << b & this.mask;
      return res >= this.p ? res - this.p : res;
    } else {
      const nb = this.p - b;
      if (Number(nb) < this.bitLength) {
        return a >> nb;
      } else {
        return this.zero;
      }
    }
  }
  shr(a, b) {
    if (Number(b) < this.bitLength) {
      return a >> b;
    } else {
      const nb = this.p - b;
      if (Number(nb) < this.bitLength) {
        const res = a << nb & this.mask;
        return res >= this.p ? res - this.p : res;
      } else {
        return 0;
      }
    }
  }
  land(a, b) {
    return a && b ? this.one : this.zero;
  }
  lor(a, b) {
    return a || b ? this.one : this.zero;
  }
  lnot(a) {
    return a ? this.zero : this.one;
  }
  sqrt_old(n) {
    if (n == this.zero) return this.zero;
    const res = this.pow(n, this.negone >> this.one);
    if (res != this.one) return null;
    let m = this.s;
    let c = this.nqr_to_t;
    let t = this.pow(n, this.t);
    let r = this.pow(n, this.add(this.t, this.one) >> this.one);
    while (t != this.one) {
      let sq = this.square(t);
      let i = 1;
      while (sq != this.one) {
        i++;
        sq = this.square(sq);
      }
      let b = c;
      for (let j = 0; j < m - i - 1; j++) b = this.square(b);
      m = i;
      c = this.square(b);
      t = this.mul(t, c);
      r = this.mul(r, b);
    }
    if (r > this.p >> this.one) {
      r = this.neg(r);
    }
    return r;
  }
  normalize(a, b) {
    a = BigInt(a, b);
    if (a < 0) {
      let na = -a;
      if (na >= this.p) na = na % this.p;
      return this.p - na;
    } else {
      return a >= this.p ? a % this.p : a;
    }
  }
  random() {
    const nBytes = this.bitLength * 2 / 8;
    let res = this.zero;
    for (let i = 0; i < nBytes; i++) {
      res = (res << BigInt(8)) + BigInt(getRandomBytes(1)[0]);
    }
    return res % this.p;
  }
  toString(a, base) {
    base = base || 10;
    let vs;
    if (a > this.half && base == 10) {
      const v = this.p - a;
      vs = "-" + v.toString(base);
    } else {
      vs = a.toString(base);
    }
    return vs;
  }
  isZero(a) {
    return a == this.zero;
  }
  fromRng(rng) {
    let v;
    do {
      v = this.zero;
      for (let i = 0; i < this.n64; i++) {
        v += rng.nextU64() << BigInt(64 * i);
      }
      v &= this.mask;
    } while (v >= this.p);
    v = v * this.Ri % this.p;
    return v;
  }
  fft(a) {
    return this.FFT.fft(a);
  }
  ifft(a) {
    return this.FFT.ifft(a);
  }
  // Returns a buffer with Little Endian Representation
  toRprLE(buff, o, e2) {
    toRprLE(buff, o, e2, this.n64 * 8);
  }
  // Returns a buffer with Big Endian Representation
  toRprBE(buff, o, e2) {
    toRprBE(buff, o, e2, this.n64 * 8);
  }
  // Returns a buffer with Big Endian Montgomery Representation
  toRprBEM(buff, o, e2) {
    return this.toRprBE(buff, o, this.mul(this.R, e2));
  }
  toRprLEM(buff, o, e2) {
    return this.toRprLE(buff, o, this.mul(this.R, e2));
  }
  // Pases a buffer with Little Endian Representation
  fromRprLE(buff, o) {
    return fromRprLE(buff, o, this.n8);
  }
  // Pases a buffer with Big Endian Representation
  fromRprBE(buff, o) {
    return fromRprBE(buff, o, this.n8);
  }
  fromRprLEM(buff, o) {
    return this.mul(this.fromRprLE(buff, o), this.Ri);
  }
  fromRprBEM(buff, o) {
    return this.mul(this.fromRprBE(buff, o), this.Ri);
  }
  toObject(a) {
    return a;
  }
};
var utils$6 = {};
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
var bigint = {};
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
function modPow$2(n, exp2, mod2) {
  if (mod2 === 0n) throw new Error("Cannot take modPow with modulus 0");
  var r = 1n, base = n % mod2;
  if (isNegative$3(exp2)) {
    exp2 = exp2 * -1n;
    base = modInv$3(base, mod2);
  }
  while (isPositive(exp2)) {
    if (base === 0n) return 0n;
    if (isOdd$4(exp2)) r = r * base % mod2;
    exp2 = exp2 / 2n;
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
  var isPrime2 = isBasicPrime(p);
  if (isPrime2 !== void 0) return isPrime2;
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
var { bitLength: bitLength$4, modInv: modInv$2, modPow: modPow$1, isPrime, isOdd: isOdd$3, square } = bigint;
var { bitLength: bitLength$3 } = bigint;
var { isOdd: isOdd$2, modInv: modInv$1, modPow } = bigint;
var { bitLength: bitLength$2, modInv, isOdd: isOdd$1, isNegative: isNegative$2 } = bigint;
var { bitLength: bitLength$1, isOdd, isNegative: isNegative$1 } = bigint;
var _revTable = [];
for (let i = 0; i < 256; i++) {
  _revTable[i] = _revSlow(i, 8);
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
var PAGE_SIZE = 1 << 30;
var workerSource;
var threadStr = `(${'function thread(self) {\n    const MAXMEM = 32767;\n    let instance;\n    let memory;\n\n    if (self) {\n        self.onmessage = function(e) {\n            let data;\n            if (e.data) {\n                data = e.data;\n            } else {\n                data = e;\n            }\n\n            if (data[0].cmd == "INIT") {\n                init(data[0]).then(function() {\n                    self.postMessage(data.result);\n                });\n            } else if (data[0].cmd == "TERMINATE") {\n                self.close();\n            } else {\n                const res = runTask(data);\n                self.postMessage(res);\n            }\n        };\n    }\n\n    async function init(data) {\n        const code = new Uint8Array(data.code);\n        const wasmModule = await WebAssembly.compile(code);\n        memory = new WebAssembly.Memory({initial:data.init, maximum: MAXMEM});\n\n        instance = await WebAssembly.instantiate(wasmModule, {\n            env: {\n                "memory": memory\n            }\n        });\n    }\n\n\n\n    function alloc(length) {\n        const u32 = new Uint32Array(memory.buffer, 0, 1);\n        while (u32[0] & 3) u32[0]++;  // Return always aligned pointers\n        const res = u32[0];\n        u32[0] += length;\n        if (u32[0] + length > memory.buffer.byteLength) {\n            const currentPages = memory.buffer.byteLength / 0x10000;\n            let requiredPages = Math.floor((u32[0] + length) / 0x10000)+1;\n            if (requiredPages>MAXMEM) requiredPages=MAXMEM;\n            memory.grow(requiredPages-currentPages);\n        }\n        return res;\n    }\n\n    function allocBuffer(buffer) {\n        const p = alloc(buffer.byteLength);\n        setBuffer(p, buffer);\n        return p;\n    }\n\n    function getBuffer(pointer, length) {\n        const u8 = new Uint8Array(memory.buffer);\n        return new Uint8Array(u8.buffer, u8.byteOffset + pointer, length);\n    }\n\n    function setBuffer(pointer, buffer) {\n        const u8 = new Uint8Array(memory.buffer);\n        u8.set(new Uint8Array(buffer), pointer);\n    }\n\n    function runTask(task) {\n        if (task[0].cmd == "INIT") {\n            return init(task[0]);\n        }\n        const ctx = {\n            vars: [],\n            out: []\n        };\n        const u32a = new Uint32Array(memory.buffer, 0, 1);\n        const oldAlloc = u32a[0];\n        for (let i=0; i<task.length; i++) {\n            switch (task[i].cmd) {\n            case "ALLOCSET":\n                ctx.vars[task[i].var] = allocBuffer(task[i].buff);\n                break;\n            case "ALLOC":\n                ctx.vars[task[i].var] = alloc(task[i].len);\n                break;\n            case "SET":\n                setBuffer(ctx.vars[task[i].var], task[i].buff);\n                break;\n            case "CALL": {\n                const params = [];\n                for (let j=0; j<task[i].params.length; j++) {\n                    const p = task[i].params[j];\n                    if (typeof p.var !== "undefined") {\n                        params.push(ctx.vars[p.var] + (p.offset || 0));\n                    } else if (typeof p.val != "undefined") {\n                        params.push(p.val);\n                    }\n                }\n                instance.exports[task[i].fnName](...params);\n                break;\n            }\n            case "GET":\n                ctx.out[task[i].out] = getBuffer(ctx.vars[task[i].var], task[i].len).slice();\n                break;\n            default:\n                throw new Error("Invalid cmd");\n            }\n        }\n        const u32b = new Uint32Array(memory.buffer, 0, 1);\n        u32b[0] = oldAlloc;\n        return ctx.out;\n    }\n\n\n    return runTask;\n}'})(self)`;
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
var bls12381r = e("73eda753299d7d483339d80809a1d80553bda402fffe5bfeffffffff00000001", 16);
var bn128r = e("21888242871839275222246405745257275088548364400416034343698204186575808495617");
var bls12381q = e("1a0111ea397fe69a4b1ba7b6434bacd764774b84f38512bf6730d2a0f6b0f6241eabfffeb153ffffb9feffffffffaaab", 16);
var bn128q = e("21888242871839275222246405745257275088696311157297823662689037894645226208583");
var Scalar = _Scalar;

// node_modules/circom_runtime/js/witness_calculator.js
async function builder(code, options) {
  let instance;
  let wc;
  let memory;
  options = options || {};
  let majorVersion = 1;
  let minorVersion = 0;
  let patchVersion = 0;
  let codeIsWebAssemblyInstance = false;
  if (code instanceof WebAssembly.Instance) {
    instance = code;
    codeIsWebAssemblyInstance = true;
  } else {
    let memorySize = 32767;
    if (options.memorySize) {
      memorySize = parseInt(options.memorySize);
      if (memorySize < 0) {
        throw new Error("Invalid memory size");
      }
    }
    let memoryAllocated = false;
    while (!memoryAllocated) {
      try {
        memory = new WebAssembly.Memory({ initial: memorySize });
        memoryAllocated = true;
      } catch (err) {
        if (memorySize <= 1) {
          throw err;
        }
        console.warn("Could not allocate " + memorySize * 1024 * 64 + " bytes. This may cause severe instability. Trying with " + memorySize * 1024 * 64 / 2 + " bytes");
        memorySize = Math.floor(memorySize / 2);
      }
    }
    const wasmModule2 = await WebAssembly.compile(code);
    let errStr = "";
    let msgStr = "";
    instance = await WebAssembly.instantiate(wasmModule2, {
      env: {
        "memory": memory
      },
      runtime: {
        printDebug: function(value) {
          console.log("printDebug:", value);
        },
        exceptionHandler: function(code2) {
          let err;
          if (code2 === 1) {
            err = "Signal not found. ";
          } else if (code2 === 2) {
            err = "Too many signals set. ";
          } else if (code2 === 3) {
            err = "Signal already set. ";
          } else if (code2 === 4) {
            err = "Assert Failed. ";
          } else if (code2 === 5) {
            err = "Not enough memory. ";
          } else if (code2 === 6) {
            err = "Input signal array access exceeds the size. ";
          } else {
            err = "Unknown error. ";
          }
          console.error("ERROR: ", code2, errStr);
          throw new Error(err + errStr);
        },
        // A new way of logging messages was added in Circom 2.0.7 that requires 2 new imports
        // `printErrorMessage` and `writeBufferMessage`.
        printErrorMessage: function() {
          errStr += getMessage() + "\n";
        },
        writeBufferMessage: function() {
          const msg = getMessage();
          if (msg === "\n") {
            console.log(msgStr);
            msgStr = "";
          } else {
            if (msgStr !== "") {
              msgStr += " ";
            }
            msgStr += msg;
          }
        },
        showSharedRWMemory: function() {
          const shared_rw_memory_size = instance.exports.getFieldNumLen32();
          const arr = new Uint32Array(shared_rw_memory_size);
          for (let j = 0; j < shared_rw_memory_size; j++) {
            arr[shared_rw_memory_size - 1 - j] = instance.exports.readSharedRWMemory(j);
          }
          if (majorVersion >= 2 && (minorVersion >= 1 || patchVersion >= 7)) {
            if (msgStr !== "") {
              msgStr += " ";
            }
            const msg = Scalar.fromArray(arr, 4294967296).toString();
            msgStr += msg;
          } else {
            console.log(Scalar.fromArray(arr, 4294967296));
          }
        },
        error: function(code2, pstr, a, b, c, d) {
          let errStr2;
          if (code2 === 7) {
            errStr2 = p2str(pstr) + " " + wc.getFr(b).toString() + " != " + wc.getFr(c).toString() + " " + p2str(d);
          } else if (code2 === 9) {
            errStr2 = p2str(pstr) + " " + wc.getFr(b).toString() + " " + p2str(c);
          } else if (code2 === 5 && options.sym) {
            errStr2 = p2str(pstr) + " " + options.sym.labelIdx2Name[c];
          } else {
            errStr2 = p2str(pstr) + " " + a + " " + b + " " + c + " " + d;
          }
          console.log("ERROR: ", code2, errStr2);
          throw new Error(errStr2);
        },
        log: function(a) {
          console.log(wc.getFr(a).toString());
        },
        logGetSignal: function(signal, pVal) {
          if (options.logGetSignal) {
            options.logGetSignal(signal, wc.getFr(pVal));
          }
        },
        logSetSignal: function(signal, pVal) {
          if (options.logSetSignal) {
            options.logSetSignal(signal, wc.getFr(pVal));
          }
        },
        logStartComponent: function(cIdx) {
          if (options.logStartComponent) {
            options.logStartComponent(cIdx);
          }
        },
        logFinishComponent: function(cIdx) {
          if (options.logFinishComponent) {
            options.logFinishComponent(cIdx);
          }
        }
      }
    });
  }
  if (typeof instance.exports.getVersion == "function") {
    majorVersion = instance.exports.getVersion();
  }
  if (typeof instance.exports.getMinorVersion == "function") {
    minorVersion = instance.exports.getMinorVersion();
  }
  if (typeof instance.exports.getPatchVersion == "function") {
    patchVersion = instance.exports.getPatchVersion();
  }
  const sanityCheck = options && (options.sanityCheck || options.logGetSignal || options.logSetSignal || options.logStartComponent || options.logFinishComponent);
  if (majorVersion === 2) {
    wc = new WitnessCalculatorCircom2(instance, sanityCheck);
  } else if (majorVersion === 1) {
    if (codeIsWebAssemblyInstance) {
      throw new Error("Loading code from WebAssembly instance is not supported for circom version 1");
    }
    wc = new WitnessCalculatorCircom1(memory, instance, sanityCheck);
  } else {
    throw new Error(`Unsupported circom version: ${majorVersion}`);
  }
  return wc;
  function getMessage() {
    let message = "";
    let c = instance.exports.getMessageChar();
    while (c !== 0) {
      message += String.fromCharCode(c);
      c = instance.exports.getMessageChar();
    }
    return message;
  }
  function p2str(p) {
    const i8 = new Uint8Array(memory.buffer);
    const bytes = [];
    for (let i = 0; i8[p + i] > 0; i++) bytes.push(i8[p + i]);
    return String.fromCharCode.apply(null, bytes);
  }
}
var WitnessCalculatorCircom1 = class {
  constructor(memory, instance, sanityCheck) {
    this.memory = memory;
    this.i32 = new Uint32Array(memory.buffer);
    this.instance = instance;
    this.n32 = (this.instance.exports.getFrLen() >> 2) - 2;
    const pRawPrime = this.instance.exports.getPRawPrime();
    const arr = new Array(this.n32);
    for (let i = 0; i < this.n32; i++) {
      arr[this.n32 - 1 - i] = this.i32[(pRawPrime >> 2) + i];
    }
    this.prime = Scalar.fromArray(arr, 4294967296);
    this.Fr = new ZqField(this.prime);
    this.mask32 = Scalar.fromString("FFFFFFFF", 16);
    this.NVars = this.instance.exports.getNVars();
    this.n64 = Math.floor((this.Fr.bitLength - 1) / 64) + 1;
    this.R = this.Fr.e(Scalar.shiftLeft(1, this.n64 * 64));
    this.RInv = this.Fr.inv(this.R);
    this.sanityCheck = sanityCheck;
  }
  circom_version() {
    return 1;
  }
  async _doCalculateWitness(input, sanityCheck) {
    this.instance.exports.init(this.sanityCheck || sanityCheck ? 1 : 0);
    const pSigOffset = this.allocInt();
    const pFr = this.allocFr();
    const keys = Object.keys(input);
    keys.forEach((k) => {
      const h = fnvHash(k);
      const hMSB = parseInt(h.slice(0, 8), 16);
      const hLSB = parseInt(h.slice(8, 16), 16);
      try {
        this.instance.exports.getSignalOffset32(pSigOffset, 0, hMSB, hLSB);
      } catch (err) {
        throw new Error(`Signal ${k} is not an input of the circuit.`);
      }
      const sigOffset = this.getInt(pSigOffset);
      const fArr = flatArray(input[k]);
      for (let i = 0; i < fArr.length; i++) {
        this.setFr(pFr, fArr[i]);
        this.instance.exports.setSignal(0, 0, sigOffset + i, pFr);
      }
    });
  }
  async calculateWitness(input, sanityCheck) {
    const self2 = this;
    const old0 = self2.i32[0];
    const w = [];
    await self2._doCalculateWitness(input, sanityCheck);
    for (let i = 0; i < self2.NVars; i++) {
      const pWitness = self2.instance.exports.getPWitness(i);
      w.push(self2.getFr(pWitness));
    }
    self2.i32[0] = old0;
    return w;
  }
  async calculateBinWitness(input, sanityCheck) {
    const self2 = this;
    const old0 = self2.i32[0];
    await self2._doCalculateWitness(input, sanityCheck);
    const pWitnessBuffer = self2.instance.exports.getWitnessBuffer();
    self2.i32[0] = old0;
    const buff = self2.memory.buffer.slice(pWitnessBuffer, pWitnessBuffer + self2.NVars * self2.n64 * 8);
    return new Uint8Array(buff);
  }
  allocInt() {
    const p = this.i32[0];
    this.i32[0] = p + 8;
    return p;
  }
  allocFr() {
    const p = this.i32[0];
    this.i32[0] = p + this.n32 * 4 + 8;
    return p;
  }
  getInt(p) {
    return this.i32[p >> 2];
  }
  setInt(p, v) {
    this.i32[p >> 2] = v;
  }
  getFr(p) {
    const self2 = this;
    const idx = p >> 2;
    if (self2.i32[idx + 1] & 2147483648) {
      const arr = new Array(self2.n32);
      for (let i = 0; i < self2.n32; i++) {
        arr[self2.n32 - 1 - i] = self2.i32[idx + 2 + i];
      }
      const res = self2.Fr.e(Scalar.fromArray(arr, 4294967296));
      if (self2.i32[idx + 1] & 1073741824) {
        return fromMontgomery(res);
      } else {
        return res;
      }
    } else {
      if (self2.i32[idx] & 2147483648) {
        return self2.Fr.e(self2.i32[idx] - 4294967296);
      } else {
        return self2.Fr.e(self2.i32[idx]);
      }
    }
    function fromMontgomery(n) {
      return self2.Fr.mul(self2.RInv, n);
    }
  }
  setFr(p, v) {
    const self2 = this;
    v = self2.Fr.e(v);
    const minShort = self2.Fr.neg(self2.Fr.e("80000000", 16));
    const maxShort = self2.Fr.e("7FFFFFFF", 16);
    if (self2.Fr.geq(v, minShort) && self2.Fr.leq(v, maxShort)) {
      let a;
      if (self2.Fr.geq(v, self2.Fr.zero)) {
        a = Scalar.toNumber(v);
      } else {
        a = Scalar.toNumber(self2.Fr.sub(v, minShort));
        a = a - 2147483648;
        a = 4294967296 + a;
      }
      self2.i32[p >> 2] = a;
      self2.i32[(p >> 2) + 1] = 0;
      return;
    }
    self2.i32[p >> 2] = 0;
    self2.i32[(p >> 2) + 1] = 2147483648;
    const arr = Scalar.toArray(v, 4294967296);
    for (let i = 0; i < self2.n32; i++) {
      const idx = arr.length - 1 - i;
      if (idx >= 0) {
        self2.i32[(p >> 2) + 2 + i] = arr[idx];
      } else {
        self2.i32[(p >> 2) + 2 + i] = 0;
      }
    }
  }
};
var WitnessCalculatorCircom2 = class {
  constructor(instance, sanityCheck) {
    this.instance = instance;
    this.version = this.instance.exports.getVersion();
    this.n32 = this.instance.exports.getFieldNumLen32();
    this.instance.exports.getRawPrime();
    const arr = new Uint32Array(this.n32);
    for (let i = 0; i < this.n32; i++) {
      arr[this.n32 - 1 - i] = this.instance.exports.readSharedRWMemory(i);
    }
    this.prime = Scalar.fromArray(arr, 4294967296);
    this.witnessSize = this.instance.exports.getWitnessSize();
    this.sanityCheck = sanityCheck;
  }
  circom_version() {
    return this.instance.exports.getVersion();
  }
  async _doCalculateWitness(input, sanityCheck) {
    this.instance.exports.init(this.sanityCheck || sanityCheck ? 1 : 0);
    const keys = Object.keys(input);
    let input_counter = 0;
    keys.forEach((k) => {
      const h = fnvHash(k);
      const hMSB = parseInt(h.slice(0, 8), 16);
      const hLSB = parseInt(h.slice(8, 16), 16);
      const fArr = flatArray(input[k]);
      if (typeof this.instance.exports.getInputSignalSize === "function") {
        let signalSize = this.instance.exports.getInputSignalSize(hMSB, hLSB);
        if (signalSize < 0) {
          throw new Error(`Signal ${k} not found
`);
        }
        if (fArr.length < signalSize) {
          throw new Error(`Not enough values for input signal ${k}
`);
        }
        if (fArr.length > signalSize) {
          throw new Error(`Too many values for input signal ${k}
`);
        }
      }
      for (let i = 0; i < fArr.length; i++) {
        const arrFr = toArray32(normalize(fArr[i], this.prime), this.n32);
        for (let j = 0; j < this.n32; j++) {
          this.instance.exports.writeSharedRWMemory(j, arrFr[this.n32 - 1 - j]);
        }
        try {
          this.instance.exports.setInputSignal(hMSB, hLSB, i);
          input_counter++;
        } catch (err) {
          throw new Error(err);
        }
      }
    });
    if (input_counter < this.instance.exports.getInputSize()) {
      throw new Error(`Not all inputs have been set. Only ${input_counter} out of ${this.instance.exports.getInputSize()}`);
    }
  }
  async calculateWitness(input, sanityCheck) {
    const w = [];
    await this._doCalculateWitness(input, sanityCheck);
    for (let i = 0; i < this.witnessSize; i++) {
      this.instance.exports.getWitness(i);
      const arr = new Uint32Array(this.n32);
      for (let j = 0; j < this.n32; j++) {
        arr[this.n32 - 1 - j] = this.instance.exports.readSharedRWMemory(j);
      }
      w.push(Scalar.fromArray(arr, 4294967296));
    }
    return w;
  }
  async calculateWTNSBin(input, sanityCheck) {
    const buff32 = new Uint32Array(this.witnessSize * this.n32 + this.n32 + 11);
    const buff = new Uint8Array(buff32.buffer);
    await this._doCalculateWitness(input, sanityCheck);
    buff[0] = "w".charCodeAt(0);
    buff[1] = "t".charCodeAt(0);
    buff[2] = "n".charCodeAt(0);
    buff[3] = "s".charCodeAt(0);
    buff32[1] = 2;
    buff32[2] = 2;
    buff32[3] = 1;
    const n8 = this.n32 * 4;
    const idSection1length = 8 + n8;
    const idSection1lengthHex = idSection1length.toString(16);
    buff32[4] = parseInt(idSection1lengthHex.slice(0, 8), 16);
    buff32[5] = parseInt(idSection1lengthHex.slice(8, 16), 16);
    buff32[6] = n8;
    this.instance.exports.getRawPrime();
    let pos = 7;
    for (let j = 0; j < this.n32; j++) {
      buff32[pos + j] = this.instance.exports.readSharedRWMemory(j);
    }
    pos += this.n32;
    buff32[pos] = this.witnessSize;
    pos++;
    buff32[pos] = 2;
    pos++;
    const idSection2length = n8 * this.witnessSize;
    const idSection2lengthHex = idSection2length.toString(16);
    buff32[pos] = parseInt(idSection2lengthHex.slice(0, 8), 16);
    buff32[pos + 1] = parseInt(idSection2lengthHex.slice(8, 16), 16);
    pos += 2;
    for (let i = 0; i < this.witnessSize; i++) {
      this.instance.exports.getWitness(i);
      for (let j = 0; j < this.n32; j++) {
        buff32[pos + j] = this.instance.exports.readSharedRWMemory(j);
      }
      pos += this.n32;
    }
    return buff;
  }
};

// node_modules/@lelantos-org/sdk/dist/wasm/loader.js
var IS_NODE = typeof process !== "undefined" && !!process.versions?.node;
var NODE_FS_PROMISES = "node:fs/promises";
function createWasmLoader(cfg) {
  let injected = null;
  let promise = null;
  let nodePkgUrl = null;
  async function init() {
    let mod2;
    if (injected) {
      mod2 = await injected.loadModule();
      await mod2.default(injected.wasm !== void 0 ? { module_or_path: injected.wasm } : void 0);
    } else if (IS_NODE) {
      const { readFile } = await import(
        /* @vite-ignore */
        NODE_FS_PROMISES
      );
      nodePkgUrl = await cfg.nodeJsUrl();
      mod2 = await cfg.defaultImport();
      const bytes = new Uint8Array(await readFile(await cfg.nodeWasmPath()));
      await mod2.default({ module_or_path: bytes });
    } else {
      mod2 = await cfg.defaultImport();
      await mod2.default();
    }
    if (cfg.postInit)
      await cfg.postInit(mod2, { isNode: IS_NODE, nodePkgUrl });
    return mod2;
  }
  return {
    configure(loader) {
      injected = loader;
      promise = null;
      nodePkgUrl = null;
    },
    load() {
      if (!promise)
        promise = init();
      return promise;
    },
    getNodePkgUrl() {
      return nodePkgUrl;
    }
  };
}

// node_modules/@lelantos-org/sdk/dist/wasm/rayon-setup.js
var NODE_URL = "node:url";
var NODE_OS = "node:os";
var NODE_WORKER_THREADS = "node:worker_threads";
var RAYON_BOOTSTRAP_URL = new URL("./rayon-worker-bootstrap.mjs", import.meta.url);
function polyfillSelfForNode() {
  const g = globalThis;
  if (g.self === void 0)
    g.self = globalThis;
  for (const k of ["addEventListener", "removeEventListener", "postMessage"]) {
    if (g[k] === void 0)
      g[k] = () => {
      };
  }
}
async function initBrowserThreadPool(mod2, opts) {
  if (!mod2.initThreadPool) {
    console.warn(`[${opts.label}] mod.initThreadPool missing \u2014 running single-threaded`);
    return;
  }
  const coi = globalThis.crossOriginIsolated;
  if (!coi) {
    console.warn(`[${opts.label}] crossOriginIsolated=false \u2014 running single-threaded. Set COOP=same-origin + COEP=require-corp on the page (and worker) to enable rayon.`);
    return;
  }
  const hw = globalThis.navigator?.hardwareConcurrency ?? 4;
  const n = opts.threadCount ?? Math.max(2, hw);
  if (n <= 1) {
    console.warn(`[${opts.label}] thread pool size ${n} \u2014 running single-threaded`);
    return;
  }
  const t0 = performance.now();
  try {
    await raceWithTimeout(mod2.initThreadPool(n), 1e4);
    console.log(`[${opts.label}] rayon thread pool ready: ${n} threads (${(performance.now() - t0).toFixed(0)}ms, hw=${hw})`);
  } catch (err) {
    console.warn(`[${opts.label}] rayon thread pool init failed; running single-threaded:`, err);
  }
}
async function initNodeThreadPool(mod2, nodePkgUrl, opts) {
  if (!mod2.initThreadPool)
    return;
  const envN = parseInt(process.env.LELANTOS_PROVER_THREADS ?? "", 10);
  const n = opts.threadCount ?? (Number.isFinite(envN) ? envN : await defaultThreadCount());
  if (n <= 1)
    return;
  try {
    await installNodeRayonWorker(nodePkgUrl);
    await raceWithTimeout(mod2.initThreadPool(n), 1e4);
  } catch (err) {
    console.warn(`[${opts.label}] rayon thread pool init failed; running single-threaded:`, err);
  }
}
async function defaultThreadCount() {
  try {
    const os = await import(
      /* @vite-ignore */
      NODE_OS
    );
    return os.availableParallelism?.() ?? os.cpus().length;
  } catch {
    return 4;
  }
}
function raceWithTimeout(p, ms) {
  const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error(`initThreadPool timeout (${ms / 1e3}s)`)), ms));
  return Promise.race([p, timeout]);
}
var nodeRayonInstalled = false;
async function installNodeRayonWorker(nodePkgUrl) {
  if (nodeRayonInstalled)
    return;
  const { Worker: NodeWorker } = await import(
    /* @vite-ignore */
    NODE_WORKER_THREADS
  );
  const bootstrap = RAYON_BOOTSTRAP_URL;
  class NodeBrowserWorker {
    w;
    listeners = /* @__PURE__ */ new Map();
    constructor(url) {
      const target = url instanceof URL ? url.href : String(url);
      this.w = new NodeWorker(bootstrap, {
        env: {
          ...process.env,
          LELANTOS_RAYON_PKG_URL: nodePkgUrl,
          LELANTOS_RAYON_WORKER_URL: target
        }
      });
      const dbg2 = (m) => {
        if (process.env.LELANTOS_RAYON_DEBUG)
          console.error(`[rayon-main ${target}]`, m);
      };
      dbg2("worker spawned");
      this.w.on("message", (data) => {
        dbg2(`message ${data?.type}`);
        const set = this.listeners.get("message");
        if (set)
          for (const cb of set)
            cb({ data });
      });
      this.w.on("error", (err) => {
        dbg2(`error ${err.message}`);
        const set = this.listeners.get("error");
        if (set)
          for (const cb of set)
            cb({ data: err });
      });
      this.w.on("exit", (code) => dbg2(`exit ${code}`));
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
async function nodeFileUrlToPath(url) {
  const { fileURLToPath } = await import(
    /* @vite-ignore */
    NODE_URL
  );
  return fileURLToPath(url);
}

// node_modules/@lelantos-org/sdk/dist/prover/wasm-prover.js
var IS_NODE2 = typeof process !== "undefined" && !!process.versions?.node;
var NODE_FS_PROMISES2 = "node:fs/promises";
var proverThreadCount = null;
var PKG_JS_URL = new URL("../../wasm/prover/pkg/prover.js", import.meta.url);
var PKG_WASM_URL = new URL("../../wasm/prover/pkg/prover_bg.wasm", import.meta.url);
var proverLoader = createWasmLoader({
  name: "prover",
  defaultImport: () => Promise.resolve().then(() => (init_prover(), prover_exports)),
  nodeJsUrl: async () => PKG_JS_URL.href,
  nodeWasmPath: async () => nodeFileUrlToPath(PKG_WASM_URL),
  postInit: async (mod2, ctx) => {
    const opts = { threadCount: proverThreadCount, label: "WasmProver" };
    if (ctx.isNode) {
      if (!ctx.nodePkgUrl)
        throw new Error("nodePkgUrl not set; call after wasm init");
      await initNodeThreadPool(mod2, ctx.nodePkgUrl, opts);
    } else {
      await initBrowserThreadPool(mod2, opts);
    }
  }
});
function configureProverWasm(loader) {
  proverLoader.configure(loader);
}
function loadProver() {
  if (IS_NODE2)
    polyfillSelfForNode();
  return proverLoader.load().then((m) => m.ProverSession);
}
async function loadBytes(path) {
  if (IS_NODE2) {
    const { readFile } = await import(
      /* @vite-ignore */
      NODE_FS_PROMISES2
    );
    return new Uint8Array(await readFile(path));
  }
  const res = await fetch(path);
  if (!res.ok)
    throw new Error(`fetch ${path}: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}
var WasmProver = class _WasmProver {
  session;
  wc;
  constructor(session, wc) {
    this.session = session;
    this.wc = wc;
  }
  static async build(paths) {
    const [Session, zkeyBytes, circuitWasm] = await Promise.all([
      loadProver(),
      loadBytes(paths.zkeyPath),
      loadBytes(paths.wasmPath)
    ]);
    const wc = await builder(circuitWasm);
    return new _WasmProver(new Session(zkeyBytes), wc);
  }
  /// Warm the wasm module (zkey-independent) to avoid first-prove latency.
  static async preload() {
    await loadProver();
  }
  async prove(input) {
    const perf = globalThis.__lelantos_prover_perf !== false;
    const t0 = perf ? performance.now() : 0;
    const wtns = await this.wc.calculateWTNSBin(input, 0);
    const t1 = perf ? performance.now() : 0;
    const out = this.session.prove(wtns);
    const t2 = perf ? performance.now() : 0;
    if (perf) {
      const fmt = (ms) => ms >= 1e3 ? `${(ms / 1e3).toFixed(2)}s` : `${ms.toFixed(1)}ms`;
      console.log(`[worker-perf] witness: ${fmt(t1 - t0)} | groth16: ${fmt(t2 - t1)}`);
    }
    const proof = {
      pi_a: out.piA,
      pi_b: out.piB,
      pi_c: out.piC,
      protocol: "groth16",
      curve: "bn128"
    };
    return { proof, publicSignals: out.publicSignals };
  }
};

// src/bench-proof.worker.ts
configureProverWasm({
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — absolute URL import intentionally not type-checked
  loadModule: () => import("/wasm/prover/pkg/prover.js"),
  wasm: "/wasm/prover/pkg/prover_bg.wasm"
});
var prover = null;
var post = (m) => self.postMessage(m);
var dbg = (stage, info) => post({ type: "debug", stage, info: info ?? {} });
async function prepare(req) {
  const isolated = self.crossOriginIsolated;
  const cores = self.navigator?.hardwareConcurrency ?? 0;
  dbg("init-start", { isolated, cores });
  const t0 = performance.now();
  prover = await WasmProver.build({ wasmPath: req.wasmPath, zkeyPath: req.zkeyPath });
  const buildMs = performance.now() - t0;
  dbg("build-done", { ms: buildMs });
  post({ type: "prepared", threads: cores, isolated, prepareMs: buildMs });
}
async function prove(req) {
  if (!prover) throw new Error("not prepared");
  const t0 = performance.now();
  const result = await prover.prove(req.input);
  const ms = performance.now() - t0;
  post({ type: "proved", ms, proof: result.proof, publicSignals: result.publicSignals });
}
self.addEventListener("message", async (ev) => {
  const msg = ev.data;
  try {
    if (msg.type === "prepare") await prepare(msg);
    else if (msg.type === "prove") await prove(msg);
    else if (msg.type === "dispose") {
      prover = null;
      post({ type: "disposed" });
    }
  } catch (e2) {
    post({ type: "error", message: e2 instanceof Error ? e2.message : String(e2) });
  }
});
