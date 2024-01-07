// https://stackoverflow.com/questions/73338326/how-can-i-save-a-file-i-download-using-fetch-with-fs

import fs from "node:fs";
// import { WritableStream } from "node:stream/web";
import { Readable } from "node:stream";
import { finished } from "node:stream/promises";

const url =
  "https://raw.githubusercontent.com/bitburner-official/bitburner-src/dev/src/ScriptEditor/NetscriptDefinitions.d.ts";
const path = "./My.NetscriptDefinitions.d.ts";

// const download_write_stream = fs.createWriteStream(path);

// const stream = new WritableStream({
//   write(chunk) {
//     download_write_stream.write(chunk);
//   },
// });

// const response = await fetch(url);
// const body = await response.body;
// await body.pipeTo(stream);

const response = await fetch(url);
const body = Readable.fromWeb(response.body);
const downloadWriteStream = fs.createWriteStream(path);
await finished(body.pipe(downloadWriteStream));
