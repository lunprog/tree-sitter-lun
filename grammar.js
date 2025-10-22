/**
 * @file Lun grammar for tree-sitter
 * @author Thibault V. <th1bault.vincent@proton.me>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "lun",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
