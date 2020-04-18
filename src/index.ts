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
import { format as formatProtoMessage } from "./lib/format/ProtoMsgTsdFormatter";
import { format as formatProtoService } from "./lib/format/ProtoSvcTsdFormatter";
import { render } from "./lib/TplEngine";

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
    console = fakeConsole;
    const dateString = new Date().toString();
    const typedInputBuff = new Uint8Array((inputBuff as any).length);
    typedInputBuff.set(inputBuff);

    const codeGenRequest = CodeGeneratorRequest.deserializeBinary(
      typedInputBuff
    );
    const parameters = codeGenRequest.getParameter().toLowerCase();
    const generatePromiseClients = parameters.includes(
      "generate_promise_client"
    );
    if (parameters.length && !generatePromiseClients) {
      throw new Error(
        `grpc-tools-node-protoc-promise-ts received an unknown parameter: ${parameters}
          only allowed parameter is generate_promise_clients`
      );
    }
    const codeGenResponse = new CodeGeneratorResponse();
    const exportMap = new ExportMap();
    const fileNameToDescriptor: { [key: string]: FileDescriptorProto } = {};

    codeGenRequest.getProtoFileList().forEach((protoFileDescriptor) => {
      fileNameToDescriptor[protoFileDescriptor.getName()] = protoFileDescriptor;
      exportMap.addFileDescriptor(protoFileDescriptor);
    });
    codeGenRequest.getFileToGenerateList().forEach((fileName) => {
      // Message
      const msgFileName = filePathFromProtoWithoutExt(fileName);
      const msgTsdFile = new CodeGeneratorResponse.File();
      msgTsdFile.setName(msgFileName + ".d.ts");
      const msgModel = formatProtoMessage(
        fileNameToDescriptor[fileName],
        exportMap,
        dateString
      );
      msgTsdFile.setContent(render("msg_tsd", msgModel));
      codeGenResponse.addFile(msgTsdFile);
      // Service
      const fileDescriptorModel = formatProtoService(
        fileNameToDescriptor[fileName],
        exportMap,
        generatePromiseClients,
        dateString
      );
      if (fileDescriptorModel != null) {
        const svcFileName = svcFilePathFromProtoWithoutExt(fileName);
        const svtTsdFile = new CodeGeneratorResponse.File();
        svtTsdFile.setName(svcFileName + ".d.ts");
        svtTsdFile.setContent(render("svc_tsd", fileDescriptorModel));
        codeGenResponse.addFile(svtTsdFile);
      }
    });
    process.stdout.write(Buffer.from(codeGenResponse.serializeBinary()));
  } catch (e) {
    console = actualConsole;
    console.error("protoc-promise-gen-ts error: " + e.stack + "\n");
    console.error(e.message);
    process.exit(1);
  }
});
