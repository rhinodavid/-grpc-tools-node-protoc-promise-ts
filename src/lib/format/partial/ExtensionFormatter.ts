import { isReserved, snakeToCamel } from "../../Utility";

import { ExportMap } from "../../ExportMap";
import { FieldDescriptorProto } from "google-protobuf/google/protobuf/descriptor_pb";
import { getFieldType } from "./FieldTypesFormatter";

export interface ExtensionModel {
  indent: string;
  extensionName: string;
  fieldType: string;
}

export function format(
  fileName: string,
  exportMap: ExportMap,
  extension: FieldDescriptorProto,
  indent: string
): ExtensionModel {
  let extensionName = snakeToCamel(extension.getName());
  if (isReserved(extensionName)) {
    extensionName = `pb_${extensionName}`;
  }

  const fieldType = getFieldType(
    extension.getType(),
    extension.getTypeName().slice(1),
    fileName,
    exportMap
  );

  return {
    indent,
    extensionName: extensionName,
    fieldType: fieldType,
  };
}
