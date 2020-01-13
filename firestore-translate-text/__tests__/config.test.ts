import { readFileSync } from "fs";
import { resolve as pathResolve } from "path";
import * as functionsTestInit from "firebase-functions-test";

import * as yaml from "js-yaml";
import mockedEnv from "mocked-env";

let restoreEnv;
let extensionYaml;
let extensionParams;
const environment = {
  LOCATION: "us-central1",
  LANGUAGES: "en,es,de,fr,en", // double en to test no duplicates
  COLLECTION_PATH: "translations",
  INPUT_FIELD_NAME: "input",
  OUTPUT_FIELD_NAME: "translated",
};

const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
functionsTestInit();

describe("extension config", () => {
  beforeAll(() => {
    extensionYaml = yaml.safeLoad(
      readFileSync(pathResolve(__dirname, "../extension.yaml"), "utf8")
    );

    extensionParams = extensionYaml.params.reduce((obj, param) => {
      obj[param.param] = param;
      return obj;
    }, {});
  });

  beforeEach(() => {
    restoreEnv = mockedEnv(environment);
    consoleLogSpy.mockClear();
  });

  afterEach(() => restoreEnv());

  test("config loaded from environment variables", () => {
    const functionsConfig = require("../functions/src/config").default;

    expect(functionsConfig).toMatchSnapshot({});
  });

  test("config is logged on initialize", () => {
    jest.requireActual("../functions/src");

    const functionsConfig = jest.requireActual("../functions/src/config")
      .default;
    expect(consoleLogSpy).toBeCalledWith(
      "Initializing extension with configuration",
      functionsConfig
    );

    consoleLogSpy.mockRestore();
  });

  // LANGUAGES
  describe("config.LANGUAGES", () => {
    test("param exists", () => {
      const extensionParam = extensionParams["LANGUAGES"];
      expect(extensionParam).toMatchSnapshot();
    });

    test("removes duplicated any duplicated languages from user input", () => {
      const functionsConfig = require("../functions/src/config").default;
      expect(functionsConfig.languages).toEqual(["en", "es", "de", "fr"]);
    });

    describe("validationRegex", () => {
      test("does not allow empty strings", () => {
        const { validationRegex } = extensionParams["LANGUAGES"];
        expect(Boolean("".match(new RegExp(validationRegex)))).toBeFalsy();
      });

      // TODO(@Salakar): Broken in https://github.com/firebase/extensions/pull/46
      //                 will follow up in later PR
      xtest("does not allow leading delimiter", () => {
        const { validationRegex } = extensionParams["LANGUAGES"];
        expect(Boolean(",en".match(new RegExp(validationRegex)))).toBeFalsy();
      });

      test("does not allow trailing delimiter", () => {
        const { validationRegex } = extensionParams["LANGUAGES"];
        expect(Boolean("en,".match(new RegExp(validationRegex)))).toBeFalsy();
      });

      // https://github.com/firebase/extensions/issues/43
      test("allows a single language", () => {
        const { validationRegex } = extensionParams["LANGUAGES"];
        expect(Boolean("en".match(new RegExp(validationRegex)))).toBeTruthy();
      });

      test("allows multiple languages", () => {
        const { validationRegex } = extensionParams["LANGUAGES"];

        expect(
          Boolean("en,fr".match(new RegExp(validationRegex)))
        ).toBeTruthy();

        expect(
          Boolean("en,fr,de,es".match(new RegExp(validationRegex)))
        ).toBeTruthy();
      });
    });
  });
});
