module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  moduleNameMapper: {
    "^src/(.*)$": "<rootDir>/src/$1",
  },
  transform: {
    "<transform_regex>": ["ts-jest", { tsconfig: "tsconfig.json" }],
  },
  setupFiles: ["./jestSetup.ts"],
  verbose: true,
};
