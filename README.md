# Running App Budapest

## 🧪 Tesztverzió – GitHub Pages

**[🧪 Running App tesztverzió megnyitása](https://gabklein0.github.io/felmaraton-edzesterv/)**

A tesztoldal a GitHub `main` ágának módosításakor automatikusan frissül, miután a **Settings → Pages → Build and deployment → Source: GitHub Actions** beállítás engedélyezve van.

A GitHub Pages statikus tesztkörnyezet: a Netlify Functions végpontok nem futnak rajta, ezért az AI és más szerveroldali funkciók itt korlátozottak lehetnek. A tesztoldalon ne használj éles adatokat vagy titkos kulcsokat.

---

## 🚀 Élesítés Netlify-ra

**[🚀 Running App élesítése – GitHub Actions](https://github.com/gabklein0/felmaraton-edzesterv/actions/workflows/manual-netlify-deploy.yml)**

A hivatkozás megnyitja a manuális élesítés oldalát. Az élesítés **nem indul el automatikusan**: az Actions oldalon válaszd a **Run workflow** gombot, majd erősítsd meg az indítást.

A GitHubon végzett módosítások önmagukban nem kerülnek ki az éles Netlify-oldalra, amennyiben a Netlify automatikus buildjei ki vannak kapcsolva.

### Előfeltételek

A repository **Settings → Secrets and variables → Actions** részében szükséges:
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

Az élesítés eredményét az Actions futási naplójában ellenőrizheted.
