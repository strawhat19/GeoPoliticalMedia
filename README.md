# GeoPoliticalMedia

The independent media website within **GeoCorp**. This repository contains its simple landing page, approved G/Earth/red-orbit identity, and retained editorial/media archives.

The rotating-globe website and Expo iOS/Android app have moved to the sibling `../GeoCorp/` repository. GeoCorp is the parent; GeoPoliticalMedia is the child. Each has its own Git repository and Sites project.

## Run the website

This is a static website with no npm dependencies or build step. From this directory:

```sh
python3 -m http.server 8083 --directory dist
```

Open `http://localhost:8083`. Edit `dist/index.html` and `dist/styles.css` directly; all authored `dist/` files are tracked. Any static host can serve `dist/`. The Sites configuration points to this directory and has a different project ID from GeoCorp.

- [GeoPoliticalMedia website](https://geopoliticalmedia.rakib987419435.chatgpt.site)
- [GeoCorp parent website](https://geocorp-earth.rakib987419435.chatgpt.site)
- [Editorial overview](docs/overview.md) · [Video and Shorts ideas](docs/ideas.md)
- [Logo concepts](public/assets/concepts/README.md) · [Video samples](public/assets/videos/samples/README.md)

`public/` is an archive, not the deployment directory. It preserves existing logos, videos, scripts, and production references, including sample work made for other GeoCorp brands. The approved logo is copied into `dist/assets/` for use by the website.
