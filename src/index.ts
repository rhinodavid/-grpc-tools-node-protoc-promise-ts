import {
  CodeGeneratorRequest,
  CodeGeneratorResponse,
} from "google-protobuf/google/protobuf/compiler/plugin_pb";
import {
  filePathFromProtoWithoutExt,
  svcFilePathFromProtoWithoutExt,
  withAllStdIn,
} from "./lib/Utility";

import { ExportMap } from "./lib/ExportMap";
import { FileDescriptorProto } from "google-protobuf/google/protobuf/descriptor_pb";
import { format as formatProtoMessage } from "./lib/format/ProtoMessageDefinitionFormatter";
import { format as formatProtoService } from "./lib/format/ProtoServiceDefinitionFormatter";
import { render } from "./lib/TemplateEngine";

const fakeConsole = {
  ...console,
  log: (message) => {
    const e = new Error();
    throw new Error(
      `
      *********** Don't use console.log; it's intercepted by the binary and will break. ***********
        Attempted to log: ${message}
        ${e.stack}
      *********************************************************************************************
      `
    );
  },
  error: (message) => {
    const e = new Error();
    throw new Error(
      `
      *********** Don't use console.error; it's intercepted by the binary and will break. ***********
        Attempted to log: ${message}
        ${e.stack}
      *********************************************************************************************
      `
    );
  },
};

const actualConsole = console;

/**
 * See specification:
 * [plugin.proto](https://github.com/google/protobuf/blob/master/src/google/protobuf/compiler/plugin.proto).
 */

withAllStdIn((inputBuff: Buffer) => {
  try {
    console = fakeConsole; // this will throw with a useable error if we try to log to stdout or stderr, which are intercepted by the protoc binary
    const dateString = new Date().toString();
    const typedInputBuffer = new Uint8Array((inputBuff as any).length);
    typedInputBuffer.set(inputBuff);

    const codeGeneratorRequest = CodeGeneratorRequest.deserializeBinary(
      typedInputBuffer
    );
    const parameters = codeGeneratorRequest.getParameter();
    const generatePromiseClients = parameters
      .toLowerCase()
      .replace(/[\W_]/g, "")
      .includes("genpromiseclient");
    if (parameters.length && !generatePromiseClients) {
      throw new Error(
        `grpc-tools-node-protoc-promise-ts received an unknown parameter: ${parameters}
          the only allowed parameter is gen-promise-clients`
      );
    }
    const codeGeneratorResponse = new CodeGeneratorResponse();
    const exportMap = new ExportMap();
    const fileNameToDescriptor: Record<string, FileDescriptorProto> = {};

    codeGeneratorRequest.getProtoFileList().forEach((protoFileDescriptor) => {
      fileNameToDescriptor[protoFileDescriptor.getName()] = protoFileDescriptor;
      exportMap.addFileDescriptor(protoFileDescriptor);
    });
    codeGeneratorRequest.getFileToGenerateList().forEach((fileName) => {
      {
        // Message
        const protoMessageDefinitonFileName = filePathFromProtoWithoutExt(
          fileName
        );
        const protoMessageDefinitionFile = new CodeGeneratorResponse.File();
        protoMessageDefinitionFile.setName(
          protoMessageDefinitonFileName + ".d.ts"
        );
        const msgModel = formatProtoMessage(
          fileNameToDescriptor[fileName],
          exportMap,
          dateString
        );
        protoMessageDefinitionFile.setContent(
          render("message_definition_template", msgModel)
        );
        codeGeneratorResponse.addFile(protoMessageDefinitionFile);
      }
      {
        // Service
        const fileDescriptorModel = formatProtoService(
          fileNameToDescriptor[fileName],
          exportMap,
          generatePromiseClients,
          dateString
        );
        if (fileDescriptorModel != null) {
          const protoServiceDefintionFileName = svcFilePathFromProtoWithoutExt(
            fileName
          );
          const protoServiceDefinitionFile = new CodeGeneratorResponse.File();
          protoServiceDefinitionFile.setName(
            protoServiceDefintionFileName + ".d.ts"
          );
          protoServiceDefinitionFile.setContent(
            render("service_definition_template", fileDescriptorModel)
          );
          codeGeneratorResponse.addFile(protoServiceDefinitionFile);
        }
      }
    });
    process.stdout.write(Buffer.from(codeGeneratorResponse.serializeBinary()));
  } catch (e) {
    console = actualConsole;
    console.error("grpc-promise-ts-generator-plugin error: " + e.stack + "\n");
    console.error(e.message);
    process.exit(1);
  }
});
