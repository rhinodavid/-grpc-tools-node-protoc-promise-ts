import * as grpcLibrary from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import {
  ProtobufTypeDefinition,
  ServiceClientConstructor,
} from "@grpc/grpc-js/build/src/make-client";

import { flatten, mapObject } from "underscore";
import { format as formatProtoMessage } from "../lib/format/ProtoMessageDefinitionFormatter";

import { format as formatProtoService } from "../lib/format/ProtoServiceDefinitionFormatter";
import { render } from "../lib/TemplateEngine";
import { ExportMap } from "../lib/ExportMap";
import { FileDescriptorProto } from "google-protobuf/google/protobuf/descriptor_pb";
import { GrpcObject } from "@grpc/grpc-js";

describe("gRCP service definitions", () => {
  describe("generate grpc service definition", () => {
    it("without promise clients", async () => {
      const packageDefinition = await protoLoader.load(
        `${__dirname}/test.proto`,
        {}
      );

      const packageObject: Record<
        string,
        GrpcObject | ServiceClientConstructor | ProtobufTypeDefinition
      > = grpcLibrary.loadPackageDefinition(packageDefinition);

      const isDefs = (
        o: GrpcObject | ServiceClientConstructor | ProtobufTypeDefinition
      ): o is ProtobufTypeDefinition => {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        return (<ProtobufTypeDefinition>o).fileDescriptorProtos !== undefined;
      };
      const namesToDescriptions = mapObject(
        packageObject,
        (
          x: Record<
            string,
            GrpcObject | ProtobufTypeDefinition | ServiceClientConstructor
          >
        ) =>
          mapObject(x, (o) =>
            isDefs(o)
              ? o.fileDescriptorProtos.map((buffer) => {
                  const typedInputBuffer = new Uint8Array(
                    (buffer as any).length
                  );
                  typedInputBuffer.set(buffer);
                  const proto = FileDescriptorProto.deserializeBinary(
                    typedInputBuffer
                  );
                  return proto;
                })
              : null
          )
      );
      const testDescriptors = namesToDescriptions["test"]; // see what gets rendered for "test.proto"

      const fileDescriptorProtos: Array<FileDescriptorProto> = flatten(
        Object.values(testDescriptors).filter(Boolean)
      );

      // TODO: make sure each descriptor is unique

      const exportMap = new ExportMap();
      fileDescriptorProtos.forEach((b) => exportMap.addFileDescriptor(b));

      const dateString: string = new Date(
        "Tue Sep 21 2020 03:15:20 GMT-0600 (Mountain Daylight Time)"
      ).toString();

      fileDescriptorProtos.forEach((fileDescriptorProto) => {
        const message = render(
          "message_definition_template",
          formatProtoMessage(fileDescriptorProto, exportMap, dateString)
        );
        expect(message).toMatchSnapshot();

        const service = render(
          "service_definition_template",
          formatProtoService(fileDescriptorProto, exportMap, false, dateString)
        );
        expect(service).toMatchSnapshot();

        const serviceWithPromises = render(
          "service_definition_template",
          formatProtoService(fileDescriptorProto, exportMap, true, dateString)
        );
        expect(serviceWithPromises).toMatchSnapshot();
      });
    });
  });
});
