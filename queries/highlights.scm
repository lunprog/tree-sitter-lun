; --- Identifiers ---

(primitive_type) @type.builtin
(field_identifier) @property

; assume all-caps names are constants
((identifier) @constant
 (#match? @constant "^[A-Z][A-Z\\d_]*$"))

; --- Literals ---

(char_lit) @constant.character
(string_lit) @string
(escape_sequence) @escape

(integer_lit) @constant.numeric.integer
(_float_lit) @constant.numeric.float
(bool_expr) @constant.builtin.boolean

; --- Function ---

(call_expr
  callee: (path_expr) @function)

(fun_arg (identifier) @label)

; --- Delimiters ---

"(" @punctuation.bracket
")" @punctuation.bracket
"{" @punctuation.bracket
"}" @punctuation.bracket

"::" @punctuation.delimiter
"." @punctuation.delimiter
"," @punctuation.delimiter
";" @punctuation.delimiter

; --- Keywords ---

; NOTE: keywords that are not used in lun currently are present but prefixed
; with a comment in this query.

"as" @keyword
"break" @keyword
; "comptime" @keyword
"continue" @keyword
"defer" @keyword
"else" @keyword
"extern" @keyword
"false" @keyword
"for" @keyword
"fun" @keyword
"if" @keyword
; "impl" @keyword
"in" @keyword
"let" @keyword
"loop" @keyword
(mut_spec) @keyword
(null_expr) @keyword
"orb" @keyword
; "pub" @keyword
"return" @keyword
; "self" @keyword
; "then" @keyword
; "trait" @keyword
"true" @keyword
"while" @keyword

(_directive ("import") @keyword)
(_directive ("mod") @keyword)

; --- Operators ---

"&" @operator

; --- Comments ---

(line_comment) @comment
(block_comment) @comment
