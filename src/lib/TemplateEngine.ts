import * as fs from "fs";
import * as handlebars from "handlebars";
import * as helpers from "handlebars-helpers";
import * as path from "path";

import { ProtoMessageDefinitionModel } from "./format/ProtoMessageDefinitionFormatter";
import { ProtoServiceDefinitionModel } from "./format/ProtoServiceDefinitionFormatter";
import { format as prettier } from "prettier";

const TPL_BASE_PATH = path.join(__dirname, "template");

const templateCache = {};

export function compile(
  templateName: "message_definition_template" | "service_definition_template"
): HandlebarsTemplateDelegate {
  return handlebars.compile(
    fs.readFileSync(`${path.join(TPL_BASE_PATH, templateName)}.hbs`).toString()
  );
}

export function render(
  templateName: "message_definition_template" | "service_definition_template",
  params: ProtoMessageDefinitionModel | ProtoServiceDefinitionModel
): string {
  let template;
  if (templateCache[templateName]) {
    template = templateCache[templateName];
  } else {
    templateCache[templateName] = compile(templateName);
    template = templateCache[templateName];
  }
  const result = template(params);
  return prettier(result, { parser: "typescript" });
}

export function registerHelper(
  name: string,
  fn: handlebars.HelperDelegate
): void {
  handlebars.registerHelper(name, fn);
}

helpers({ handlebars });

handlebars.registerHelper("curlyLeft", function () {
  return "{";
});
handlebars.registerHelper("curlyRight", function () {
  return "}";
});

handlebars.registerHelper("renderPartial", function (
  templateName: "message_definition_template" | "service_definition_template",
  params: ProtoMessageDefinitionModel | ProtoServiceDefinitionModel
) {
  return render(templateName, params);
});
