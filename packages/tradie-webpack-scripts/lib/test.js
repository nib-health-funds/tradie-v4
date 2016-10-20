'use strict';
const path = require('path');
const spawn = require('child_process').spawn;
const webpack = require('webpack');
const MemoryFS = require('memory-fs');
const TestReporter = require('./util/TestReporter');
const runWebpack = require('./util/runWebpack');

/**
 * Run webpack on multiple bundles and display the results
 * @param {object}  options
 * @param {string}  [options.cwd]
 * @param {boolean} [options.watch]
 * @param {boolean} [options.debug]
 * @param {object}  options.webpack
 * @returns {Promise.<null>}
 */
module.exports = options => new Promise((resolve, reject) => {
  const reporter = new TestReporter({debug: options.debug});

  let runner = null;
  const compiler = webpack(options.webpack);

  reporter.observe(compiler);

  //if the test runner is still running when we start the next compilation, stop the test runner
  compiler.plugin('compile', () => {
    if (runner) {
      runner.kill();
    }
  });

  //run the tests
  compiler.plugin('done', stats => {
    const json = stats.toJson();

    //if we weren't able to compile the module then we can't proceed
    if (json.errors.length) {
      if (!options.watch) {
        reject();
      }
      return;
    }

    //find the first JS file and get the output
    const asset = Object.keys(json.assets).find(path => /\.js$/.test(path));
    if (!asset) {
      reject(new Error(`tradie: No test bundle found.`));
      return;
    }
    const compiledOutput = asset.source();

    //create the test runner
    runner = spawn('node', {cwd: options.root});

    //handle errors running the test runner
    runner
      .on('error', error => console.error(error))
      .on('exit', exitCode => {
        if (!options.watch) {
          if (exitCode === 0) {
            resolve();
          } else {
            reject();
          }
        }
      })
    ;

    //forward the output of the test runner to stdout/stderr
    runner.stdout.pipe(process.stdout);
    runner.stderr.pipe(process.stderr);

    //pass the compiled output to the test runner
    runner.stdin.write(compiledOutput);
    runner.stdin.end();

  });

  //we don't want to write the compiled tests to disk so use a virtual filesystem
  const virtualFileSystem = new MemoryFS();
  compiler.outputFileSystem = virtualFileSystem;

  //compile the tests
  runWebpack(options.watch, compiler)
    .catch(reject)
  ;

});
