import { MESSAGE_TYPE, getFieldType } from "./partial/FieldTypesFormatter";
import {
  filePathFromProtoWithoutExt,
  filePathToPseudoNamespace,
  getPathToRoot,
} from "../Utility";

import { DependencyFilter } from "../DependencyFilter";
import { ExportMap } from "../ExportMap";
import { FileDescriptorProto } from "google-protobuf/google/protobuf/descriptor_pb";
import { WellKnownTypesMap } from "../WellKnown";
import { registerHelper } from "../TplEngine";

export interface ServiceType {
  serviceName: string;
  methods: Array<ServiceMethodType>;
}

export const defaultServiceType = JSON.stringify({
  serviceName: "",
  methods: [],
} as ServiceType);

export interface ServiceMethodType {
  packageName: string;
  serviceName: string;
  methodName: string;
  requestStream: boolean;
  responseStream: boolean;
  requestTypeName: string;
  responseTypeName: string;
  type: string; // "ClientUnaryCall" || "ClientWritableStream" || "ClientReadableStream" || "ClientDuplexStream"
}

export const defaultServiceMethodType = JSON.stringify({
  packageName: "",
  serviceName: "",
  methodName: "",
  requestStream: false,
  responseStream: false,
  requestTypeName: "",
  responseTypeName: "",
  type: "",
} as ServiceMethodType);

export interface ProtoSvcTsdModel {
  packageName: string;
  fileName: string;
  imports: string[];
  services: Array<ServiceType>;
}

export function format(
  descriptor: FileDescriptorProto,
  exportMap: ExportMap
): ProtoSvcTsdModel {
  if (descriptor.getServiceList().length === 0) {
    return null;
  }

  const fileName = descriptor.getName();
  const packageName = descriptor.getPackage();
  const upToRoot = getPathToRoot(fileName);

  const imports: Array<string> = [];
  const services: Array<ServiceType> = [];

  // Need to import the non-service file that was generated for this .proto file
  imports.push(`import * as grpc from "grpc";`);
  const asPseudoNamespace = filePathToPseudoNamespace(fileName);
  imports.push(
    `import * as ${asPseudoNamespace} from "${upToRoot}${filePathFromProtoWithoutExt(
      fileName
    )}";`
  );

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
        `import * as ${pseudoNamespace} from "${upToRoot + filePath}";`
      );
    }
  });

  descriptor.getServiceList().forEach((service) => {
    const serviceData = JSON.parse(defaultServiceType) as ServiceType;

    serviceData.serviceName = service.getName();

    service.getMethodList().forEach((method) => {
      const methodData = JSON.parse(
        defaultServiceMethodType
      ) as ServiceMethodType;

      methodData.packageName = packageName;
      methodData.serviceName = serviceData.serviceName;
      methodData.methodName = method.getName();
      methodData.requestStream = method.getClientStreaming();
      methodData.responseStream = method.getServerStreaming();
      methodData.requestTypeName = getFieldType(
        MESSAGE_TYPE,
        method.getInputType().slice(1),
        "",
        exportMap
      );
      methodData.responseTypeName = getFieldType(
        MESSAGE_TYPE,
        method.getOutputType().slice(1),
        "",
        exportMap
      );

      if (!methodData.requestStream && !methodData.responseStream) {
        methodData.type = "ClientUnaryCall";
      } else if (methodData.requestStream && !methodData.responseStream) {
        methodData.type = "ClientWritableStream";
      } else if (!methodData.requestStream && methodData.responseStream) {
        methodData.type = "ClientReadableStream";
      } else if (methodData.requestStream && methodData.responseStream) {
        methodData.type = "ClientDuplexStream";
      }

      serviceData.methods.push(methodData);
    });

    services.push(serviceData);
  });

  registerHelper("lcFirst", function (str) {
    return str.charAt(0).toLowerCase() + str.slice(1);
  });

  return {
    packageName: packageName,
    fileName: fileName,
    imports: imports,
    services: services,
  };
}
