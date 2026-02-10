# CallOfMine Upload Host

Einfache Node/Express-Webseite zum Hochladen von `.jar` und `.json` Dateien.
Nach dem Upload bekommst du eine direkte Download-URL, die jede Application direkt abrufen kann.

## Lokal starten

```bash
npm install
npm start
```

Dann im Browser oeffnen: `http://localhost:3000`

## Persistenter Speicher (wichtig)

Die App unterstuetzt 2 Modi:

- `local` (Standard): speichert lokal im Ordner `uploads/` (nicht dauerhaft auf Render Free/Standard).
- `s3`: speichert dauerhaft in S3-kompatiblem Object Storage (AWS S3, Cloudflare R2, Backblaze B2).

Wenn du willst, dass Dateien nach Restart/Shutdown bleiben, nutze `s3`.

Notwendige Umgebungsvariablen fuer `s3`:

- `STORAGE_PROVIDER=s3`
- `S3_BUCKET=<dein-bucket>`
- `S3_REGION=<region oder auto bei R2>`
- `S3_ACCESS_KEY_ID=<key>`
- `S3_SECRET_ACCESS_KEY=<secret>`
- Optional: `S3_ENDPOINT=<custom endpoint, z. B. fuer R2/B2>`
- Optional: `S3_FORCE_PATH_STYLE=true|false`

## Render Deployment

1. Projekt in ein Git-Repository pushen (GitHub/GitLab).
2. Auf Render ein neues **Web Service** aus dem Repo erstellen.
3. Render erkennt `render.yaml` automatisch.
4. Unter **Environment** die S3-Variablen setzen (siehe oben), damit Uploads dauerhaft sind.
5. Start Command: `npm start`
6. Port: wird automatisch ueber `process.env.PORT` genutzt (bereits im Code eingebaut).

Beispiel fuer Cloudflare R2:

- `STORAGE_PROVIDER=s3`
- `S3_REGION=auto`
- `S3_BUCKET=<bucket-name>`
- `S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com`
- `S3_ACCESS_KEY_ID=<r2-access-key>`
- `S3_SECRET_ACCESS_KEY=<r2-secret-key>`
- `S3_FORCE_PATH_STYLE=false`

## API

- `POST /upload`
  - Form-Field: `file`
  - Erlaubt: `.jar`, `.json`
  - Antwort enthaelt `url` mit direktem Download-Link

- `GET /files/:name`
  - Liefert Datei als direkter Download (`Content-Disposition: attachment`)
