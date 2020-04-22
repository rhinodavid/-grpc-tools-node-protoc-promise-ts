module.exports = {
  displayName: "test",
  globals: {
    "ts-jest": {
      tsConfig: "tsconfig.json",
    },
  },
  moduleFileExtensions: ["js", "ts"],
  modulePathIgnorePatterns: ["node_modules"],
  name: "test",
  setupFilesAfterEnv: ["jest-extended"],
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
};
