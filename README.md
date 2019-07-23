# Introduction

This Minio middleware is written for Node.js Express apps to use Minio to store files. Not just Minio, you can use AWS S3 to store files too, because Minio SDK that this middleware is based on is S3 compliant.

Files can be uploaded to a predefined folder in a predefined bucket in a Minio sever (or AWS S3). Once a file has been uploaded successfully, you will be informed of the filename known to Minio for this file. Later on, you can use this filename to download or delete the file.

The Minio middleware also allows you to list all files stored inside the predefined folder in the predefined bucket in Minio (or AWS S3).

# How to use the package?

## First of all, install the package:

```shell
npm i express-middleware-minio
```

Or

```shell
yarn add express-middleware-minio
```

## Second, you need to add .env to get it up running, e.g.:

```shell
MINIO_ACCESS_KEY=xxx
MINIO_SECRET_KEY=xxx
MINIO_ENDPOINT='192.111.111.131'
MINIO_PORT=9000
MINIO_SECURITY=false
MINIO_BUCKET=manuscripts
MINIO_UPLOADS_FOLDER_NAME=uploads
MINIO_REGION=eu-west-2 (optional)
```

## Then you can use the Minio middleware in your Express application:

Four operations are provided:

- post (deprecated)
- postStream
- get (deprecated)
- getStream
- delete
- list

You can use them the following way:

```javascript
const expressMinio = require("express-middleware-minio");
```

You can find below an example.

```javascript
const expressMinio = require("express-middleware-minio");
const minioMiddleware = expressMinio.middleware();

// Upload a file
app.post(
  "/api/files",
  minioMiddleware({ op: expressMinio.Ops.postStream }),
  (req, res) => {
    if (req.minio.error) {
      res.status(400).json({ error: req.minio.error });
    } else {
      res.send({ filename: req.minio.post.filename });
    }
  }
);

// List all files
app.get(
  "/api/files",
  minioMiddleware({ op: expressMinio.Ops.list }),
  (req, res) => {
    if (req.minio.error) {
      res.status(400).json({ error: req.minio.error });
    } else {
      res.send(req.minio.list);
    }
  }
);

// Download a file
app.get(
  `/api/files/:filename`,
  minioMiddleware({ op: expressMinio.Ops.getStream }),
  (req, res) => {
    if (req.minio.error) {
      res.status(400).json({ error: req.minio.error });
      return;
    }

    res.attachment(req.minio.get.originalName);
    req.minio.get.stream.pipe(res);
  }
);

// Delete a file
app.delete(
  "/api/files/:filename",
  minioMiddleware({ op: expressMinio.Ops.delete }),
  (req, res) => {
    if (req.minio.error) {
      res.status(400).json({ error: req.minio.error });
    } else {
      res.send(req.minio.delete);
    }
  }
);
```

## Configuration

### logger (optional)

By default, console is used for logging. You can override the logger with Node-config.

Here is an example config/default.js:

```javascript
const logger = require("winston");
require("winston-daily-rotate-file");

logger.add(logger.transports.DailyRotateFile, {
  dirname: "./logs",
  filename: "xpub-epmc.log",
  datePattern: "YYYY-MM-DD",
  zippedArchive: true,
  maxFiles: "30d"
});

module.exports = {
  logger
};
```

### Test

To run the tests against S3, you will need to spin up a Minio S3 service, or against an existing one.

```
npm test
```

You can find the test report [here](https://europepmc.github.io/express-middleware-minio/test-report.html), as well as the test coverage report [here](https://europepmc.github.io/express-middleware-minio/coverage/index.html)

### Temporary directory (optional and deprecated)

Currently when retrieving a file from Minio via operation get (see above), we download and save it in the local filesystem, and then return it to the client.

This is the directory used to hold the file in the local filesystem. By default, it is /tmp. You can change it to a different directory if necessary.

Here is an example config/default.js:

```javascript
module.exports = {
  minioTmpDir: "/tmp"
};
```

**Note**: the recommended way is to use operation getStream, which would pipe the stream of the requested file to the client. If you use getStream way, you don't need to set up the temporary directory.
