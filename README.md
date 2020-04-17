# grpc_tools_node_protoc_ts

__Generate TypeScript definitions for type safe gRPC with a modern API__

_A fork of [`grpc_tools_node_protoc_ts`](https://github.com/agreatfool/grpc_tools_node_protoc_ts)_

> This package is under active development and should not be used
> by anyone for any reason at this time.

```Dockerfile
FROM node:8.4.0

RUN apt-get update && \
    apt-get -y install git unzip build-essential autoconf libtool

RUN git clone https://github.com/google/protobuf.git && \
    cd protobuf && \
    ./autogen.sh && \
    ./configure && \
    make && \
    make install && \
    ldconfig && \
    make clean && \
    cd .. && \
    rm -r protobuf

RUN git clone https://github.com/agreatfool/grpc_tools_node_protoc_ts.git grpc_protoc && \
    cd grpc_protoc && \
    npm i -g grpc-tools@1.6.6 --unsafe-perm && \
    npm i -g typescript --unsafe-perm && \
    npm i --unsafe-perm
```
```bash
$ docker build -t node_protoc_plugin:0.1 .
$ docker run --rm -i -t node_protoc_plugin:0.1 /bin/bash
$ root@63249303596f:/# cd /grpc_protoc && ./bash/build.sh
```

## Environment
```bash
node --version
# v13.13.0
yarn --version
# 1.22.1
tsc --version
# Version 3.6.4
```
