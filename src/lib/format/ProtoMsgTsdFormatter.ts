import { EnumModel, format as formatEnum } from "./partial/EnumFormatter";
import {
  ExtensionModel,
  format as formatExtension,
} from "./partial/ExtensionFormatter";
import {
  MessageModel,
  format as formatMessage,
} from "./partial/MessageFormatter";
import {
  filePathFromProtoWithoutExt,
  filePathToPseudoNamespace,
  getPathToRoot,
} from "../Utility";

import { DependencyFilter } from "../DependencyFilter";
import { ExportMap } from "../ExportMap";
import { FileDescriptorProto } from "google-protobuf/google/protobuf/descriptor_pb";
import { WellKnownTypesMap } from "../WellKnown";

export interface ProtoMsgTsdModel {
  packageName: string;
  fileName: string;
  imports: string[];
  messages: MessageModel[];
  extensions: ExtensionModel[];
  enums: EnumModel[];
}

export function format(
  descriptor: FileDescriptorProto,
  exportMap: ExportMap
): ProtoMsgTsdModel {
  const fileName = descriptor.getName();
  const packageName = descriptor.getPackage();

  const imports: Array<string> = [];
  const messages: Array<MessageModel> = [];
  const extensions: Array<ExtensionModel> = [];
  const enums: Array<EnumModel> = [];

  const upToRoot = getPathToRoot(fileName);

  imports.push(`import * as jspb from "google-protobuf";`);
  descriptor.getDependencyList().forEach((dependency: string) => {
    if (DependencyFilter.indexOf(dependency) !== -1) {
      return; // filtered
    }
    const pseudoNamespace = filePathToPseudoNamespace(dependency);
    if (dependency in WellKnownTypesMap) {
      imports.push(
        `import * as ${pseudoNamespace} from "${WellKnownTypesMap[dependency]}";`
      );
    } else {
      const filePath = filePathFromProtoWithoutExt(dependency);
      imports.push(
        `import * as ${pseudoNamespace} from "${upToRoot}${filePath}";`
      );
    }
  });

  descriptor.getMessageTypeList().forEach((enumType) => {
    messages.push(formatMessage(fileName, exportMap, enumType, "", descriptor));
  });
  descriptor.getExtensionList().forEach((extension) => {
    extensions.push(formatExtension(fileName, exportMap, extension, ""));
  });
  descriptor.getEnumTypeList().forEach((enumType) => {
    enums.push(formatEnum(enumType, ""));
  });

  return {
    packageName: packageName,
    fileName: fileName,
    imports: imports,
    messages: messages,
    extensions: extensions,
    enums: enums,
  };
}
