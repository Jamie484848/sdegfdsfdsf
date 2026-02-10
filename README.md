# CallOfMine Upload Host

Einfache Node/Express-Webseite zum Hochladen von `.jar` und `.json` Dateien.
Nach dem Upload bekommst du eine direkte Download-URL, die jede Application direkt abrufen kann.

## Lokal starten

```bash
npm install
npm start
```

Dann im Browser oeffnen: `http://localhost:3000`

## Render Deployment

1. Projekt in ein Git-Repository pushen (GitHub/GitLab).
2. Auf Render ein neues **Web Service** aus dem Repo erstellen.
3. Render erkennt `render.yaml` automatisch.
4. Wichtige Runtime-Einstellung:
   - Start Command: `npm start`
   - Port: wird automatisch ueber `process.env.PORT` genutzt (bereits im Code eingebaut).

## API

- `POST /upload`
  - Form-Field: `file`
  - Erlaubt: `.jar`, `.json`
  - Antwort enthaelt `url` mit direktem Download-Link

- `GET /files/:name`
  - Liefert Datei als direkter Download (`Content-Disposition: attachment`)

## Hinweis zu Persistenz auf Render

Auf Render Free/Standard ist lokaler Speicher nicht dauerhaft. Dateien koennen nach Neustart verschwinden.
Fuer dauerhaftes Hosting der Dateien: Objekt-Speicher (z. B. Cloudflare R2, S3, Backblaze B2) anbinden.
