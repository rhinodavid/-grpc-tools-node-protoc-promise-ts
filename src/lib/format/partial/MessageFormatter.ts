import {
  BYTES_TYPE,
  ENUM_TYPE,
  MESSAGE_TYPE,
  getFieldType,
  getJsTypeName,
  getTypeName,
} from "./FieldTypesFormatter";
import {
  DescriptorProto,
  FieldDescriptorProto,
  FileDescriptorProto,
  OneofDescriptorProto,
} from "google-protobuf/google/protobuf/descriptor_pb";
import { EnumModel, format as formatEnum } from "./EnumFormatter";
import {
  ExtensionModel,
  format as formatExtension,
} from "./ExtensionFormatter";
import { OneofModel, format as formatOneOf } from "./OneofFormatter";
import {
  filePathToPseudoNamespace,
  isProto2,
  isReserved,
  oneOfName,
  snakeToCamel,
  uppercaseFirst,
  withinNamespaceFromExportEntry,
} from "../../Utility";

import { ExportMap } from "../../ExportMap";
import { registerHelper } from "../../TplEngine";

export const OBJECT_TYPE_NAME = "AsObject";

export interface MessageType {
  messageName: string;
  oneofGroups: Array<Array<FieldDescriptorProto>>;
  oneofDeclList: Array<OneofDescriptorProto>;
  fields: Array<MessageFieldType>;
  nestedTypes: Array<MessageModel>;
  formattedEnumListStr: Array<EnumModel>;
  formattedOneofListStr: Array<OneofModel>;
  formattedExtListStr: Array<ExtensionModel>;
}

export const defaultMessageType = JSON.stringify({
  messageName: "",
  oneofGroups: [],
  oneofDeclList: [],
  fields: [],
  nestedTypes: [],
  formattedEnumListStr: [],
  formattedOneofListStr: [],
  formattedExtListStr: [],
} as MessageType);

export interface MessageFieldType {
  snakeCaseName: string;
  camelCaseName: string;
  camelUpperName: string;
  fieldObjectType: string;
  type: FieldDescriptorProto.Type;
  exportType: string;
  isMapField: boolean;
  mapFieldInfo?: MessageMapField;
  isRepeatField: boolean;
  isOptionalValue: boolean;
  canBeUndefined: boolean;
  hasClearMethodCreated: boolean;
  hasFieldPresence: boolean;
}

export const defaultMessageFieldType = JSON.stringify({
  snakeCaseName: "",
  camelCaseName: "",
  camelUpperName: "",
  fieldObjectType: "",
  type: undefined,
  exportType: "",
  isMapField: false,
  mapFieldInfo: undefined,
  isRepeatField: false,
  isOptionalValue: false,
  canBeUndefined: false,
  hasClearMethodCreated: false,
  hasFieldPresence: false,
} as MessageFieldType);

export interface MessageMapField {
  keyType: FieldDescriptorProto.Type;
  keyTypeName: string;
  valueType: FieldDescriptorProto.Type;
  valueTypeName: string;
}

export interface MessageModel {
  indent: string;
  objectTypeName: string;
  BYTES_TYPE: number;
  MESSAGE_TYPE: number;
  message: MessageType;
}

function hasFieldPresence(
  field: FieldDescriptorProto,
  descriptor: FileDescriptorProto
): boolean {
  if (field.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED) {
    return false;
  }

  if (field.hasOneofIndex()) {
    return true;
  }

  if (field.getType() === MESSAGE_TYPE) {
    return true;
  }

  return isProto2(descriptor);
}

