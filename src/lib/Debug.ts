import * as LibFs from "fs";
import * as LibUtil from "util";

const LOG_PATH = "/tmp/protoc-promise-gen-ts.debug.log";

export function log(info: any): void {
  LibFs.appendFileSync(
    LOG_PATH,
    LibUtil.inspect(info, { showHidden: true, depth: null }) + "\n"
  );
}
