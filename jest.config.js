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
  testPathIgnorePatterns: ["build"],
  setupFilesAfterEnv: ["jest-extended"],
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
};
