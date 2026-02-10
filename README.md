# CallOfMine Upload Host

Einfache Node/Express-Webseite zum Hochladen von `.jar`, `.json` und `.zip` Dateien.
Nach dem Upload bekommst du eine direkte Download-URL, die jede Application direkt abrufen kann.

## Lokal starten

```bash
npm install
npm start
```

Dann im Browser oeffnen: `http://localhost:3000`

## Speicher-Modi

Die App unterstuetzt 2 Modi:

- `local`: speichert auf Dateisystem (mit Render Persistent Disk dauerhaft).
- `s3`: speichert in S3-kompatiblem Object Storage (AWS S3, Cloudflare R2, Backblaze B2).

## Ohne S3 dauerhaft speichern (dein Wunsch)

Nutze auf Render eine **Persistent Disk** und `local`-Modus.

Noetige Env Vars:

- `STORAGE_PROVIDER=local`
- `UPLOAD_DIR=/var/data/uploads`

## Render Deployment

1. Projekt in ein Git-Repository pushen (GitHub/GitLab).
2. Auf Render ein neues **Web Service** aus dem Repo erstellen.
3. Render erkennt `render.yaml` automatisch.
4. Service muss auf einem Plan laufen, der Persistent Disk unterstuetzt (nicht Free).
5. Start Command: `npm start`
6. Port: wird automatisch ueber `process.env.PORT` genutzt (bereits im Code eingebaut).

`render.yaml` ist bereits auf Persistent Disk + `local` konfiguriert.

## Optional: S3/R2 statt Disk

Falls du spaeter auf S3 gehen willst:

- `STORAGE_PROVIDER=s3`
- `S3_BUCKET=<bucket>`
- `S3_REGION=<region>`
- `S3_ACCESS_KEY_ID=<key>`
- `S3_SECRET_ACCESS_KEY=<secret>`
- Optional `S3_ENDPOINT`
- Optional `S3_FORCE_PATH_STYLE=true|false`

## GitHub als Dateispeicher

Technisch moeglich ist es, Dateien in ein Repo zu committen, aber fuer Upload-Hosting ist das unpraktisch:

- einzelne Dateien sind in normalen Repos auf 100 MB limitiert
- groessere Dateien brauchen Git LFS und haben Speicher/Bandbreiten-Limits
- jeder Upload wird dann ein Git-Commit/Push

Darum ist Render Disk (ohne S3) fuer deinen Fall sinnvoller.

## API

- `POST /upload`
  - Form-Field: `file`
  - Erlaubt: `.jar`, `.json`, `.zip` (z. B. `mods.zip`)
  - Antwort enthaelt `url` mit direktem Download-Link

- `GET /files/:name`
  - Liefert Datei als direkter Download (`Content-Disposition: attachment`)
