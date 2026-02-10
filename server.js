const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
app.set("trust proxy", true);

const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniquePrefix}-${safeName}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === ".jar" || ext === ".json") {
      return cb(null, true);
    }
    cb(new Error("Only .jar and .json files are allowed."));
  }
});

app.use(express.static(path.join(__dirname, "public")));

app.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded." });
  }

  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.get("host");
  const baseUrl = `${proto}://${host}`;
  const downloadUrl = `${baseUrl}/files/${encodeURIComponent(req.file.filename)}`;

  res.json({
    ok: true,
    originalName: req.file.originalname,
    storedName: req.file.filename,
    size: req.file.size,
    url: downloadUrl
  });
});

app.get("/files/:name", (req, res) => {
  const name = path.basename(req.params.name);
  const fullPath = path.join(uploadDir, name);

  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: "File not found." });
  }

  const ext = path.extname(name).toLowerCase();
  if (ext === ".jar") {
    res.type("application/java-archive");
  } else if (ext === ".json") {
    res.type("application/json");
  } else {
    res.type("application/octet-stream");
  }

  res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
  res.sendFile(fullPath);
});

app.use((err, _req, res, _next) => {
  res.status(400).json({ error: err.message || "Upload failed." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
