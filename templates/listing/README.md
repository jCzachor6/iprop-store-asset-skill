# Asset Name

One paragraph: what a seed generates, the art style, the canvas size (for example a transparent
64 × 64 canvas) and how many entries the listing contains. Use nearest-neighbour scaling to keep
enlarged sprites sharp.

## Included assets

| Entry | Contents |
| --- | --- |
| `asset-name/asset-name.ips` | What this entry generates and how the seeds vary it. |

Shared parts: `common/part.ips` (imported by …). The download includes the complete `.ips` source
graph and every entry compiled by the store with Infinite Props 0.7.1 (the listing's
`compiler_version`).

## Inputs

- `input_name`: what it controls, its range and default; `0` rolls it from the seed.

## Outputs

- `anchor_name`: attachment point in native canvas coordinates.

## Usage

```sh
ipc asset-name/asset-name.ips -o asset-name.iprop
```

```js
const program = runtime.load(bytes)
const sprite = program.generate({ seed: 42 })
const variant = program.generate({ seed: 42, uniforms: { input_name: 1 } })
```

## Previews

The cover is promotional artwork based on real renders of this asset. The larger preview images and
the animation are rendered from the included sources. The seeded previews show N curated seeds.

## License

Standard commercial license of iprop.store: use the sources and compiled files in your own
projects, commercial included; do not resell or republish them on their own.
