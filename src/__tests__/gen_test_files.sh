#!/usr/bin/env bash

GRPC_TOOLS_NODE_PROTOC="../node_modules/.bin/grpc_tools_node_protoc"
PROMISE_TS_GENERATOR="../..bin/grpc-promise-ts-generator-plugin"
OUT_DIR="__gen__"

mkdir -p $OUT_DIR


  # JavaScript code generating
  ${GRPC_TOOLS_NODE_PROTOC} \
    --js_out=import_style=commonjs,binary:"../${OUT_DIR}" \
    --plugin=protoc-gen-tspromise="${TMP_PATH}" \
    --tspromise_out="../${OUT_DIR}/${f}" \
    --grpc_out="../${OUT_DIR}/${f}" \
    -I "${f}" \
    "${f}"/*.proto # --tspromise_out=no_promise_clients:"../${OUT_DIR}/${f}" \
  # --plugin=protoc-gen-ts="${TMP_PATH}" \

done
cd ..
