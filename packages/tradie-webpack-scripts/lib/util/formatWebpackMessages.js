/*
  Copied from: https://github.com/facebookincubator/create-react-app/blob/9cce0fb59f5e4a47c043c26c41e281c812e57ff4/packages/react-dev-utils/formatWebpackMessages.js

    - hopefully gets split out into its own package soon

 */

/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

// WARNING: this code is untranspiled and is used in browser too.
// Please make sure any changes are in ES5 or contribute a Babel compile step.

// Some custom utilities to prettify Webpack output.
// This is quite hacky and hopefully won't be needed when Webpack fixes this.
// https://github.com/webpack/webpack/issues/2878

var friendlySyntaxErrorLabel = 'Syntax error:';

function isLikelyASyntaxError(message) {
  return message.indexOf(friendlySyntaxErrorLabel) !== -1;
}

// Cleans up webpack error messages.
function formatMessage(message) {
  var lines = message.split('\n');

  // line #0 is filename
  // line #1 is the main error message
  if (!lines[0] || !lines[1]) {
    return message;
  }

  // Remove webpack-specific loader notation from filename.
  // Before:
  // ./~/css-loader!./~/postcss-loader!./src/App.css
  // After:
  // ./src/App.css
  if (lines[0].lastIndexOf('!') !== -1) {
    lines[0] = lines[0].substr(lines[0].lastIndexOf('!') + 1);
  }

  // Cleans up verbose "module not found" messages for files and packages.
  if (lines[1].indexOf('Module not found: ') === 0) {
    lines = [
      lines[0],
      // Clean up message because "Module not found: " is descriptive enough.
      lines[1].replace(
        'Cannot resolve \'file\' or \'directory\' ', ''
      ).replace(
        'Cannot resolve module ', ''
      ).replace(
        'Error: ', ''
      ),
      // Skip all irrelevant lines.
      // (For some reason they only appear on the client in browser.)
      '',
      lines[lines.length - 1] // error location is the last line
    ]
  }

  // Cleans up syntax error messages.
  if (lines[1].indexOf('Module build failed: ') === 0) {
    // For some reason, on the client messages appear duplicated:
    // https://github.com/webpack/webpack/issues/3008
    // This won't happen in Node but since we share this helpers,
    // we will dedupe them right here. We will ignore all lines
    // after the original error message text is repeated the second time.
    var errorText = lines[1].substr('Module build failed: '.length);
    var cleanedLines = [];
    var hasReachedDuplicateMessage = false;
    // Gather lines until we reach the beginning of duplicate message.
    lines.forEach(function(line, index) {
      if (
        // First time it occurs is fine.
      index !== 1 &&
      // line.endsWith(errorText)
      line.length >= errorText.length &&
      line.indexOf(errorText) === line.length - errorText.length
      ) {
        // We see the same error message for the second time!
        // Filter out repeated error message and everything after it.
        hasReachedDuplicateMessage = true;
      }
      if (
        !hasReachedDuplicateMessage ||
        // Print last line anyway because it contains the source location
        index === lines.length - 1
      ) {
        // This line is OK to appear in the output.
        cleanedLines.push(line);
      }
    });
    // We are clean now!
    lines = cleanedLines;
    // Finally, brush up the error message a little.
    lines[1] = lines[1].replace(
      'Module build failed: SyntaxError:',
      friendlySyntaxErrorLabel
    );
  }

  // Reassemble the message.
  message = lines.join('\n');
  // Internal stacks are generally useless so we strip them
  message = message.replace(
    /^\s*at\s((?!webpack:).)*:\d+:\d+[\s\)]*(\n|$)/gm, '' //https://github.com/facebookincubator/create-react-app/pull/1050
  ); // at ... ...:x:y

  return message;
}

function formatWebpackMessages(json) {
  var formattedErrors = json.errors.map(function(message) {
    return 'Error in ' + formatMessage(message)
  });
  var formattedWarnings = json.warnings.map(function(message) {
    return 'Warning in ' + formatMessage(message)
  });
  var result = {
    errors: formattedErrors,
    warnings: formattedWarnings
  };
  if (result.errors.some(isLikelyASyntaxError)) {
    // If there are any syntax errors, show just them.
    // This prevents a confusing ESLint parsing error
    // preceding a much more useful Babel syntax error.
    result.errors = result.errors.filter(isLikelyASyntaxError);
  }
  return result;
}

module.exports = formatWebpackMessages;
