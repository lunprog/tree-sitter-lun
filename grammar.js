/**
 * @file Lun grammar for tree-sitter
 * @author Thibault V. <th1bault.vincent@proton.me>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  // a = b
  assign: 0,
  // a || b
  logor: 1,
  // a && b
  logand: 2,
  // a > b, a >= b, a < b, a <= b
  comp: 3,
  // a == b, a != b
  eq: 4,
  // a | b
  bitor: 5,
  // a ^ b
  bitxor: 6,
  // a & b
  bitand: 7,
  // a >> b, a << b
  shift: 8,
  // a + b, a - b
  term: 9,
  // a * b, a / b, a % b
  factor: 10,
  // op expr
  unary: 11,
  // call expr
  call: 12,
  // field expr
  field: 13,
  // primary expr
  primary: 14,
};

module.exports = grammar({
  name: "lun",

  extras: ($) => [
    /\s/, // whitespace
    $.comment,
  ],

  word: $ => $.identifier,

  conflicts: $ => [
    // TODO: this maybe kind of an hack, but it works.
    [$._expression, $._statement],
  ],

  rules: {
    source_file: $ => repeat($._item),

    _item: $ => choice(
      $.global_def_item,
    ),

    global_def_item: $ => seq(
      field('name', $.identifier),
      ':',
      field('typeexpr', optional($._typeexpr)),
      choice(':', '='),
      choice(
        seq(field('value', $._expr_without_block), ';'),
        seq(field('value', $._expr_with_block), optional(';')),
      )
    ),

    _typeexpr: $ => prec.left(PREC.logor, choice(
      $._expr_with_block_no_label,
      $._expr_without_block,
      $.primitive_type,
    )),

    primitive_type: _ => choice(
      'isz',
      'i128',
      'i64',
      'i32',
      'i16',
      'i8',
      'usz',
      'u128',
      'u64',
      'u32',
      'u16',
      'u8',
      'f16',
      'f32',
      'f64',
      'f128',
      'bool',
      'str',
      'char',
      'never',
      'void',
    ),

    mut_spec: _ => "mut",

    _expression: $ => choice(
      $._expr_with_block,
      $._expr_without_block
    ),

    _expr_with_block_no_label: $ => choice(
      $.block_expr,
      $.while_expr,
      $.loop_expr,
    ),

    _expr_with_block: $ => choice(
      $._expr_with_block_no_label,
      $.labeled_expr,
    ),

    block_expr: $ => seq(
      field('block', $.block),
    ),

    labeled_expr: $ => seq(
      field('label', $.identifier),
      ':',
      choice(
        $.block,
        $.while_expr,
        $.for_expr,
        $.loop_expr,
      ),
    ),

    _expr_without_block: $ => choice(
      $.bool_expr,
      $.lit_expr,
      $.paren_expr,
      $.path_expr,
      $.binary_expr,
      $.assign_expr,
      $.left_unary_expr,
      $.right_unary_expr,
      $.borrow_expr,
      $.call_expr,
      $.if_expr,
      $.return_expr,
      $.break_expr,
      $.continue_expr,
      $.null_expr,
      $.field_expr,
    ),

    bool_expr: _ => choice(
      'true',
      'false',
    ),

    lit_expr: $ => choice(
      $.integer_lit,
      $.string_lit,
    ),

    paren_expr: $ => seq(
      '(',
      $._expression,
      ')',
    ),

    path_expr: $ => $.path,

    path: $ => prec(PREC.primary, seq(
      choice('orb', field('first_seg', $.identifier)),
      repeat(seq(token('::'), field('seg', $.identifier))),
    )),

    binary_expr: $ => {
      const table = [
        [PREC.logor, '||'],
        [PREC.logand, '&&'],
        [PREC.comp, choice('>', '>=', '<', '<=')],
        [PREC.eq, choice('==', '!=')],
        [PREC.bitor, '|'],
        [PREC.bitxor, '^'],
        [PREC.bitand, '&'],
        [PREC.shift, choice('>>', '<<')],
        [PREC.term, choice('+', '-')],
        [PREC.factor, choice('*', '/', '%')]
      ];

      // @ts-ignore
      return choice(...table.map(([precedence, operator]) => prec.left(precedence, seq(
        field('lhs', $._expression),
        // @ts-ignore
        field('op', operator),
        field('rhs', $._expression),
      ))));
    },

    assign_expr: $ => prec.right(PREC.assign, seq(
        field('lhs', $._expression),
        '=',
        field('rhs', $._expression),
    )),

    left_unary_expr: $ => prec(PREC.unary, seq(
      field('op', choice('-', '!')),
      $._expression,
    )),

    right_unary_expr: $ => seq(
      $._expression,
      field('deref', '.*'),
    ),

    borrow_expr: $ => prec(PREC.unary, seq(
      '&',
      optional($.mut_spec),
      $._expression,
    )),

    arguments: $ => seq('(', sep($._expression, ','), ')'),

    call_expr: $ => prec.left(PREC.call, seq(
      field('callee', $._expression),
      field('args', $.arguments),
    )),

    if_expr: $ => prec.left(seq(
      'if',
      field('cond', $._expression),
      field('then', $.block),
      field('else', optional(seq(
        'else',
        choice($.if_expr, $.block),
      ))),
    )),

    while_expr: $ => seq(
      'while',
      field('cond', $._expression),
      field('body', $.block),
    ),

    for_expr: $ => seq(
      'for',
      field('var', $.identifier),
      'in',
      field('iterator', $._expression),
      field('body', $.block),
    ),

    loop_expr: $ => seq(
      'loop',
      field('body', $.block),
    ),

    return_expr: $ => choice(
      prec.left(seq('return', $._expression)),
      prec(-1, 'return'),
    ),

    break_expr: $ => choice(
      // break without label
      choice(
        prec.left(seq('break', $._expression)),
        prec(-1, 'break'),
      ),
      // break with label
      choice(
        prec.left(seq(
          'break',
          ':',
          field('label', $.identifier),
          $._expression
        )),
        prec(-1, seq(
          'break',
          ':',
          field('label', $.identifier),
        )),
      ),
    ),

    continue_expr: $ => choice(
      prec.left(seq('continue', ':', field('label', $.identifier))),
      prec(-1, 'continue'),
    ),

    null_expr: _ => 'null',

    fundef_expr: $ => seq(
      'fun',
    ),

    field_expr: $ => seq(
      $._expression,
      '.',
      field('field', $.identifier),
    ),

    block: $ => seq(
      '{',
      field('stmt', repeat($._statement)),
      field('last_expr', optional($._expression)),
      '}',
    ),

    _statement: $ => choice(
      seq($._expr_without_block, ';'),
      $._expr_with_block,
    ),

    // http://stackoverflow.com/questions/13014947/regex-to-match-a-c-style-multiline-comment/36328890#36328890
    comment: _ => token(choice(
      // line comment
      seq('//', /(\\+(.|\r?\n)|[^\\\n])*/),
      // block comment
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/' ),
    )),

    integer_lit: _ => token(seq(
      choice(
        /[0-9][0-9_]*/,
        /0b[01_]+/,
        /0o[0-7_]+/,
        /0x[0-9a-fA-F]+/,
      ),
      field('tag', optional(seq("'", /[a-zA-Z0-9_]+/)))
    )),

    string_lit: $ => seq(
      field('tag', optional($.identifier)),
      '"',
      repeat(choice(
        $.escape_sequence,
        alias(token.immediate(prec(1, /[^\\"\n]+/)), $.string_content),
      )),
      '"',
    ),

    escape_sequence: _ => token.immediate(seq(
      '\\',
      choice(
        '0',
        'n',
        'r',
        't',
        'v',
        'a',
        'b',
        'e',
        '\\',
        // \xFF escape sequence
        /x[0-9a-fA-F]{2}/,
        // unicode escape sequence
        seq(
          'u{',
          /[0-9a-fA-F]+/,
          '}',
        ),
      ),
    )),


    identifier: _ => token(/[a-zA-Z_][a-zA-Z0-9_]*/),
  }
});

/**
 * Create a sequence of one or more rules separated by a given separator,
 * allowing an optional trailing separator at the end.
 *
 * @param {Rule} rule - The repeated element rule
 * @param {string|Rule} separator - The separator token or rule (e.g. ',' or $.semicolon)
 * @returns {SeqRule}
 */
function sep1(rule, separator) {
  return seq(
    rule,
    repeat(seq(separator, rule)),
    optional(separator)
  );
}

/**
 * Create a sequence of zero or more rules separated by a given separator,
 * allowing an optional trailing separator.
 *
 * @param {Rule} rule - The repeated element rule
 * @param {string|Rule} separator - The separator token or rule (e.g. ',' or $.semicolon)
 * @returns {ChoiceRule}
 */
function sep(rule, separator) {
  return optional(sep1(rule, separator));
}
