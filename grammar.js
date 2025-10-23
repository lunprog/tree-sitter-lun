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
    [$._expression, $._expr_stmt],
    [$._expr_with_block_no_label, $.labeled_expr],
    [$.block_expr, $.labeled_expr],
  ],

  rules: {
    orb: $ => repeat($._item),

    // ITEM parsing

    _item: $ => choice(
      $.global_def_item,
      $.global_uninit_item,
      $.extern_block_item,
      $._directive,
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

    global_uninit_item: $ => seq(
      field('name', $.identifier),
      ':',
      field('typeexpr', $._typeexpr),
      ';',
    ),

    extern_block_item: $ => seq(
      'extern',
      $.string_lit,
      '{',
      repeat($._item),
      '}',
    ),

    // DIRECTIVE parsing

    _directive: $ => choice(
      $.mod_directive,
      $.import_directive,
    ),

    mod_directive: $ => seq(
      '#',
      'mod',
      $.identifier,
      ';',
    ),

    import_directive: $ => seq(
      '#',
      'import',
      $.path,
      field('alias', optional(seq('as', $.identifier))),
      ';',
    ),

    // TYPEEXPR parsing

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

    // EXPRESSION parsing

    _expression: $ => choice(
      $._expr_with_block,
      $._expr_without_block
    ),

    _expr_with_block_no_label: $ => choice(
      $.if_expr,
      $.block_expr,
      $.while_expr,
      $.for_expr,
      $.loop_expr,
      $.fun_expr,
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
      $.return_expr,
      $.break_expr,
      $.continue_expr,
      $.null_expr,
      $.field_expr,
      $.ptr_type_expr,
      $.funptr_type_expr,
    ),

    bool_expr: _ => choice(
      'true',
      'false',
    ),

    lit_expr: $ => $._literal,

    paren_expr: $ => seq(
      '(',
      $._expression,
      ')',
    ),

    path_expr: $ => $.path,

    path: $ => prec(PREC.primary, seq(
      choice('orb', field('seg', $.identifier)),
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

    call_args: $ => seq('(', sep($._expression, ','), ')'),

    call_expr: $ => prec.left(PREC.call, seq(
      field('callee', $._expression),
      field('args', $.call_args),
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

    fun_arg: $ => seq(
      field('name', $.identifier),
      ':',
      field('typeexpr', $._typeexpr)
    ),

    field_expr: $ => seq(
      $._expression,
      '.',
      field('field', $.identifier),
    ),

    fun_expr: $ => choice(
      prec.right(
        PREC.primary,
        seq(
          'fun',
          '(',
          field('args', fun_args($.fun_arg)),
          ')',
          field('ret_typeexpr', optional(seq('->', $._typeexpr))),
          field('body', $.block),
        )
      ),
      prec(-1, seq(
        'fun',
        '(',
        field('args', fun_args($._typeexpr)),
        ')',
        field('ret_typeexpr', optional(seq('->', $._typeexpr))),
      )),
    ),

    ptr_type_expr: $ => seq(
      '*',
      optional($.mut_spec),
      $._typeexpr,
    ),

    funptr_type_expr: $ => seq(
      '*',
      'fun',
      '(',
      field('args', fun_args($._typeexpr)),
      ')',
      field('ret_typeexpr', optional(seq('->', $._typeexpr))),
    ),

    // STATEMENT parsing

    block: $ => seq(
      '{',
      field('stmt', repeat($._statement)),
      field('last_expr', optional($._expression)),
      '}',
    ),

    _statement: $ => choice(
      $._expr_stmt,
      $.short_binding_stmt,
      $.let_binding_stmt,
      $.defer_stmt,
    ),

    _expr_stmt: $ => choice(
      seq($._expr_without_block, ';'),
      seq($._expr_with_block, optional(';')),
    ),

    short_binding_stmt: $ => seq(
      optional($.mut_spec),
      field('name', $.identifier),
      ':',
      field('typeexpr', optional($._typeexpr)),
      '=',
      field('value', $._expr_stmt),
    ),

    let_binding_stmt: $ => seq(
      'let',
      optional($.mut_spec),
      field('name', $.identifier),
      field('typeexpr', optional(seq(':', $._typeexpr))),
      '=',
      field('value', $._expression),
      ';',
    ),

    defer_stmt: $ => seq(
      'defer',
      $._expr_stmt,
    ),

    // TOKEN lexing

    // http://stackoverflow.com/questions/13014947/regex-to-match-a-c-style-multiline-comment/36328890#36328890
    comment: _ => token(choice(
      // line comment
      seq('//', /(\\+(.|\r?\n)|[^\\\n])*/),
      // block comment
      seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/' ),
    )),

    _literal: $ => choice(
      $.integer_lit,
      $.string_lit,
      $.char_lit,
      $._float_lit,
    ),

    integer_lit: _ => token(seq(
      choice(
        /[0-9][0-9_]*/,
        /0b[01_]+/,
        /0B[01_]+/,
        /0o[0-7_]+/,
        /0O[0-7_]+/,
        /0x[0-9a-fA-F_]+/,
        /0X[0-9a-fA-F_]+/,
      ),
      field('tag', optional(seq("'", /[a-zA-Z0-9_]+/)))
    )),

    _float_lit: $ => choice(
      $.decimal_float_lit,
      $.hex_float_lit
    ),

    decimal_float_lit: $ => token(choice(
      // digits "." [digits] [exponent]
      /[0-9_]+(?:[0-9_]+)*\.(?:[0-9_]+(?:[0-9_]+)*)?(?:[eE][+-]?[0-9_]+(?:[0-9_]+)*)?/,

      // "." digits [exponent]
      /\.(?:[0-9_]+(?:[0-9_]+)*)(?:[eE][+-]?[0-9_]+(?:[0-9_]+)*)?/,

      // digits exponent
      /[0-9]+(?:[0-9_]+)*[eE][+-]?[0-9_]+(?:_[0-9_]+)*/
    )),

    // hex_float_lit = ("0x" | "0X") hex_mantissa hex_exponent ;
    // hex_mantissa = ["_"] hex_digits "." [hex_digits]
    //   | ["_"] hex_digits
    //   | "." hex_digits ;
    // hex_exponent = ("p" | "P") ["+" | "-"] decimal_digits ;
    hex_float_lit: $ => token(
      /0[xX](?:_?[0-9A-Fa-f_]+\.[0-9A-Fa-f_]*|_?[0-9A-Fa-f_]+|\.[0-9A-Fa-f_]+)[pP][+-]?[0-9_]+/
    ),

    char_lit: $ => seq(
      /\w*'/,
      choice(
        token.immediate(/\w/),
        $.escape_sequence,
      ),
      /'/,
    ),

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

    mut_spec: _ => "mut",

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

/**
 * @param {Rule} fun_arg
 * @returns {SeqRule}
*/
function fun_args(fun_arg) {
  return seq(
    sep(
      seq(fun_arg),
      ','
    ),
  )
}
