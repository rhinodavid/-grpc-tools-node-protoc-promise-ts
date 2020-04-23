#!/usr/bin/env bash

GRPC_TOOLS_NODE_PROTOC="./node_modules/.bin/grpc_tools_node_protoc"
PROMISE_TS_GENERATOR="./bin/grpc-promise-ts-generator-plugin"
OUT_DIR="__gen__"

mkdir -p $OUT_DIR

${GRPC_TOOLS_NODE_PROTOC} \
  --js_out=import_style=commonjs,binary:"${OUT_DIR}" \
  --plugin=protoc-gen-tspromise="${PROMISE_TS_GENERATOR}" \
  --tspromise_out=gen-promise-clients:"${OUT_DIR}" \
  --grpc_out="${OUT_DIR}" \
  -I  "src/__tests__/" \
  "test.proto"
