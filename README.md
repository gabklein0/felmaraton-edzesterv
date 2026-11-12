# Running App Budapest

## 🚀 Élesítés Netlify-ra

**[🚀 Running App élesítése – GitHub Actions](https://github.com/gabklein0/felmaraton-edzesterv/actions/workflows/manual-netlify-deploy.yml)**

A hivatkozás megnyitja a manuális élesítés oldalát. Az élesítés **nem indul el automatikusan**: az Actions oldalon válaszd a **Run workflow** gombot, majd erősítsd meg az indítást.

A GitHubon végzett módosítások önmagukban nem kerülnek ki az éles Netlify-oldalra, amennyiben a Netlify automatikus buildjei ki vannak kapcsolva.

### Előfeltételek

A repository **Settings → Secrets and variables → Actions** részében szükséges:
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

Az élesítés eredményét az Actions futási naplójában ellenőrizheted.
