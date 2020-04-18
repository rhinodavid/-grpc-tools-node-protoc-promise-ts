import * as fs from "fs";
import * as handlebars from "handlebars";
import * as helpers from "handlebars-helpers";
import * as path from "path";

import { format as prettier } from "prettier";

const TPL_BASE_PATH = path.join(__dirname, "template");

const templateCache = {};

export function registerHelper(
  name: string,
  fn: handlebars.HelperDelegate
): void {
  handlebars.registerHelper(name, fn);
}

export function compile(templateName: string): HandlebarsTemplateDelegate {
  return handlebars.compile(
    fs.readFileSync(`${path.join(TPL_BASE_PATH, templateName)}.hbs`).toString()
  );
}

export function render(
  templateName: string,
  params: { [key: string]: any }
): string {
  const template =
    templateCache[templateName] ||
    (templateCache[templateName] = compile(templateName));
  return template(params);
}

helpers({ handlebars: handlebars });
handlebars.registerHelper("curlyLeft", function () {
  return "{";
});
handlebars.registerHelper("curlyRight", function () {
  return "}";
});
handlebars.registerHelper("render", function (
  templateName: string,
  params: { [key: string]: any }
) {
  const result = render(templateName, params);
  return prettier(result, { parser: "typescript" });
});
