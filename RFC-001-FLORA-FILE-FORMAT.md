# RFC-001 — `.flora` container format

| | |
|---|---|
| **Status** | Draft — open for discussion |
| **Author** | Esteve Segura |
| **Created** | 2026-07-31 |
| **Supersedes** | The single-JSON export in [`src/lib/flow-io.js`](src/lib/flow-io.js) (flow schema `1.0.0`) |
| **Affects** | `src/lib/flow-io.js`, `src/composables/useFlowIO.js`, every node that renders an image, `public/examples/*` |

**Contents** — [1 Summary](#1-summary) · [2 Motivation](#2-motivation) · [3 Goals](#3-goals) · [4 Non-goals](#4-non-goals) · [5 Conventions](#5-conventions) · [6 File layout](#6-file-layout) · [7 Asset references](#7-asset-references-in-the-graph) · [8 Reading](#8-reading) · [9 Writing](#9-writing) · [10 Truncation and recovery](#10-truncation-and-recovery) · [11 Integration](#11-integration-with-the-codebase) · [12 Backward compatibility](#12-backward-compatibility) · [13 Alternatives](#13-alternatives-considered) · [14 Open questions](#14-open-questions) · [15 Rollout](#15-rollout) · [16 Test plan](#16-test-plan) · [17 Appendix A — worked example](#17-appendix-a--worked-example) · [18 Appendix B — reference values](#18-appendix-b--reference-values)

---

## 1. Summary

Replace the flat `.json` export with a **binary container** (`.flora`) that keeps the flow graph as JSON but moves image bytes out of it into a separate, indexed asset pool at the end of the file.

```
┌────────────────────────────────────────────────────────┐
│ FILE HEADER            64 bytes, fixed: offsets + CRCs │
├────────────────────────────────────────────────────────┤
│ ␟FLOWBGN                                               │
│   flow graph as UTF-8 JSON — every image replaced by   │
│   a content hash:  "flora:sha256:9f86d081884c7d65…"    │
│ ␟FLOWEND                                               │
├────────────────────────────────────────────────────────┤
│ ␟INDXBGN                                               │
│   asset index: hash → offset, length, mime, crc32      │
│ ␟INDXEND                                               │
├────────────────────────────────────────────────────────┤
│ ␟POOLBGN                                               │
│   ␟BLOBBGN  frame header │  23 KB payload  ␟BLOBEND    │
│   ␟BLOBBGN  frame header │ 100 KB payload  ␟BLOBEND    │
│   ␟BLOBBGN  frame header │ 1.1 MB payload  ␟BLOBEND    │
│   … ordered by payload size, ascending                 │
│ ␟POOLEND                                               │
└────────────────────────────────────────────────────────┘
```

The graph becomes readable with a **single prefix read of a few dozen kilobytes**, independent of how many megabytes of images the file carries. Images are fetched lazily and individually, as raw bytes, never as base64.

Two properties do the heavy lifting:

- **The header is at the front and carries absolute offsets.** Reading the graph is `file.slice(0, ~30 KB)` — one read, no scanning, no parsing of image data. Over HTTP it is one `Range` request.
- **Assets are content-addressed.** The graph references images by SHA-256, so the same image stored in five nodes is one blob and five references, and a file whose pool is missing or truncated still describes a complete, valid graph.

---

## 2. Motivation

### 2.1 The current export is ~99.7% base64

Measured on the three flows shipped in `public/examples/` (loaded by [`src/components/canvas/IntroModal.vue:96`](src/components/canvas/IntroModal.vue#L96)):

| Example | File | Data-URL strings | Bytes in data URLs | Everything else |
|---|---:|---:|---:|---:|
| `toy_packaging` | 10.03 MB | 15 | 10.01 MB (**99.74%**) | 26.7 KB |
| `materials_creation` | 14.73 MB | 10 | 14.72 MB (**99.92%**) | 12.0 KB |
| `recreate_windows-xp_wallpapper` | 12.13 MB | 7 | 12.11 MB (**99.90%**) | 12.0 KB |

The graph — the thing the app actually needs to draw a canvas — is a rounding error. Everything else is `data:image/png;base64,…` living inside `node.data.src` and `node.data.lastOutputSrc`.

`toy_packaging.json` is 10 MB for **22 nodes and 21 edges**.

### 2.2 What that costs today

[`loadFlowFromFile`](src/lib/flow-io.js#L223) calls `reader.readAsText(file)` and then `JSON.parse`. For a 10 MB file that means, before a single node appears on screen:

1. The whole file is read into a JS string (UTF-16 in most engines → up to ~20 MB of heap).
2. `JSON.parse` walks all 10 MB and allocates a second set of strings for the 15 base64 payloads (~10 MB more).
3. Each payload is handed to the DOM as an `<img src="data:…">`, which the browser base64-decodes *again* to get the ~7.5 MB of real pixels.

The peak cost of opening a flow is several times the file size, and it is paid up front, synchronously, for images that may be scrolled far off-screen.

The same applies to the example flows served over the network: `fetch()` must complete all 10–15 MB before `JSON.parse` can start.

### 2.3 base64 is a 33% tax we pay on disk too

Every image is stored base64-encoded, which is 4 bytes on disk for every 3 bytes of image:

| Example | base64 in file | Raw image bytes | Overhead |
|---|---:|---:|---:|
| `toy_packaging` | 10.01 MB | 7.51 MB | +33% |
| `materials_creation` | 14.72 MB | 11.04 MB | +33% |
| `recreate_windows-xp_wallpapper` | 12.11 MB | 9.09 MB | +33% |

### 2.4 The graph is hostage to the images

There is no way to say "just give me the graph". You cannot inspect a flow, diff two flows, list which models a flow uses, or validate a flow in CI without moving all its pixels. `git diff` on an exported flow is unreadable. A single truncated download makes the whole file unparseable, graph included.

### 2.5 The same image is stored many times over

Content addressing removes duplication that the current format cannot express. The code has at least three structural duplication paths:

- **Pass-through in `DrawNode`** — [`DrawNode.vue:155`](src/components/nodes/DrawNode.vue#L155) writes the *same* incoming image into `originalSrc`, `outputSrc` **and** `lastOutputSrc`. Together with the copy held by the upstream node, one image is serialized four times.
- **Copy/paste** — duplicating an image node clones `data`, base64 included (`useCopyPaste.js`).
- **Regeneration** — every generated image is converted to base64 and kept in `lastOutputSrc` ([`ImageGeneratorNode.vue:398`](src/components/nodes/ImageGeneratorNode.vue#L398)); re-running a node with an unchanged input can produce byte-identical output.

The three shipped examples happen to contain no duplicates, so this is upside, not a headline number. But it is free upside: dedup falls out of hashing, it is not extra machinery.

### 2.6 Projected result

| Example | Today | `.flora` | On disk | Bytes to read for an interactive canvas |
|---|---:|---:|---:|---:|
| `toy_packaging` | 10.03 MB | 7.54 MB | **−25%** | 27.9 KB (**368× less**) |
| `materials_creation` | 14.73 MB | 11.05 MB | **−25%** | 12.9 KB (**1173× less**) |
| `recreate_windows-xp_wallpapper` | 12.13 MB | 9.10 MB | **−25%** | 12.6 KB (**987× less**) |

The 25% is the base64 tax. The three-orders-of-magnitude column is the point of the RFC.

Those figures come from laying out each example against the spec below, keeping the graph JSON indented exactly as [`downloadFlow`](src/lib/flow-io.js#L201) writes it today (`JSON.stringify(flowData, null, 2)`) so the comparison is like-for-like.

---

## 3. Goals

1. **G1 — The graph loads without the images.** A reader must be able to produce a complete, interactive canvas by reading only the file's prefix, in `O(size of graph)`, not `O(size of file)`.
2. **G2 — Images load lazily and individually.** Random access to any single image by content hash, without touching the others.
3. **G3 — No base64 anywhere in the pipeline.** Images are stored and loaded as raw bytes.
4. **G4 — Truncation is a supported operation.** `head -c N file.flora` must yield a file that is still legal to open, with as many usable images as fit.
5. **G5 — Damage is contained.** A corrupt image must not prevent the graph from loading, and must be detectable rather than silently rendered as garbage.
6. **G6 — Small images first.** Assets are ordered by ascending payload size, so a sequential reader gets the most images per byte read.
7. **G7 — Round-trip fidelity.** Export → import produces an identical graph, and existing `.json` flows keep opening forever.
8. **G8 — No new dependencies.** The repo has no backend and a deliberately small dependency list; the reader and writer must be hand-rolled with Web APIs, like [`src/lib/zip.js`](src/lib/zip.js) already is.

## 4. Non-goals

- **Not encryption, not DRM.** "The graph is protected" in this RFC means *protected from corruption and from being unreadable without its assets* — CRC32 per chunk, offsets that do not depend on scanning. Anyone with the file can read everything in it. Encryption, if ever wanted, is a separate RFC and belongs in a `flags` bit.
- **Not compression.** PNG/JPEG/WebP payloads are already compressed; deflating them would burn CPU for ~0%. The graph chunk is a few KB. A `flags` bit is reserved in case the graph chunk ever grows enough to justify it.
- **Not incremental / in-place saving.** The browser has no random-access file writer here; every save rewrites the whole file, exactly as `downloadFlow` does today.
- **Not a replacement for the batch ZIP export.** [`BatchRunModal`](src/components/batch/BatchRunModal.vue) keeps producing ZIPs; it is a different artifact for a different audience (humans opening files in Finder).
- **Not multi-flow archives, versioning, or history.** One file, one flow.
- **Not non-image assets in v1.** The pool is deliberately specified as a *generic* asset pool keyed by mime type, so audio/video/3D can be added later without a format break, but v1 only writes images.

---

## 5. Conventions

| | |
|---|---|
| **Extension** | `.flora` |
| **MIME type** | `application/vnd.floraferal.flow` |
| **Byte order** | Little-endian, everywhere, matching the existing `DataView` usage in [`src/lib/zip.js`](src/lib/zip.js#L140) |
| **Integer types** | `u16`, `u32`, `u64` (`DataView.getBigUint64`) |
| **Text** | UTF-8, no BOM |
| **Checksums** | CRC-32 (IEEE 802.3, polynomial `0xEDB88320`) — the exact function already implemented at [`src/lib/zip.js:42`](src/lib/zip.js#L42) |
| **Content hash** | SHA-256, via `crypto.subtle.digest` |

### 5.1 Magic number

```
46 4C 4F 52 41 1A 0A 00        "FLORA" 1A 0A 00
```

`0x1A` is DOS end-of-file: `type file.flora` on Windows and most naive `cat`-style tools stop there instead of vomiting megabytes of binary into the terminal. `0x0A` catches CRLF-mangling transports. Same trick PNG uses.

### 5.2 Chunk sentinels

Eight bytes each: the byte `0x1F` (ASCII Unit Separator) followed by seven ASCII characters.

| Constant | Bytes | Meaning |
|---|---|---|
| `SIG_FLOW_BGN` | `1F 46 4C 4F 57 42 47 4E` — `␟FLOWBGN` | Graph JSON starts |
| `SIG_FLOW_END` | `1F 46 4C 4F 57 45 4E 44` — `␟FLOWEND` | Graph JSON ends |
| `SIG_INDX_BGN` | `1F 49 4E 44 58 42 47 4E` — `␟INDXBGN` | Asset index starts |
| `SIG_INDX_END` | `1F 49 4E 44 58 45 4E 44` — `␟INDXEND` | Asset index ends |
| `SIG_POOL_BGN` | `1F 50 4F 4F 4C 42 47 4E` — `␟POOLBGN` | Asset pool starts |
| `SIG_POOL_END` | `1F 50 4F 4F 4C 45 4E 44` — `␟POOLEND` | Asset pool ends |
| `SIG_BLOB_BGN` | `1F 42 4C 4F 42 42 47 4E` — `␟BLOBBGN` | One asset frame starts |
| `SIG_BLOB_END` | `1F 42 4C 4F 42 45 4E 44` — `␟BLOBEND` | One asset frame ends |

The `0x1F` prefix is not decoration. RFC 8259 forbids unescaped control characters (`U+0000`–`U+001F`) inside JSON strings, so **a sentinel can never appear inside either JSON chunk** — those two regions are the ones where a false positive would otherwise be most damaging.

> **The one rule that matters:** sentinels are **validation and recovery aids, never the primary way to find anything.** A PNG payload can absolutely contain the bytes `1F 42 4C 4F 42 45 4E 44` by coincidence. **Offsets and lengths from the header and the index are authoritative.** A reader that locates chunks by searching for sentinels is a broken reader. §10.3 is the single place where scanning is legitimate, and even there a match is only accepted after a CRC and a hash agree.

---

## 6. File layout

### 6.1 File header — 64 bytes, fixed

| Offset | Size | Type | Field | Notes |
|---:|---:|---|---|---|
| 0 | 8 | bytes | `magic` | §5.1 |
| 8 | 2 | u16 | `formatVersion` | `1` for this RFC |
| 10 | 2 | u16 | `flags` | §6.2 |
| 12 | 4 | u32 | `headerLength` | `64` in v1. Lets v2 grow the header without breaking v1 readers |
| 16 | 8 | u64 | `flowOffset` | Absolute offset of the **first JSON byte** (the sentinel sits at `flowOffset − 8`) |
| 24 | 8 | u64 | `flowLength` | Byte length of the graph JSON |
| 32 | 4 | u32 | `flowCrc32` | CRC-32 of exactly those `flowLength` bytes |
| 36 | 4 | u32 | `assetCount` | Number of entries in the index and frames in the pool |
| 40 | 8 | u64 | `indexOffset` | Absolute offset of the first index JSON byte. `0` when `assetCount == 0` |
| 48 | 8 | u64 | `indexLength` | Byte length of the index JSON |
| 56 | 4 | u32 | `indexCrc32` | CRC-32 of the index JSON |
| 60 | 4 | u32 | `headerCrc32` | CRC-32 of bytes `0..59` |

Every offset is absolute from byte 0 of the file. Nothing is relative, so no arithmetic chain can drift.

### 6.2 `flags`

| Bit | Name | Meaning |
|---:|---|---|
| 0 | `POOL_SORTED_BY_SIZE` | Pool frames are ordered by ascending payload length (§6.6). Writers MUST set it; a reader may use it to trust that a truncated file lost only the largest assets |
| 1 | `POOL_TRUNCATED` | The writer intentionally emitted a graph-only or partial file (§10.1) |
| 2 | `FLOW_DEFLATED` | Reserved. Graph chunk is deflate-compressed. MUST be `0` in v1 |
| 3–15 | — | Reserved, MUST be `0` |

A reader encountering an unknown flag bit set MUST refuse the file rather than guess, *except* that it MAY still read the graph chunk if the header CRC validates — a graph is worth recovering.

### 6.3 Graph chunk

```
flowOffset − 8   ␟FLOWBGN                    8 bytes
flowOffset       <graph JSON>                flowLength bytes, UTF-8
                 ␟FLOWEND                    8 bytes
```

The payload is the same object [`exportFlow`](src/lib/flow-io.js#L13) produces today, with two changes: `version` becomes `"2.0.0"`, and every image string is replaced by an asset reference (§7).

It is **plain, self-contained JSON with no byte offsets in it.** That is deliberate: cut those `flowLength` bytes out with `dd`, save them as `flow.json`, and you have a valid Flora document that any tool can parse, diff or lint. Physical layout lives in the index; logical content lives here. Nothing needs rewriting when assets are reordered, deduplicated or dropped.

### 6.4 Asset index chunk

```
indexOffset − 8  ␟INDXBGN                    8 bytes
indexOffset      <index JSON>                indexLength bytes, UTF-8
                 ␟INDXEND                    8 bytes
```

```json
{
  "indexVersion": 1,
  "hashAlgo": "sha256",
  "assets": [
    {
      "hash": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "offset": 30904,
      "length": 23388,
      "crc32": 2117232891,
      "mime": "image/png",
      "width": 512,
      "height": 512,
      "name": "reference-sketch.png"
    }
  ]
}
```

| Field | Required | Notes |
|---|---|---|
| `hash` | yes | Lowercase hex SHA-256 of the **payload bytes**, the key used by references in §7 |
| `offset` | yes | Absolute offset of the payload's first byte (i.e. *after* that frame's header) |
| `length` | yes | Payload length in bytes |
| `crc32` | yes | CRC-32 of the payload, for cheap per-asset verification |
| `mime` | yes | e.g. `image/png`. Drives `new Blob([bytes], { type })` |
| `width`, `height` | no | Pixel dimensions when known. Lets the UI reserve layout space before the bytes arrive |
| `name` | no | Original filename, from `node.data.name` ([`ImageNode.vue:128`](src/components/nodes/ImageNode.vue#L128)) |

Why JSON and not a packed binary table: it is ~150 bytes per asset (2 KB for the largest example), `JSON.parse` is already in the reader, and it is trivially debuggable. The savings from packing it are not worth a second binary parser.

`assets` MUST be sorted by ascending `length`, matching pool order.

### 6.5 Asset pool and frame layout

```
␟POOLBGN                                      8 bytes
  <frame 0>   … smallest payload
  <frame 1>
  …
  <frame n-1> … largest payload
␟POOLEND                                      8 bytes
```

Each frame:

| Size | Type | Field | Notes |
|---:|---|---|---|
| 8 | bytes | `SIG_BLOB_BGN` | |
| 4 | u32 | `frameHeaderLength` | Bytes from the start of this field to the first payload byte, padding included |
| 32 | bytes | `hash` | Raw SHA-256 digest — 32 bytes, not 64 hex chars |
| 8 | u64 | `payloadLength` | |
| 4 | u32 | `payloadCrc32` | |
| 1 | u8 | `mimeLength` | |
| *n* | bytes | `mime` | ASCII |
| 0–3 | bytes | padding | `0x00` until the payload starts on a 4-byte boundary |
| `payloadLength` | bytes | `payload` | Raw image bytes. **No base64.** |
| 8 | bytes | `SIG_BLOB_END` | |

The frame header repeats what the index already says. That redundancy is what makes the recovery pass in §10.3 possible: the pool alone is enough to rebuild a lost index. It costs ~67 bytes per asset — 0.0009% of the largest example.

Note that `frameHeaderLength` counts from *its own* first byte, so it excludes `SIG_BLOB_BGN`: for `mime = "image/png"` it is `4 + 32 + 8 + 4 + 1 + 9 = 58` plus 0–3 bytes of padding. A reader gets the payload with `frameStart + 8 + frameHeaderLength`, and never has to re-derive the padding.

### 6.6 Ordering: smallest first

Frames are ordered by ascending `payloadLength`. `POOL_SORTED_BY_SIZE` records this.

**What it buys, honestly.** A reader that has the index and supports random access — the browser reading a local `File`, or `fetch` with `Range` — can grab assets in any order it likes, so for the primary use case the sort is close to irrelevant. It pays off in three narrower cases:

- **A single sequential pass** — `curl file.flora | flora-cli`, or a reader over a stream with no seeking: assets arrive small-to-large, so *count* of decoded images rises as fast as possible per byte consumed, and thumbnails appear early.
- **Truncation as a feature** — `head -c 2M file.flora` keeps the maximum number of images rather than one giant one (§10). It turns "take the first 2 MB" into a usable low-resolution pack.
- **Bounded prefetch** — "warm the first 500 KB of assets" is a useful, cheap policy, and only works if small assets are at the front.

**What it does not buy:** size is uncorrelated with what is on screen. Sorting by size does not prioritize the viewport. A future revision could add a `POOL_SORTED_BY_PRIORITY` flag with a writer-chosen order (canvas Y, or "nodes with no outgoing edges last"); the index makes that a pure writer-side change. Not in v1.

Ties break by hash, ascending. That makes the layout a pure function of the asset set: the same flow written twice produces the same pool, the same index and the same offsets, which is what makes the format testable byte-for-byte.

One caveat: the *graph chunk* is not deterministic today, because [`exportFlow`](src/lib/flow-io.js#L16) stamps `createdAt: new Date().toISOString()` on every export. So two exports of an untouched flow differ in that one field, and therefore in `flowCrc32`. Determinism tests must pin the clock. Whether `createdAt` should instead be preserved across exports — so re-saving a flow does not dirty a `git diff` — is a pre-existing question this RFC does not settle.

---

## 7. Asset references in the graph

An image field that used to hold `"data:image/png;base64,iVBORw0KG…"` now holds:

```
flora:sha256:9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
```

Grammar:

```
ref     = "flora:" algo ":" hexdigest
algo    = "sha256"                  ; only value defined in v1
hexdigest = 64 * HEXDIG             ; lowercase
```

A single flat string, on purpose: it drops straight into the existing `data.src` / `data.lastOutputSrc` fields without touching a single node schema, and it is trivially distinguishable from the values those fields already carry (`data:`, `http://`, `https://`, `null`).

### 7.1 Fields that get rewritten

Found by walking `node.data`; this is the current inventory:

| Field | Written by |
|---|---|
| `src` | [`ImageNode.vue:128`](src/components/nodes/ImageNode.vue#L128), [`useDragAndDrop.js:88`](src/composables/useDragAndDrop.js#L88) |
| `lastOutputSrc` | [`ImageGeneratorNode.vue:398`](src/components/nodes/ImageGeneratorNode.vue#L398), [`DrawNode.vue:211`](src/components/nodes/DrawNode.vue#L211) |
| `outputSrc` | [`DrawNode.vue:210`](src/components/nodes/DrawNode.vue#L210) |
| `originalSrc` | [`DrawNode.vue:156`](src/components/nodes/DrawNode.vue#L156) |
| `strokesData` | [`DrawNode.vue:212`](src/components/nodes/DrawNode.vue#L212) — the drawing layer, a transparent PNG |

The writer MUST NOT hardcode this list. It walks `data` recursively and converts **any string matching `/^data:/`**, which is what [`isBase64DataUrl`](src/lib/image-utils.js#L48) already tests. A new node type that stores a data URL in a new field is handled with no format change and no code change — a property worth more than the small cost of a recursive walk.

`http://` and `https://` values are left exactly as they are. They are already references; re-hosting someone else's URL as bytes is a different feature.

---

## 8. Reading

### 8.1 Local file

```js
// 1 — header: 64 bytes
const header = parseHeader(await file.slice(0, 64).arrayBuffer())

// 2 — graph: a few KB. The canvas is interactive after this step.
const flowBytes = await file
  .slice(Number(header.flowOffset), Number(header.flowOffset + header.flowLength))
  .arrayBuffer()
const flow = JSON.parse(new TextDecoder().decode(flowBytes))

// 3 — index: ~150 bytes per asset
const index = header.assetCount > 0 ? JSON.parse(await readIndex(file, header)) : { assets: [] }

// 4 — assets, lazily, one at a time, on demand
async function loadAsset(entry) {
  const blob = file.slice(entry.offset, entry.offset + entry.length)   // no bytes read yet
  return URL.createObjectURL(new Blob([blob], { type: entry.mime }))   // browser holds them off-heap
}
```

Step 4 is where the memory win lands. `Blob.slice` is lazy — it is a view, not a copy — and `URL.createObjectURL` hands the browser a handle instead of a 10 MB JS string. Nothing is base64-decoded, nothing sits on the JS heap.

Steps 1–2 read **27.9 KB** for `toy_packaging`, whose current `.json` requires all 10.03 MB before the first node renders. Step 3 adds 2.3 KB.

### 8.2 Over HTTP

The same, with `Range` — which is what makes this worth doing for `public/examples/*`:

| Request | Range | Bytes |
|---|---|---:|
| 1 | `bytes=0-63` | 64 |
| 2 | `bytes=<flowOffset-8>-<flowEnd+8>` | ~28 KB |
| 3 | `bytes=<indexOffset-8>-<indexEnd+8>` | ~2 KB |
| then | one per visible asset, on demand | as needed |

Requests 1 and 2 can be merged into a single speculative `bytes=0-65535` for small graphs: one round trip to an interactive canvas.

Cloudflare Workers static assets serve `Range` requests, so this needs no backend — consistent with the project's "no backend" constraint.

### 8.3 Validation order

A reader MUST, in this order:

1. Check `magic`. Mismatch → not a `.flora` file; try the legacy JSON path (§12).
2. Verify `headerCrc32`. Mismatch → refuse the file; nothing downstream can be trusted.
3. Check `formatVersion`. Unknown major → refuse, but MAY offer graph-only recovery.
4. Sanity-check `flowOffset + flowLength ≤ file.size`, and the same for the index. Out of range → truncated (§10).
5. Verify the two sentinels bracketing the graph chunk. Mismatch → refuse.
6. Verify `flowCrc32`. Mismatch → refuse; a silently corrupt graph is worse than an error.
7. Parse the JSON and run it through the existing [`validateFlow`](src/lib/flow-io.js#L50).
8. Per asset, **at load time, not up front**: verify the frame sentinels, that the frame's `hash` equals the index's, and that `payloadCrc32` matches. A failure marks that one asset missing (§10.2) and MUST NOT abort the load.

Step 8 is the containment guarantee (**G5**): one bad image costs one image.

---

## 9. Writing

```
 1. flow      := exportFlow(flowStore)                    // unchanged shape
 2. assets    := {}                                        // hash → { bytes, mime, name, w, h }
 3. walk every string in flow.nodes[].data:
      if /^data:/ →
        { bytes, mimeType } := dataUrlToBytes(str)          // src/lib/zip.js:71, already exists
        hash := hex(await crypto.subtle.digest('SHA-256', bytes))
        assets[hash] ||= { bytes, mime: mimeType, … }       // dedup, for free
        replace the string with `flora:sha256:${hash}`
 4. flow.version := '2.0.0'
 5. flowBytes  := utf8(JSON.stringify(flow, null, 2))     // indented: the chunk stays diffable
 6. ordered    := sort(values(assets)) by bytes.length asc, then hash asc
 7. lay out the file, computing absolute offsets as frames are appended
 8. build the index JSON from the offsets from step 7
 9. write the 64-byte header last — every offset and CRC is known by now
10. new Blob([header, sig, flowBytes, sig, …], { type: 'application/vnd.floraferal.flow' })
```

There is a chicken-and-egg problem in steps 7–8: frame offsets depend on `indexLength`, and `indexLength` depends on the offsets. Resolve it the way it is normally resolved — two passes:

1. Lay out the pool relative to an unknown `poolStart`, serialize the index with placeholder offsets of a **fixed width** (zero-padded to a constant number of digits), which fixes `indexLength`.
2. Now `poolStart` is known; rewrite the offsets in place. The widths are unchanged, so `indexLength` is stable.

Simpler alternative if the zero-padding feels fragile: make the index a **packed binary table** (`assetCount × 64` bytes) instead of JSON. Its length is then known before any offset is computed, and the whole problem disappears. That is a real argument against JSON here and it is the main open question in §14.

### 9.1 `crypto.subtle` availability

`crypto.subtle` requires a secure context: HTTPS or `localhost`. Both are satisfied (Cloudflare Workers in production, Vite dev server on `localhost`). If the app is ever served over plain HTTP on a LAN address, `crypto.subtle` is `undefined` and export breaks. Mitigation: detect it and fail loudly with a clear message rather than falling back to a weaker hash — a hash collision here means silently swapping the pixels of two nodes.

Hashing is asynchronous, so `exportFlow` and `downloadFlow` ([`flow-io.js:199`](src/lib/flow-io.js#L199)) become `async`. Both callers already sit in `async` code ([`useFlowIO.js:23`](src/composables/useFlowIO.js#L23)).

---

## 10. Truncation and recovery

### 10.1 Truncation is legal

A reader MUST accept a file that ends anywhere after the graph chunk. Every asset whose `offset + length` exceeds the file size is simply **missing** (§10.2). This satisfies **G4** and makes `head -c` a real tool:

```bash
head -c 28554   flow.flora > flow-graph-only.flora    # header + graph, no images
head -c 2000000 flow.flora > flow-small-assets.flora  # + index + the smallest images
```

Two truncation points are meaningful: **right after the graph chunk**, and **anywhere inside the pool**. Cutting *inside the index chunk* is legal but pointless — the index is what locates the assets, so an incomplete index means every asset is missing anyway. A reader MUST detect that case (`indexOffset + indexLength > file.size`) and fall through to a graph-only load rather than throwing.

Truncated files are readable but not *canonical*: `assetCount` still claims assets that are not there. A writer producing one deliberately MUST set `POOL_TRUNCATED`, fix `assetCount`, and rewrite the index to list only the assets it kept. A **graph-only export** — a genuinely useful artifact for code review and CI — is the degenerate case: `assetCount = 0`, `indexOffset = 0`, `POOL_TRUNCATED` set, no pool at all.

### 10.2 Missing assets

When a reference cannot be resolved, the importer:

1. Leaves the `flora:sha256:…` string in a sibling field `data.<field>Ref`, so it can be relinked later.
2. Sets the original field to `null`.
3. Records the hash in a load report surfaced in the UI: *"3 images could not be loaded from this file."*

Nodes already handle `null` here — it is the state of a fresh `ImageNode` ([`ImageNode.vue:22`](src/components/nodes/ImageNode.vue#L22) branches on `nodeData.src`) and of an `ImageGeneratorNode` before its first run.

Keeping the hash enables a later **"attach assets"** flow: open a full `.flora`, or drop loose image files, and relink by hash — content addressing means matching is exact and needs no filenames.

### 10.3 Rebuilding a lost index

If the index chunk is corrupt but the pool is intact, the redundancy in §6.5 pays off. A recovery pass — and this is the *only* legitimate use of sentinel scanning — is:

1. Scan forward for `SIG_BLOB_BGN`.
2. Read the candidate frame header; treat it as valid only if `frameHeaderLength` is sane, `mimeLength` fits, and `SIG_BLOB_END` sits exactly at `payloadStart + payloadLength`.
3. Verify `payloadCrc32`, then confirm SHA-256 matches the frame's `hash`.
4. Only then accept the frame and rebuild its index entry.

Because acceptance requires a CRC *and* a hash match, a coincidental sentinel inside a PNG cannot produce a false positive. This belongs in a separate repair tool, not the normal read path.

---

## 11. Integration with the codebase

### 11.1 New: `src/lib/asset-store.js`

The piece that does not exist yet. A per-session registry mapping content hashes to loaded bytes:

```js
// hash → { blob, objectUrl, mime, byteLength, width, height }
// objectUrl → hash        (reverse lookup, needed on export)
```

Responsibilities:

- `resolve(ref)` → object URL, materializing the blob from the open `File` on first use.
- `register(bytes, mime)` → hash, for images entering from upload or generation.
- `hashOf(objectUrl)` → hash, so export can turn a `blob:` URL back into a reference without re-reading and re-hashing megabytes.
- `revokeAll()` — object URLs leak until revoked. They MUST be revoked on flow reset ([`flow.js` `reset`](src/stores/flow.js)) and on import of a different flow. This is the one genuinely new lifetime concern the RFC introduces, and the easiest thing to get wrong.

### 11.2 The `blob:` versus `data:` decision

The sharpest integration constraint in the whole RFC. `ImageGeneratorNode` filters its input images to `http://`, `https://` and `data:` only:

```js
// src/components/nodes/ImageGeneratorNode.vue:361
.filter(src => src.startsWith('http://') || src.startsWith('https://') || src.startsWith('data:'))
```

A `blob:` URL fails that filter and is **silently dropped**. Rehydrating assets as object URLs would therefore make imported flows generate images while quietly ignoring their image inputs — a bug that produces plausible-looking wrong output, which is the worst kind.

Options, in order of preference:

1. **Widen the filter and convert at call time.** `blob:` becomes a first-class source; right before the API call, `blob:` URLs are read back into base64 for the request body only. Costs one conversion per generation of exactly the images being used, keeps base64 out of the store and out of memory. The API needs base64 regardless of how we store it.
2. **Keep everything as `data:` in memory** and only use the binary form on disk. Zero component changes, but throws away most of the memory win — the store goes back to holding base64 for every image.
3. **Upload assets somewhere and use HTTP URLs.** Violates "no backend". Rejected.

**Recommendation: option 1**, with a companion change in `replicate.js` where the same distinction is logged ([`replicate.js:244`](src/services/replicate.js#L244)).

Anything that renders through the DOM or a canvas works with `blob:` URLs unchanged — `<img>` in `ImageNode`/`ImageGeneratorNode`, and the canvas reads in [`DiffNode.vue:185`](src/components/nodes/DiffNode.vue#L185) and `ImageCompareNode`. Object URLs are same-origin, so they do not taint a canvas; `getImageData` in `DiffNode` keeps working.

### 11.3 Touched files

| File | Change |
|---|---|
| `src/lib/flora-format.js` | **New.** Reader and writer. Self-contained, no DOM dependency beyond `Blob`/`crypto.subtle`, so it is unit-testable |
| `src/lib/asset-store.js` | **New.** §11.1 |
| `src/lib/zip.js` | Export the existing private `crc32` ([line 42](src/lib/zip.js#L42)) — or move it to a shared `src/lib/crc32.js`. No behaviour change |
| `src/lib/flow-io.js` | `exportFlow`/`downloadFlow` become async and delegate to the writer; `loadFlowFromFile` sniffs magic bytes and drops the `.json`-only guard at [line 230](src/lib/flow-io.js#L230) |
| `src/composables/useFlowIO.js` | `await` the export; default filename becomes `flow-<ts>.flora`; surface the missing-asset report |
| `src/components/nodes/ImageGeneratorNode.vue` | Accept `blob:` in the input filter (§11.2) |
| `src/components/canvas/IntroModal.vue` | Point the three examples at `.flora`, load via `Range` |
| `public/examples/*` | Convert with a one-off script; keep the `.json` copies for the compatibility test |

Two existing warts are worth fixing while in here, though neither blocks this RFC:

- [`flow-io.js:159`](src/lib/flow-io.js#L159) waits `setTimeout(…, 100)` for VueFlow to register nodes before adding edges. `nextTick()` is the correct primitive — the same fix already applied in `useCopyPaste.js`.
- `strokesData` is stored as a full-canvas transparent PNG, which is mostly empty pixels. It will compress far better than the composite it accompanies, so it will land near the front of a size-sorted pool. Fine, just unintuitive when reading a hexdump.

### 11.4 What stays on data URLs

The batch layer ([`src/lib/batch-io.js`](src/lib/batch-io.js), `BatchRunModal.vue`) holds images as `{ name, src }` data URLs in its own store and exports ZIPs via `dataUrlToBytes`. Out of scope for v1. It consumes `data.src`/`data.lastOutputSrc`, so under option 1 in §11.2 it needs the same `blob:` handling before its ZIP export — noted as follow-up work, not part of this RFC.

---

## 12. Backward compatibility

**Existing `.json` flows must keep opening, indefinitely.** There are shipped examples, and users have files on disk.

Detection is by **content, not extension** — a renamed file must still work:

```
read the first 8 bytes
  magic matches      → .flora reader
  otherwise          → read as text, JSON.parse, existing importFlow path
```

The [`file.type !== 'application/json'`](src/lib/flow-io.js#L230) guard is removed; the file input accepts `.flora,.json,application/json`.

| Flow `version` in the graph JSON | Meaning |
|---|---|
| `1.0.0` | Legacy. Images inline as data URLs. Read-only support, forever |
| `2.0.0` | Images as `flora:sha256:…` references. Requires an asset source |

A `2.0.0` graph JSON on its own (extracted, or a graph-only export) is legal and loads with all assets missing (§10.2).

**Export writes `.flora` only.** Keeping a legacy JSON exporter means maintaining two writers to save users the 25% and the load time this RFC exists to fix. If a "share the graph, no images" need appears, the graph-only `.flora` from §10.1 serves it better, and `dd`-ing out the graph chunk covers the rest.

---

## 13. Alternatives considered

### 13.1 ZIP

The strongest alternative, and the repo already has a writer ([`src/lib/zip.js`](src/lib/zip.js)) — `flow.json` plus `assets/<hash>.png`, and every OS can open it.

Rejected, for three reasons:

- **The central directory is at the end of the file.** To find `flow.json` you must first read the tail, then seek back. Over HTTP that is two round trips before you can even start on the graph, versus one prefix read. It inverts the property this RFC is built around.
- **Truncation destroys a ZIP.** Cut the tail off and the archive has no directory: unreadable, graph included. **G4** is unreachable.
- **We have a writer, not a reader.** Reading ZIP means implementing directory parsing and, if any entry is deflated, inflate. That is more code than this entire format, and it buys interoperability we do not need — a `.flora` is opened by Flora.

A packaging-oriented format for humans is a genuinely different goal, and the batch ZIP export already serves it.

### 13.2 Keep JSON, gzip the whole file

One line with `CompressionStream`. But base64 of already-compressed PNG data barely compresses, the file must still be fully decompressed and fully parsed before the first node appears, and partial reads become impossible. It attacks the 25%, which is the part we care least about.

### 13.3 tar

Header-per-entry and streamable, so §10 works. But: 512-byte block padding, no index at all (finding entry *n* means walking `n−1` headers), a 100-byte filename limit needing extensions, and it is still a second format to hand-roll. The index is the whole point; tar's deliberate lack of one makes it the wrong base.

### 13.4 A single binary format — CBOR / MessagePack / BSON

Encodes byte strings natively, so the base64 tax disappears and one library does everything.

But a CBOR file is a *single self-describing document*: a decoder walks it sequentially, and you cannot read "just the graph" without either decoding past the image payloads or bolting a header and an offset index on top — at which point CBOR has only replaced the JSON encoding of two chunks, and the whole structure of this RFC still has to exist. What it costs in exchange is JSON itself: no `git diff`, no `jq`, no reading a flow in a text editor, plus a new dependency against **G8**.

### 13.5 A folder / multi-file bundle

`flow.json` next to an `assets/` directory. Cleanest to implement and debug, and the graph is trivially separable. But it is not a *file*: it cannot be dragged onto the canvas, attached, or downloaded as one thing without an archive around it — and once you add the archive you are back at §13.1. The File System Access API could manage a real directory, but it is not available in Safari or Firefox.

### 13.6 IndexedDB with a blob store

Solves in-memory cost beautifully and would make sense as a complement for the *working* document. But it is browser-local storage, not an interchange format: nothing to email, commit, or serve from `public/examples/`. Orthogonal, and a reasonable follow-up on top of `asset-store.js`.

---

## 14. Open questions

1. **Index as JSON or a packed binary table?** JSON is debuggable and reuses `JSON.parse`; the packed table (`assetCount × 64` bytes) makes `indexLength` known before offsets are computed and removes the two-pass layout in §9 entirely. Leaning binary for exactly that reason. **Needs a decision before implementation.**
2. **`u64` or `u32` for lengths?** `u64` needs `BigInt` and `Number()` conversions everywhere, for a format where no realistic asset approaches 4 GB. `u32` is simpler and `Blob`/`slice` take numbers anyway. Leaning `u32` with `u64` kept for `flowOffset`/`indexOffset` only.
3. **Should the graph chunk be deflated?** 28 KB of JSON compresses to a few KB and `CompressionStream` is available. It makes the "cut it out with `dd` and read it" property conditional on a flag, which is a real loss. Leaning no for v1, flag reserved.
4. **Store `width`/`height` always, or only when known?** Always would let the UI reserve exact layout space before any image loads — a visible quality win — but it means decoding every image at export time to measure it. Perhaps only for assets referenced by a visible node.
5. **Do we migrate `public/examples/*` in place or ship both?** Both, during one release, so the legacy path stays covered by a real fixture rather than a synthetic one.
6. **Should `strokesData` be an asset at all?** It is a sparse PNG that only `DrawNode` reads. It could stay inline. Treating it uniformly is simpler and the recursive walk gets it for free; noting it in case a special case is preferred.

---

## 15. Rollout

| Phase | Deliverable | Gate |
|---|---|---|
| **1** | `src/lib/flora-format.js` — writer + reader, plus `crc32` extracted from `zip.js`. No UI wiring | Round-trip unit tests pass on synthetic flows |
| **2** | `asset-store.js` and the `blob:` decision (§11.2) landed behind the existing data-URL path | Existing e2e suite green, unchanged |
| **3** | Import reads `.flora` **and** `.json`; export still writes `.json` | Both paths open all three examples |
| **4** | Export writes `.flora`; examples converted and served with `Range` | Time-to-first-node measured on `toy_packaging` |
| **5** | Graph-only export, missing-asset report, relink-by-hash | — |

Phases 1–3 are additive and independently shippable: nothing user-visible changes until phase 4, and phase 4 is a one-line flip that can be reverted.

---

## 16. Test plan

Following the repo's Playwright convention (`e2e/*.spec.js`, all API calls mocked).

**Unit-level, in `e2e/flora-format.spec.js`** — the format functions are pure and run in the page context:

1. Round-trip: flow with 3 images → write → read → identical graph, identical asset bytes.
2. Byte-for-byte determinism: writing the same flow twice, with `Date` stubbed, produces identical output — including offsets, index and both CRCs (§6.6).
3. Dedup: the same image in four fields produces `assetCount === 1` and four identical references.
4. Ordering: `assetCount = 5` with distinct sizes → index and pool are both ascending by `length`.
5. Header: CRCs verify; flipping one payload byte fails that asset's CRC only.
6. Truncation at the graph boundary → graph loads, `assetCount` assets reported missing.
7. Truncation mid-pool → graph plus the smallest *k* assets load, the rest report missing.
8. Corrupt asset → graph and the other assets load; one missing-asset entry.
9. Sentinel collision: an asset whose payload contains `SIG_BLOB_END` verbatim reads correctly (proves lengths, not scanning, drive the reader).
10. Index rebuild: destroy the index chunk, run recovery, get every asset back.

**End-to-end, in `e2e/flow-io.spec.js`:**

11. Export a flow with an uploaded image → reimport → the image renders and the graph matches.
12. Import a legacy `1.0.0` `.json` → renders identically (fixture: today's `toy_packaging.json`).
13. A `.flora` renamed to `.json` imports correctly (magic-byte sniffing).
14. Generate an image after importing a `.flora` → the generator receives the rehydrated image as input (the regression guard for §11.2).
15. Import flow A, then flow B → no object URLs from A remain live (the `revokeAll` guard).

**Non-functional, worth measuring once and recording in the RFC:**

16. Bytes transferred before the first node renders, for `toy_packaging`: expect 27.9 KB against 10.03 MB today.
17. Peak JS heap after opening `materials_creation`.

---

## 17. Appendix A — worked example

`toy_packaging` laid out against this spec — 22 nodes, 21 edges, 15 images from 22.8 KB to 1.13 MB. Every offset below is the real one, not an illustration:

```
offset        bytes  contents
──────────────────────────────────────────────────────────────────────────
0x00000000       8   46 4C 4F 52 41 1A 0A 00      "FLORA" 1A 0A 00
0x00000008       2   01 00                        formatVersion = 1
0x0000000A       2   01 00                        flags = POOL_SORTED_BY_SIZE
0x0000000C       4   40 00 00 00                  headerLength = 64
0x00000010       8   48 00 00 00 00 00 00 00      flowOffset  = 72
0x00000018       8   3A 6F 00 00 00 00 00 00      flowLength  = 28_474
0x00000020       4   ── ── ── ──                  flowCrc32
0x00000024       4   0F 00 00 00                  assetCount  = 15
0x00000028       8   92 6F 00 00 00 00 00 00      indexOffset = 28_562
0x00000030       8   D3 08 00 00 00 00 00 00      indexLength = 2_259
0x00000038       4   ── ── ── ──                  indexCrc32
0x0000003C       4   ── ── ── ──                  headerCrc32 over 0x00..0x3B
──────────────────────────────────────────────────────────────────────────
0x00000040       8   ␟FLOWBGN
0x00000048   28_474  {
                       "version": "2.0.0",
                       "createdAt": "2026-07-31T09:12:44.318Z",
                       "nodes": [
                         { "id": "node_1", "type": "image", "data": {
                             "src": "flora:sha256:9f86d081884c7d65…",
                             "name": "ref.png" } }, …
                     }
0x00006F82       8   ␟FLOWEND        ← a graph-only file ends here, at 27.9 KB
──────────────────────────────────────────────────────────────────────────
0x00006F8A       8   ␟INDXBGN
0x00006F92    2_259  {"indexVersion":1,"hashAlgo":"sha256","assets":[
                       {"hash":"9f86d081…","offset":30904,"length":23388,
                        "crc32":…,"mime":"image/png"}, … ]}
0x00007865       8   ␟INDXEND
──────────────────────────────────────────────────────────────────────────
0x0000786D       8   ␟POOLBGN
0x00007875      67   frame 0: ␟BLOBBGN (8) + frameHeaderLength = 59
                     (sha256, payloadLength, payloadCrc32, "image/png",
                      1 pad byte to reach a 4-byte boundary)
0x000078B8   23_388  PNG payload — the 22.8 KB reference sketch
0x0000D414       8   ␟BLOBEND
                     … 14 more frames, ascending:
                       100, 107, 142, 161, 177, 213, 581, 680, 682,
                       757, 921, 981, 1009, 1153 KB
0x0078933B       8   ␟POOLEND
──────────────────────────────────────────────────────────────────────────
total        7.54 MB  (7_902_019 bytes — was 10.03 MB, −25%)
graph read    27.9 KB  (28_554 bytes — was 10.03 MB, 368× less)
```

Note `0x00006F8A`, just past `␟FLOWEND`: cutting the file there with `head -c 28554` yields a legal graph-only document (§10.1). Everything a reader needs to draw the canvas sits in the **first 0.36%** of the file.

---

## 18. Appendix B — reference values

For implementers, so nobody has to guess:

```
SHA-256("")                                = e3b0c44298fc1c149afbf4c8996fb924
                                             27ae41e4649b934ca495991b7852b855
SHA-256("abc")                             = ba7816bf8f01cfea414140de5dae2223
                                             b00361a396177a9cb410ff61f20015ad
CRC-32("")                                 = 0x00000000
CRC-32("123456789")                        = 0xCBF43926
CRC-32("The quick brown fox jumps over the lazy dog") = 0x414FA339
```

`CRC-32("123456789") == 0xCBF43926` is the standard check value for this polynomial; a reader that produces it agrees with `zip.js` and with every ZIP tool.
