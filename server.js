const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

const app = express();
app.set("trust proxy", true);

const allowedExts = new Set([".jar", ".json"]);
const maxFileSizeBytes = 250 * 1024 * 1024;

function buildStoredName(originalName) {
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const uniquePrefix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${uniquePrefix}-${safeName}`;
}

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".jar") {
    return "application/java-archive";
  }
  if (ext === ".json") {
    return "application/json";
  }
  return "application/octet-stream";
}

function buildMulterFileFilter() {
  return (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.has(ext)) {
      return cb(null, true);
    }
    cb(new Error("Only .jar and .json files are allowed."));
  };
}

const storageProvider = (process.env.STORAGE_PROVIDER || (process.env.S3_BUCKET ? "s3" : "local")).toLowerCase();
const isS3Mode = storageProvider === "s3";

let upload;
let s3Client = null;
let s3Bucket = null;
let uploadDir = null;

if (isS3Mode) {
  const requiredEnv = ["S3_BUCKET", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY"];
  const missingEnv = requiredEnv.filter((key) => !process.env[key]);
  if (missingEnv.length > 0) {
    throw new Error(
      `Missing S3 configuration: ${missingEnv.join(", ")}. Configure env vars to enable persistent storage.`
    );
  }

  s3Bucket = process.env.S3_BUCKET;
  s3Client = new S3Client({
    region: process.env.S3_REGION,
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: String(process.env.S3_FORCE_PATH_STYLE || "").toLowerCase() === "true",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
    }
  });

  upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSizeBytes },
    fileFilter: buildMulterFileFilter()
  });
} else {
  uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  upload = multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, uploadDir);
      },
      filename: (_req, file, cb) => {
        cb(null, buildStoredName(file.originalname));
      }
    }),
    limits: { fileSize: maxFileSizeBytes },
    fileFilter: buildMulterFileFilter()
  });
}

app.use(express.static(path.join(__dirname, "public")));

app.post("/upload", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    let storedName;
    if (isS3Mode) {
      storedName = buildStoredName(req.file.originalname);
      await s3Client.send(
        new PutObjectCommand({
          Bucket: s3Bucket,
          Key: storedName,
          Body: req.file.buffer,
          ContentType: getContentType(req.file.originalname)
        })
      );
    } else {
      storedName = req.file.filename;
    }

    const proto = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.get("host");
    const baseUrl = `${proto}://${host}`;
    const downloadUrl = `${baseUrl}/files/${encodeURIComponent(storedName)}`;

    res.json({
      ok: true,
      originalName: req.file.originalname,
      storedName,
      size: req.file.size,
      url: downloadUrl
    });
  } catch (err) {
    next(err);
  }
});

app.get("/files/:name", async (req, res, next) => {
  const name = path.basename(req.params.name);

  try {
    if (isS3Mode) {
      const object = await s3Client.send(
        new GetObjectCommand({
          Bucket: s3Bucket,
          Key: name
        })
      );

      res.type(object.ContentType || getContentType(name));
      if (object.ContentLength !== undefined) {
        res.setHeader("Content-Length", String(object.ContentLength));
      }
      res.setHeader("Content-Disposition", `attachment; filename="${name}"`);

      const stream = object.Body;
      if (!stream) {
        return res.status(404).json({ error: "File not found." });
      }

      if (typeof stream.pipe === "function") {
        stream.pipe(res);
      } else {
        const chunks = [];
        for await (const chunk of stream) {
          chunks.push(chunk);
        }
        res.send(Buffer.concat(chunks));
      }
      return;
    }

    const fullPath = path.join(uploadDir, name);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "File not found." });
    }

    res.type(getContentType(name));
    res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
    res.sendFile(fullPath);
  } catch (err) {
    if (err && (err.name === "NoSuchKey" || err.Code === "NoSuchKey" || err.$metadata?.httpStatusCode === 404)) {
      return res.status(404).json({ error: "File not found." });
    }
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.statusCode || 400).json({ error: err.message || "Request failed." });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  if (isS3Mode) {
    console.log(`Server running on port ${PORT} using s3 storage`);
  } else {
    console.log(`Server running on port ${PORT} using local storage at ${uploadDir}`);
  }
});