export function format(
  fileName: string,
  exportMap: ExportMap,
  descriptor: DescriptorProto,
  indent: string,
  fileDescriptor: FileDescriptorProto
): MessageModel {
  const nextIndent = `${indent}    `;
  const messageData = JSON.parse(defaultMessageType) as MessageType;

  messageData.messageName = descriptor.getName();
  messageData.oneofDeclList = descriptor.getOneofDeclList();
  const messageOptions = descriptor.getOptions();
  if (messageOptions !== undefined && messageOptions.getMapEntry()) {
    // this message type is the entry tuple for a map - don't output it
    return null;
  }

  const oneofGroups: Array<Array<FieldDescriptorProto>> = [];

  descriptor.getFieldList().forEach((field: FieldDescriptorProto) => {
    const fieldData = JSON.parse(defaultMessageFieldType) as MessageFieldType;

    if (field.hasOneofIndex()) {
      const oneOfIndex = field.getOneofIndex();
      let existing = oneofGroups[oneOfIndex];
      if (existing === undefined) {
        existing = [];
        oneofGroups[oneOfIndex] = existing;
      }
      existing.push(field);
    }

    fieldData.snakeCaseName = field.getName().toLowerCase();
    fieldData.camelCaseName = snakeToCamel(fieldData.snakeCaseName);
    fieldData.camelUpperName = uppercaseFirst(fieldData.camelCaseName);
    // handle reserved keywords in field names like Javascript generator
    // see: https://github.com/google/protobuf/blob/ed4321d1cb33199984118d801956822842771e7e/src/google/protobuf/compiler/js/js_generator.cc#L508-L510
    if (isReserved(fieldData.camelCaseName)) {
      fieldData.camelCaseName = `pb_${fieldData.camelCaseName}`;
    }
    fieldData.type = field.getType();
    fieldData.isMapField = false;
    fieldData.canBeUndefined = false;

    let exportType;

    const fullTypeName = field.getTypeName().slice(1);
    if (fieldData.type === MESSAGE_TYPE) {
      const fieldMessageType = exportMap.getMessage(fullTypeName);
      if (fieldMessageType === undefined) {
        throw new Error("No message export for: " + fullTypeName);
      }

      fieldData.isMapField =
        fieldMessageType.messageOptions !== undefined &&
        fieldMessageType.messageOptions.getMapEntry();
      if (fieldData.isMapField) {
        const mapData = {} as MessageMapField;
        const keyTuple = fieldMessageType.mapFieldOptions.key;
        if (!keyTuple) {
          throw new Error("No Key Tuple found");
        }
        const keyType = keyTuple[0];
        const keyTypeName = getFieldType(
          keyType,
          keyTuple[1] as string,
          fileName,
          exportMap
        );
        const valueTuple = fieldMessageType.mapFieldOptions.value;
        if (!valueTuple) {
          throw new Error("No Value Tuple found");
        }
        const valueType = valueTuple[0];
        let valueTypeName = getFieldType(
          valueType,
          valueTuple[1] as string,
          fileName,
          exportMap
        );
        if (valueType === BYTES_TYPE) {
          valueTypeName = "Uint8Array | string";
        }
        mapData.keyType = keyType;
        mapData.keyTypeName = keyTypeName;
        mapData.valueType = valueType;
        mapData.valueTypeName = valueTypeName;
        fieldData.mapFieldInfo = mapData;
        messageData.fields.push(fieldData);
        return;
      }

      const withinNamespace = withinNamespaceFromExportEntry(
        fullTypeName,
        fieldMessageType
      );
      if (fieldMessageType.fileName === fileName) {
        exportType = withinNamespace;
      } else {
        exportType =
          filePathToPseudoNamespace(fieldMessageType.fileName) +
          "." +
          withinNamespace;
      }
      fieldData.exportType = exportType;
    } else if (fieldData.type === ENUM_TYPE) {
      const fieldEnumType = exportMap.getEnum(fullTypeName);
      if (fieldEnumType === undefined) {
        throw new Error("No enum export for: " + fullTypeName);
      }
      const withinNamespace = withinNamespaceFromExportEntry(
        fullTypeName,
        fieldEnumType
      );
      if (fieldEnumType.fileName === fileName) {
        exportType = withinNamespace;
      } else {
        exportType =
          filePathToPseudoNamespace(fieldEnumType.fileName) +
          "." +
          withinNamespace;
      }
      fieldData.exportType = exportType;
    } else {
      let type = getTypeName(fieldData.type);

      // Check for [jstype = JS_STRING] overrides
      const options = field.getOptions();
      if (options && options.hasJstype()) {
        const jstype = getJsTypeName(options.getJstype());
        if (jstype) {
          type = jstype;
        }
      }

      exportType = fieldData.exportType = type;
    }

    fieldData.isOptionalValue = field.getType() === MESSAGE_TYPE;
    fieldData.isRepeatField =
      field.getLabel() === FieldDescriptorProto.Label.LABEL_REPEATED;
    if (!fieldData.isRepeatField && fieldData.type !== BYTES_TYPE) {
      let fieldObjectType = exportType;
      let canBeUndefined = false;
      if (fieldData.type === MESSAGE_TYPE) {
        fieldObjectType += ".AsObject";
        if (
          !isProto2(fileDescriptor) ||
          field.getLabel() === FieldDescriptorProto.Label.LABEL_OPTIONAL
        ) {
          canBeUndefined = true;
        }
      } else {
        if (isProto2(fileDescriptor)) {
          canBeUndefined = true;
        }
      }
      fieldData.fieldObjectType = fieldObjectType;
      fieldData.canBeUndefined = canBeUndefined;
    }
    fieldData.hasFieldPresence = hasFieldPresence(field, fileDescriptor);

    messageData.fields.push(fieldData);
  });

  descriptor.getNestedTypeList().forEach((nested) => {
    const msgOutput = format(
      fileName,
      exportMap,
      nested,
      nextIndent,
      fileDescriptor
    );
    if (msgOutput !== null) {
      // If the message class is a Map entry then it isn't output, so don't print the namespace block
      messageData.nestedTypes.push(msgOutput);
    }
  });
  descriptor.getEnumTypeList().forEach((enumType) => {
    messageData.formattedEnumListStr.push(formatEnum(enumType, nextIndent));
  });
  descriptor.getOneofDeclList().forEach((oneOfDecl, index) => {
    messageData.formattedOneofListStr.push(
      formatOneOf(oneOfDecl, oneofGroups[index] || [], nextIndent)
    );
  });
  descriptor.getExtensionList().forEach((extension) => {
    messageData.formattedExtListStr.push(
      formatExtension(fileName, exportMap, extension, nextIndent)
    );
  });

  registerHelper("printClearIfNotPresent", function (
    fieldData: MessageFieldType
  ) {
    if (!fieldData.hasClearMethodCreated) {
      fieldData.hasClearMethodCreated = true;
      return `clear${fieldData.camelUpperName}${
        fieldData.isRepeatField ? "List" : ""
      }(): void;`;
    }
  });
  registerHelper("printRepeatedAddMethod", function (
    fieldData: MessageFieldType,
    valueType: string
  ) {
    return `add${fieldData.camelUpperName}(value${
      fieldData.isOptionalValue ? "?" : ""
    }: ${valueType}, index?: number): ${valueType};`;
  });
  registerHelper("oneOfName", function (oneOfDecl: OneofDescriptorProto) {
    return oneOfName(oneOfDecl.getName());
  });

  return {
    indent,
    objectTypeName: OBJECT_TYPE_NAME,
    BYTES_TYPE: BYTES_TYPE,
    MESSAGE_TYPE: MESSAGE_TYPE,
    message: messageData,
  };
}
