# Sculpted botanical sprite set

These are newly modeled 3D botanical assets for the plant-light-tool art polish.
They contain no extracted video pixels. The design follows the reference's soft,
rounded casual-game plants, using smooth closed meshes, layered fleshy petals,
subtle vertex color gradients, waxy leaves and broad warm softbox lighting.
The detail pass adds shallow petal furrows, gently varied overlapping lobes,
curved bud wraps, five pointed sepals and tapered leaf midribs. These details
are modeled and shaded to remain visible around 100 px without fine noise.

The procedural 3D source is `scripts/render_botanicals.py`; the PNG/WebP finishing
step is `scripts/finalize_botanicals.py`. Run from the project root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
  --python scripts/render_botanicals.py -- --out src/art-assets/polished --samples 56
python3 scripts/finalize_botanicals.py
```

Use `--only leaf-root` (or any other exact asset name) to rerender a single asset.
PNG is the editable high quality source. WebP quality 95 is the runtime format;
its alpha is preserved exactly. The runtime set is about 147 KB in total.
Orange petals receive a hue-masked 14% saturation finish; value and alpha stay
fixed, and the other colors, green leaves and golden flower centers are excluded.

| Asset | Canvas size | Semantic anchor | Visible alpha bounds |
|---|---|---|---|
| bud-{pink,purple,blue,orange,white} | 256×320 | root (128,290) | (50,76)–(207,292) |
| flower-{pink,purple,blue,orange,white} | 320×320 | flower center (160,160) | (31,26)–(290,276) |
| leaf | 128×192 | petiole root (64,176) | (31,31)–(102,177) |
| leaf-b | 128×192 | petiole root (64,176) | (21,36)–(99,178) |
| leaf-root | 320×180 | root (160,145) | (88,15)–(233,147) |
| seed | 128×160 | center (64,80) | (29,15)–(99,135) |

All canvases include transparent padding; size by visible bounds when matching
the reference. `manifest.json` records the final dimensions, anchors, bounds and
bytes. Two-times supersampled PNGs are kept in `ref/analysis/polished/raw-2x`.
The atlas and automated alpha checks live in `ref/analysis/polished/`.
Detail-pass comparisons, the v1.1 asset backup and size/anchor checks live in
`ref/analysis/detail-pass/`.

Four sides of every sprite have zero alpha. PNG-to-WebP alpha maximum error is
zero for all fourteen assets. Downsampling is done in premultiplied alpha before
PNG compression to avoid dark or white fringes.
