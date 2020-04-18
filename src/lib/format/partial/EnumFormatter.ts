import { EnumDescriptorProto } from "google-protobuf/google/protobuf/descriptor_pb";

export interface EnumModel {
  enumName: string;
  values: { [key: string]: number };
}

export function format(enumDescriptor: EnumDescriptorProto): EnumModel {
  const enumName = enumDescriptor.getName();
  const values: { [key: string]: number } = {};
  enumDescriptor.getValueList().forEach((value) => {
    values[value.getName().toUpperCase()] = value.getNumber();
  });

  return {
    enumName,
    values,
  };
}
