// eslint-disable-next-line no-undef
module.exports = {
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
    requireConfigFile: false,
  },
  parser: "@babel/eslint-parser",
  ignorePatterns: ["node_modules/**"],
  extends: ["eslint:recommended", "plugin:prettier/recommended"],
  env: {
    node: true,
    es6: true,
  },
  globals: {
    solanaWeb3: true,
  },
};
