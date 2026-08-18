# App icon source (1C3, chosen 2026-08-18)

The shipped icon: solid white tortoise on flat green `#067A41`, cell lines
26 units, head and legs tucked in with a small gap. Geometry extracted from
the tortoise mark (`src/components/tortoiseMarkPaths.js` lineage).

- `build-final.js` regenerates the four `bake-*.svg` from `geometry.json`.
- Render: `qlmanage -t -s 1024 -o . bake-*.svg` — NOTE: qlmanage FLATTENS
  transparency onto white. For the foreground/monochrome layers render the
  SVG twice (white and black background rects), then recover alpha per
  pixel: `a = 1 - (white - black)/255`, `color = black/a`. Verify the
  result has real alpha before shipping — the 2026-08-17 set shipped as
  solid white squares because nobody looked.
- iOS icon must stay RGB with no alpha channel (ITMS-90717), 1024 square.
