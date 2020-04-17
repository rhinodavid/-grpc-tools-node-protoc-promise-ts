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

/**
 * See specification:
 * [plugin.proto](https://github.com/google/protobuf/blob/master/src/google/protobuf/compiler/plugin.proto).
 */

withAllStdIn((inputBuff: Buffer) => {
  try {
    const typedInputBuff = new Uint8Array((inputBuff as any).length);
    //noinspection TypeScriptValidateTypes
    typedInputBuff.set(inputBuff);

    const codeGenRequest = CodeGeneratorRequest.deserializeBinary(
      typedInputBuff
    );
    const codeGenResponse = new CodeGeneratorResponse();
    const exportMap = new ExportMap();
    const fileNameToDescriptor: { [key: string]: FileDescriptorProto } = {};

    codeGenRequest.getProtoFileList().forEach((protoFileDescriptor) => {
      fileNameToDescriptor[protoFileDescriptor.getName()] = protoFileDescriptor;
      exportMap.addFileDescriptor(protoFileDescriptor);
    });

    codeGenRequest.getFileToGenerateList().forEach((fileName) => {
      // message part
      const msgFileName = filePathFromProtoWithoutExt(fileName);
      const msgTsdFile = new CodeGeneratorResponse.File();
      msgTsdFile.setName(msgFileName + ".d.ts");
      const msgModel = formatProtoMessage(
        fileNameToDescriptor[fileName],
        exportMap
      );
      msgTsdFile.setContent(render("msg_tsd", msgModel));
      codeGenResponse.addFile(msgTsdFile);

      // service part
      const fileDescriptorModel = formatProtoService(
        fileNameToDescriptor[fileName],
        exportMap
      );
      if (fileDescriptorModel != null) {
        const svcFileName = svcFilePathFromProtoWithoutExt(fileName);
        const svtTsdFile = new CodeGeneratorResponse.File();
        svtTsdFile.setName(svcFileName + ".d.ts");
        svtTsdFile.setContent(render("svc_tsd", fileDescriptorModel));
        codeGenResponse.addFile(svtTsdFile);
      }
    });

    process.stdout.write(new Buffer(codeGenResponse.serializeBinary()));
  } catch (err) {
    console.error("protoc-promise-gen-ts error: " + err.stack + "\n");
    process.exit(1);
  }
});
