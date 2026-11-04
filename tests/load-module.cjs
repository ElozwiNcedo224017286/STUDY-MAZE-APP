const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const babel = require('@babel/core');

// Execute app helpers with explicit device/network substitutes, without Expo.
module.exports = function loadModule(filename, mocks = {}, globals = {}) {
  const absolute = path.resolve(__dirname, '..', filename);
  const nativeRequire = createRequire(absolute);
  const { code } = babel.transformSync(fs.readFileSync(absolute, 'utf8'), {
    filename: absolute,
    configFile: false,
    babelrc: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
  });
  const module = { exports: {} };
  const requireMock = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith('.')) {
      let relative = path.relative(path.resolve(__dirname, '..'), path.resolve(path.dirname(absolute), name));
      if (!path.extname(relative)) relative += '.js';
      return loadModule(relative, mocks, globals);
    }
    return nativeRequire(name);
  };
  const execute = new Function('module', 'exports', 'require', ...Object.keys(globals), code);
  execute(module, module.exports, requireMock, ...Object.values(globals));
  return module.exports;
};
