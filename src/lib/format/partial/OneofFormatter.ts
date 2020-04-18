import {
  FieldDescriptorProto,
  OneofDescriptorProto,
} from "google-protobuf/google/protobuf/descriptor_pb";

import { oneOfName } from "../../Utility";

export interface OneofModel {
  oneofName: string;
  oneofNameUpper: string;
  fields: { [key: string]: number };
}

export function format(
  oneofDecl: OneofDescriptorProto,
  oneofFields: Array<FieldDescriptorProto>
): OneofModel {
  const oneofName = oneOfName(oneofDecl.getName());
  const oneofNameUpper = oneofDecl.getName().toUpperCase();
  const fields: { [key: string]: number } = {};

  oneofFields.forEach((field) => {
    fields[field.getName().toUpperCase()] = field.getNumber();
  });

  return {
    oneofName,
    oneofNameUpper,
    fields,
  };
}
