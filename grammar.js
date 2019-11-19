const PREC = {
  POSTFIX: 16,
  PREFIX: 15,
  UNARY: 15,
  CAST: 14,
  MULT: 13,
  ADD: 12,
  SHIFT: 11,
  REL: 10,
  EQUAL: 9,
  AND: 8,
  XOR: 7,
  OR: 6,
  LOGAND: 5,
  LOGOR: 4,
  COND: 3,
  ASSIGN: 2,
  SEQ: 1
};

const BYTE_ORDER_MARK = '\xEF\xBB\xBF';

module.exports = grammar({
  name: 'c_sharp',

  extras: $ => [
    $.comment,
    /\s+/,
    $.preprocessor_directive
  ],

  conflicts: $ => [
    [$.anonymous_method_expression],
    [$._expression, $.generic_name],
    [$._expression, $._name],
    [$._expression, $._identifier_or_global],

    [$.qualified_name, $.explicit_interface_specifier],

    [$._identifier_or_global, $.enum_member_declaration],
    [$._identifier_or_global, $.type_parameter_list],
    [$._identifier_or_global, $.generic_name],

    [$._type, $.type_parameter_list],
    [$._type, $.enum_member_declaration],
    
    [$.invocation_expression, $.anonymous_method_expression],
    [$.assignment_expression, $.anonymous_method_expression],
    [$.element_access_expression, $.anonymous_method_expression],
    [$.element_access_expression, $.enum_member_declaration],
        
    [$.switch_expression, $.anonymous_method_expression],

    [$.modifier, $.object_creation_expression],
    [$.event_declaration, $.variable_declarator],
    [$.constant_pattern, $.case_switch_label]
  ],

  inline: $ => [
    $.class_type,
    $.return_type
  ],

  word: $ => $.identifier_name,

  rules: {
    
    compilation_unit: $ => seq(
      optional(BYTE_ORDER_MARK),
      repeat($._declaration) // Intentionally deviates from spec so that we can syntax highlight fragments of code
    ),

    extern_alias_directive: $ => seq('extern', 'alias', $.identifier_name, ';'),

    _declaration: $ => choice(
      $.global_attribute_list, // Consider moving up so only valid in compilation_unit
      $.class_declaration,
      $.delegate_declaration,
      $.destructor_declaration,
      $.enum_declaration,
      $.event_declaration,
      $.extern_alias_directive,
      $._base_field_declaration,
      $.indexer_declaration,
      $.interface_declaration,
      $.method_declaration,
      $.namespace_declaration,
      $.operator_declaration,
      $.conversion_operator_declaration,
      $.constructor_declaration,
      $.destructor_declaration,
      $.property_declaration,
      $.struct_declaration,
      $.using_directive,
    ),

    using_directive: $ => seq(
      'using',
      optional(choice(
        'static',
        $.name_equals
      )),
      $._name,
      ';'
    ),

    name_equals: $ => seq($._identifier_or_global, '='),

    identifier_name: $ => /[a-zA-Z_][a-zA-Z_0-9]*/, // identifier_token in Roslyn
    _identifier_or_global: $ => choice('global', $.identifier_name), // identifier_name in Roslyn

    _name: $ => choice(
      $.alias_qualified_name,
      $.qualified_name,
      $._simple_name
    ),

    alias_qualified_name: $ => seq($._identifier_or_global, '::', $._simple_name),

    _simple_name: $ => choice(
      $.generic_name,
      $._identifier_or_global
    ),

    generic_name: $ => seq($.identifier_name, $.type_argument_list),

    type_argument_list: $ => seq('<', commaSep1($._type), '>'),

    qualified_name: $ => seq($._name, '.', $._simple_name),

    attribute_list: $ => seq('[', commaSep1($.attribute), ']'),
    attribute: $ => seq($.identifier_name, optional($.attribute_argument_list)),

    attribute_argument_list: $ => seq(
      '(',
      commaSep($.attribute_argument),
      ')'
    ),

    attribute_argument: $ => seq(
      optional(choice($.name_equals,$.name_colon)),
      $._expression
    ),

    global_attribute_list: $ => seq(
      '[',
      choice('assembly', 'module'),
      ':',
      commaSep($.attribute),
      ']'
    ),

    name_colon: $ => seq($._identifier_or_global, ':'),

    _member_declaration: $ => choice(
      $._base_field_declaration,
      $._base_method_declaration,
      $._base_property_declaration,
      $._base_type_declaration,
      $.delegate_declaration,
      $.enum_member_declaration,
      // TODO: Consider incomplete_member and global_statement...
      $.namespace_declaration,
    ),

    _base_field_declaration: $ => choice(
      $.event_field_declaration,
      $.field_declaration
    ),

    event_field_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      'event',
      $.variable_declaration,
      ';'
    ),

    modifier: $ => choice(
      'abstract',
      'async',
      'const',
      'extern',
      'fixed',
      'internal',
      'new',
      'override',
      'partial',
      'private',
      'protected',
      'public',
      'readonly',
      'ref',
      'sealed',
      'static',
      'unsafe',
      'virtual',
      'volatile'
    ),

    variable_declaration: $ => seq($._type, commaSep1($.variable_declarator)),

    variable_declarator: $ => seq(
      $.identifier_name,
      optional($.bracketed_argument_list),
      optional($.equals_value_clause)
    ),

    bracketed_argument_list: $ => seq(
      '[',
      commaSep1($.argument),
      ']'
    ),

    argument: $ => seq(
      optional($.name_colon),
      optional(choice('ref', 'out', 'in')),
      $._expression
    ),

    equals_value_clause: $ => seq('=', $._expression),

    field_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      $.variable_declaration,
      ';'
    ),

    _base_method_declaration: $ => choice(
      $.constructor_declaration,
      $.conversion_operator_declaration,
      $.destructor_declaration,
      $.method_declaration,
      $.operator_declaration
    ),

    constructor_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      $.identifier_name,
      $.parameter_list,
      optional($.constructor_initializer),
      $._function_body
    ),

    // Params varies quite a lot from the Roslyn syntax in grammar.txt as that handles neither 'out' nor 'params' or arrays...
    
    parameter_list: $ => seq(
      '(',
      optional($._formal_parameter_list),
      ')'
    ),

    _formal_parameter_list: $ => commaSep1(choice(
      $.parameter,
      $.parameter_array
    )),

    parameter: $ => seq(
      repeat($.attribute_list),
      optional($.parameter_modifier),
      optional($._type),
      $.identifier_name,
      optional($.equals_value_clause)
    ),

    parameter_modifier: $ => choice('ref', 'out', 'this'),

    parameter_array: $ => seq(
      repeat($.attribute_list),
      'params',
      $.array_type,
      $.identifier_name
    ),

    constructor_initializer: $ => seq(
      ':',
      choice('base', 'this'),
      $.argument_list
    ),

    argument_list: $ => seq(
      '(',
      commaSep($._expression),
      ')'
    ),

    block: $ => seq('{', repeat($._statement), '}'),

    arrow_expression_clause: $ => seq('=>', $._expression),

    conversion_operator_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      choice(
        'implicit',
        'explicit'
      ),
      'operator',
      $._type,
      $.parameter_list,
      $._function_body,
    ),

    _function_body: $ => choice(
      $.block,
      seq($.arrow_expression_clause, ';'),
      ';' // Only applies to interfaces
    ),

    destructor_declaration: $ => seq(
      repeat($.attribute_list),
      optional('extern'),
      '~',
      $.identifier_name,
      $.parameter_list,
      $._function_body
    ),

    method_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      $.return_type,
      optional($.explicit_interface_specifier),
      $.identifier_name,
      optional($.type_parameter_list),
      $.parameter_list,
      repeat($.type_parameter_constraints_clause),
      $._function_body,
    ),

    explicit_interface_specifier: $ => seq($._name, '.'),

    type_parameter_list: $ => seq('<', commaSep1($.identifier_name), '>'),

    type_parameter_constraints_clause: $ => seq(
      'where', $._identifier_or_global, ':', commaSep1($.type_parameter_constraint)
    ),

    type_parameter_constraint: $ => choice(
      $._class_or_struct_constraint,
      $.constructor_constraint,
      $.type_constraint
    ),

    _class_or_struct_constraint: $ => choice(
      'class',
      'struct'
    ),
    
    constructor_constraint: $ => seq('new', '(', ')'),

    type_constraint: $ => $._type,

    operator_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      $._type,
      'operator',
      $._overloadable_operator,
      $.parameter_list,
      $._function_body,
    ),

    _overloadable_operator: $ => choice(
      '!',
      '~',
      '++',
      '--',
      'true',
      'false',
      '+', '-',
      '*', '/',
      '%', '^',
      '|', '&',
      '<<', '>>',
      '==', '!=',
      '>', '<',
      '>=', '<='
    ),

    _base_property_declaration: $ => choice(
      $.event_declaration,
      $.indexer_declaration,
      $.property_declaration
    ),

    event_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      'event',
      $._type,
      optional($.explicit_interface_specifier),
      $.identifier_name,
      choice(
        $._accessor_list,
        ';'
      )
    ),

    _accessor_list: $ => seq(
      '{',
      repeat($.accessor_declaration),
      '}'
    ),

    accessor_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      choice('get', 'set', 'add', 'remove', $.identifier_name),
      $._function_body
    ),

    indexer_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      $._type,
      optional($.explicit_interface_specifier),
      'this',
      $.bracketed_parameter_list,
      choice(
        $._accessor_list,
        seq($.arrow_expression_clause, ';')
      )
    ),

    bracketed_parameter_list: $ => seq('[', commaSep1($.parameter), ']'),

    property_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      optional($.explicit_interface_specifier),
      $._type,
      $.identifier_name,
      choice(
        seq($._accessor_list, optional(seq('=', $._initializer, ';'))), // Roslyn deviation or does not allow bodyless properties.
        seq($.arrow_expression_clause, ';')
      ),
    ),

    _base_type_declaration: $ => choice(
      $.enum_declaration,
      $._type_declaration,
    ),

    enum_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      'enum',
      $.identifier_name,
      optional($.base_list),
      '{',
      commaSep($.enum_member_declaration),
      '}',
      optional(';')
    ),

    base_list: $ => seq(':', commaSep1($._base_type)),
    _base_type: $ => $._type,

    enum_member_declaration: $ => seq(
      repeat($.attribute_list),
      $.identifier_name,
      optional(seq('=', $._expression))
    ),

    _type_declaration: $ => choice(
      $.class_declaration,
      $.interface_declaration,
      $.struct_declaration
    ),

    class_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      'class',
      $.identifier_name,
      optional($.type_parameter_list),
      optional($.base_list),
      repeat($.type_parameter_constraints_clause),
      $.class_body,
      optional(';')
    ),

    class_body: $ => seq(
      '{',
      repeat($._member_declaration),
      '}'
    ),

    interface_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      'interface',
      $.identifier_name,
      optional($.type_parameter_list),
      optional($.base_list),
      repeat($.type_parameter_constraints_clause),
      $.class_body,
      optional(';')
    ),

    struct_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      'struct',
      $.identifier_name,
      optional($.type_parameter_list),
      optional($.base_list),
      repeat($.type_parameter_constraints_clause),
      $.class_body,
      optional(';')
    ),

    delegate_declaration: $ => seq(
      repeat($.attribute_list),
      repeat($.modifier),
      'delegate',
      $.return_type,
      $.identifier_name,
      optional($.type_parameter_list),
      $.parameter_list,
      repeat($.type_parameter_constraints_clause),
      ';'
    ),

    namespace_declaration: $ => seq(
      'namespace',
      $._name,
      '{',
      repeat($.extern_alias_directive),
      repeat($.using_directive),
      repeat($._member_declaration),
      '}',
      optional(';')
    ),

    _type: $ => choice(
      $.array_type,
      $._name,
      $.nullable_type,
      //$.omitted_type_argument, TODO?  Defined as epsilon in grammar.txt :()
      $.pointer_type,
      $.predefined_type,
      // $.ref_type, - conflicts with 'ref' modifier...
      // $.tuple_type - conflicts plus no initializer statement syntax yet for testing
    ),

    omitted_type_argument: $ => seq(),

    array_type: $ => seq($._type, $.array_rank_specifier),

    array_rank_specifier: $ => seq('[', commaSep($._expression), ']'),

    nullable_type: $ => seq($._type, '?'),

    pointer_type: $ => seq($._type, '*'),

    predefined_type: $ => choice(
      'bool',
      'byte',
      'char',
      'decimal',
      'double',
      'float',
      'int',
      'long',
      'object',
      'sbyte',
      'short',
      'string',
      'uint',
      'ulong',
      'ushort',
      // void is handled in return_type for better matching
    ),

    ref_type: $ => seq(
      'ref',
      optional('readonly'),
      $._type
    ),

    tuple_type: $ => seq('(', commaSep1($.tuple_element), ')'),
    tuple_element: $ => seq($._type, optional($.identifier_name)),

    _statement: $ => choice(
      $.block,
      $.break_statement,
      $.checked_statement,
      $.continue_statement,
      $.do_statement,
      $.empty_statement,
      $.expression_statement,
      $.fixed_statement,
      $.for_each_statement,
      $.for_statement,
      $.goto_statement,
      $.if_statement,
      $.labeled_statement,
      $.local_declaration_statement,
      $.local_function_statement,
      $.lock_statement,
      $.return_statement,
      $.switch_statement,
      $.throw_statement,
      $.try_statement,
      $.unsafe_statement,
      $.using_statement,
      $.while_statement,
      $.yield_statement,
    ),

    break_statement: $ => seq('break', ';'),

    checked_statement: $ => seq(choice('checked', 'unchecked'), $.block),

    continue_statement: $ => seq('continue', ';'),

    do_statement: $ => seq('do', $._statement, 'while', '(', $._expression, ')', ';'),

    empty_statement: $ => ';',

    expression_statement: $ => seq($._expression, ';'),

    fixed_statement: $ => seq('fixed', '(', $.variable_declaration, ')', $._statement),

    for_statement: $ => seq(
      'for',
      '(',
      optional(choice($.variable_declaration, commaSep1($._expression))),
      ';',
      optional($._expression),
      ';',
      optional(commaSep1($._expression)),
      ')',
      $._statement
    ),

    // Combines for_each_statement and for_each_variable_statement from Roslyn
    for_each_statement: $ => seq(
      optional('await'),
      'foreach',
      '(',
      choice(
        seq($._type, $.identifier_name), // for_each_statement
        $._expression, // for_each_variable_statement
      ),
      'in',
      $._expression,
      ')',
      $._statement
    ),

    // Roslyn one doesn't seem to make sense so we do this instead
    goto_statement: $ => seq(
      'goto',
      choice(
        alias($.identifier_name, $.label_name),
        seq('case', $._expression),
        'default'
      ),
      ';'
    ),

    if_statement: $ => prec.right(seq(
      'if',
      '(',
      $._expression,
      ')',
      $._statement,
      optional($.else_clause)
    )),

    else_clause: $ => seq('else', $._statement),

    labeled_statement: $ => seq(
      alias($.identifier_name, $.label_name),
      ':',
      $._statement
    ),

    local_declaration_statement: $ => seq(
      optional('await'),
      optional('using'),
      repeat($.modifier),
      $.variable_declaration,
      ';'
    ),

    local_function_statement: $ => seq(
      repeat($.modifier),
      $.return_type,
      $.identifier_name,
      optional($.type_parameter_list),
      $.parameter_list,
      repeat($.type_parameter_constraints_clause),
      $._function_body
    ),

    lock_statement: $ => seq('lock', '(', $._expression, ')', $._statement),

    return_statement: $ => seq('return', optional($._expression), ';'),

    switch_statement: $ => seq(
      'switch',
      '(',
      $._expression,
      ')',
      '{',
      repeat($.switch_section),
      '}'
    ),

    switch_section: $ => seq(repeat1($._switch_label), repeat1($._statement)),

    _switch_label: $ => choice(
      $.case_switch_label, // TODO: Stop pattern_switch+constant_pattern stealing these
      $.case_pattern_switch_label,
      $.default_switch_label
    ),

    case_pattern_switch_label: $ => seq(
      'case',
      $._pattern,
      optional($.when_clause),
      ':'
    ),

    _pattern: $ => choice(
      $.constant_pattern,
      $.declaration_pattern,
      $.discard_pattern,
//      $.recursive_pattern,
      $.var_pattern
    ),

    constant_pattern: $ => $._expression,

    declaration_pattern: $ => seq($._type, $._variable_designation),

    _variable_designation: $ => choice(
      $.discard_designation,
      $.parenthesized_variable_designation,
      $.single_variable_designation
    ),

    discard_designation: $ => '_',

    parenthesized_variable_designation: $ => seq(
      '(',
      commaSep($._variable_designation),
      ')'
    ),

    single_variable_designation: $ => $.identifier_name,

    discard_pattern: $ => '_',

    // TODO: Matches everything as optional... this won't work here.
    recursive_pattern: $ => seq(
      optional($._type),
      optional($.positional_pattern_clause),
      optional($.property_pattern_clause),
      optional($._variable_designation)
    ),

    positional_pattern_clause: $ => seq('(', commaSep($.subpattern), ')'),

    subpattern: $ => seq(
      optional($.name_colon),
      $._pattern
    ),

    property_pattern_clause: $ => seq(
      '{',
      commaSep($.subpattern),
      '}'
    ),

    var_pattern: $ => seq('var', $._variable_designation),

    when_clause: $ => seq('when', $._expression),

    case_switch_label: $ => seq('case', $._expression, ':'),

    default_switch_label: $ => seq('default', ':'),

    throw_statement: $ => seq('throw', optional($._expression), ';'),

    try_statement: $ => seq(
      'try',
      $.block,
      repeat($.catch_clause),
      optional($.finally_clause),
    ),

    catch_clause: $ => seq(
      'catch',
      optional($.catch_declaration),
      optional($.catch_filter_clause),
      $.block
    ),

    catch_declaration: $ => seq('(', $._type, optional($.identifier_name), ')'),

    catch_filter_clause: $ => seq('when', '(', $._expression, ')'),

    finally_clause: $ => seq('finally', $.block),

    unsafe_statement: $ => seq('unsafe', $.block),

    using_statement: $ => seq(
      optional('await'),
      'using',
      '(',
      choice($.variable_declaration, $._expression),
      ')',
      $._statement
    ),

    while_statement: $ => seq('while', '(', $._expression, ')', $._statement),

    yield_statement: $ => seq(
      'yield',
      choice( // Roslyn incorrectly allows break expression...
        seq('return', $._expression),
        'break'
      ),
      ';'
    ),

    _anonymous_function_expression: $=> choice(
      $.anonymous_method_expression,
//      $.lambda_expression   // TODO: Causes conflicts
    ),

    anonymous_method_expression: $ => seq(
      optional('async'),
      'delegate',
      optional($.parameter_list),
      $.block,
      optional($._expression)
    ),

    lambda_expression: $ => choice(
      $._parenthesized_lambda_expression,
      $._simple_lambda_expression
    ),

    _parenthesized_lambda_expression: $ => seq(
      optional('async'),
      $.parameter_list,
      '=>',
      choice($.block, $._expression)
    ),

    _simple_lambda_expression: $ => seq(
      optional('async'),
      $.parameter,
      '=>',
      choice($.block, $._expression)
    ),

    anonymous_object_creation_expression: $ => seq(
      'new',
      '{',
      commaSep($._anonymous_object_member_declarator),
      '}'
    ),

    _anonymous_object_member_declarator: $ => seq(
      optional($.name_equals), // TODO: This doesn't match, becomes assignment_expression via below
      $._expression
    ),

    array_creation_expression: $ => seq(
      'new',
      $.array_type,
      optional($._initializer_expression)
    ),

    _initializer_expression: $ => seq(
      '{',
      commaSep($._expression),
      '}'
    ),

    assignment_expression: $ => prec.right(seq(
      $._expression,
      $.assignment_operator,
      $._expression
    )),

    assignment_operator: $ => choice('=', '+=', '-=', '*=', '/=', '%=', '&=', '^=', '|=', '<<=', '>>=', '??='),

    await_expression: $ => prec.right(PREC.SEQ, seq('await', $._expression)),

    cast_expression: $ => seq(
      ')',
      $._type,
      ')',
      $._expression
    ),

    checked_expression: $ => choice(
      seq('checked', '(', $._expression, ')'),
      seq('unchecked', '(', $._expression, ')')
    ),

    conditional_access_expression: $ => seq(
      $._expression,
      '?',
      $._expression
    ),

    conditional_expression: $ => prec.right(PREC.COND, seq(
      $._expression, '?', $._expression, ':', $._expression
    )),

    declaration_expression: $ => seq(
      $._type,
      $._variable_designation
    ),

    default_expression: $ => seq(
      'default',
      '(',
      $._type,
      ')'
    ),

    element_access_expression: $ => seq($._expression, $.bracketed_argument_list),

    // TODO: Add test coverage for this.
    element_binding_expression: $ => $.bracketed_argument_list,

    implicit_array_creation_expression: $ => seq(
      'new',
      '[',
      repeat('*'),
      ']',
      $._initializer_expression
    ),

    implicit_element_access: $ => $.bracketed_argument_list,

    implicit_stack_alloc_array_creation_expression: $ => seq(
      'stackalloc',
      '[',
      ']',
      $._initializer_expression
    ),

    _instance_expression: $ => choice(
      $.base_expression,
      $.this_expression,
    ),

    base_expression: $ => 'base',
    this_expression: $ => 'this',

    invocation_expression: $ => seq(
      $._expression,
      $.argument_list
    ),

    is_pattern_expression: $ => seq(
      $._expression,
      'is',
      $._pattern
    ),

    _literal_expression: $ => choice(
      '__arglist',
//      'default',  // TODO: Causes conflict with switch sections
      $.null_literal,
      $.boolean_literal,
      $.character_literal,
      // We don't bunch real and integer literals together
      $.real_literal,
      $.integer_literal,
      // Or strings and verbatim strings
      $.string_literal,
      $.verbatim_string_literal
    ),

    make_ref_expression: $ => seq(
      '__makeref',
      '(',
      $._expression,
      ')'
    ),

    member_access_expression: $ => seq(
      $._expression,
      choice(',', '->'),
      $._simple_name
    ),

    member_binding_expression: $ => seq(
      '.',
      $._simple_name,
    ),

    object_creation_expression: $ => seq(
      'new',
      $._type,
      $.argument_list
    ),

    omitted_array_size_expression: $ => seq(
      // TODO: Deal with this, grammar.txt says "epsilon"
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    postfix_unary_expression: $ => prec.left(PREC.POSTFIX, choice(
      seq($._expression, '++'),
      seq($._expression, '--'),
      seq($._expression, '!')
    )),

    prefix_unary_expression: $ => prec.right(PREC.UNARY, choice(
      ...[
        '!',
        '&',
        '*',
        '+',
        '++',
        '-',
        '--',
        '^',
        '~'
      ].map(operator => seq(operator, $._expression)))),

    // TODO: Lots of conflicts
    query_expression: $ => seq($.from_clause, $._query_body),

    from_clause: $ => seq(
      'from',
      optional($._type),
      $.identifier_name,
      'in',
      $._expression
    ),

    _query_body: $ => seq(
      repeat1($.query_clause),
      $._select_or_group_clause,
      optional($.query_continuation)
    ),

    query_clause: $ => seq(
      $.from_clause,
      $.join_clause,
      $.let_clause,
      $.order_by_clause,
      $.where_clause
    ),

    join_clause: $ => seq(
      'join',
      optional($._type),
      $.identifier_name,
      'in',
      $._expression,
      'on',
      $._expression,
      'equals',
      $._expression,
      optional($.join_into_clause)
    ),

    join_into_clause: $ => seq('into', $.identifier_name),

    let_clause: $ => seq(
      'let',
      $.identifier_name,
      '=',
      $._expression
    ),

    order_by_clause: $ => seq(
      'orderby',
      commaSep1($.ordering)
    ),

    ordering: $ => seq(
      $._expression,
      optional(choice('ascending', 'descending'))
    ),

    where_clause: $ => seq('where', $._expression),

    _select_or_group_clause: $ => choice(
      $.group_clause,
      $.select_clause
    ),

    group_clause: $ => seq(
      'group',
      $._expression,
      'by',
      $._expression
    ),

    select_clause: $ => seq('select', $._expression),

    query_continuation: $ => seq('into', $.identifier_name, $._query_body),

    // TODO: Conflicts
    range_expression: $ => seq(
      optional($._expression),
      '..',
      optional($._expression)
    ),

    // TODO: Conflicts with modifier
    ref_expression: $ => seq('ref', $._expression),

    ref_type_expression: $ => seq(
      '__reftype',
      '(',
      $._expression,
      ')'
    ),

    ref_value_expression: $ => seq(
      '__refvalue',
      '(',
      $._expression,
      ',',
      $._type,
      ')'
    ),

    size_of_expression: $ => seq(
      'sizeof',
      '(',
      $._type,
      ')'
    ),

    stack_alloc_array_creation_expression: $ => seq(
      'stackalloc',
      $._type,
      optional($._initializer_expression)
    ),

    switch_expression: $ => seq(
      $._expression,
      'switch',
      '{',
      commaSep($.switch_expression_arm),
      '}',
    ),

    switch_expression_arm: $ => seq(
      $._pattern,
      optional($.when_clause),
      '=>',
      $._expression
    ),

    // TODO: Conflicts with many rules
    throw_expression: $ => seq('throw', $._expression),

    // TODO: Conflicts with parenthesized
    tuple_expression: $ => seq(
      '(',
      commaSep1($.argument),
      ')'
    ),

    type_of_expression: $ => seq('typeof', '(', $._type, ')'),

    // TODO: Expressions need work on precedence and conflicts. 

    _expression: $ => choice(
      $._anonymous_function_expression,
      $.anonymous_object_creation_expression,
      // $.array_creation_expression,
      $.assignment_expression,
      $.await_expression,
      $.binary_expression,
      // $.cast_expression
      $.checked_expression,
      // $.conditional_access_expression,
      $.conditional_expression,
      // $.declaration_expression,
      // $.default_expression,
      $.element_access_expression,
      $.element_binding_expression,
      $.implicit_array_creation_expression,
      // $.implicit_element_access,
      $.implicit_stack_alloc_array_creation_expression,
      // $._initializer_expression,
      $._instance_expression,
      // $.interpolated_string_expression,
      $.invocation_expression,
      //$.is_pattern_expression,
      $._literal_expression,
      $.make_ref_expression,
      // $.member_access_expression,
      $.member_binding_expression,
      $.object_creation_expression,
      // $.omitted_array_size_expression,
      $.parenthesized_expression,
      $.postfix_unary_expression,
      $.prefix_unary_expression,
      // $.query_expression,
      // $.range_expression,
      // $.ref_expression,
      $.ref_type_expression,
      $.ref_value_expression,
      $.size_of_expression,
      // $.stack_alloc_array_creation_expression,
      $.switch_expression,
      // $.throw_expression,
      // $.tuple_expression,
      // $.type,
      $.type_of_expression,

      // These should be removed when the ones above get activated
      $.identifier_name,
      $.qualified_name,
    ),

    _initializer: $ => choice(
      $._expression,
      $.array_initalizer
    ),

    array_initalizer: $ => seq('{', commaSep1($._initializer), '}'),

    binary_expression: $ => choice(
      ...[
        ['&&', PREC.LOGAND],
        ['||', PREC.LOGOR],
        ['>>', PREC.SHIFT],
        ['<<', PREC.SHIFT],
        ['&', PREC.AND],
        ['^', PREC.OR],
        ['|', PREC.OR],
        ['+', PREC.ADD],
        ['-', PREC.ADD],
        ['*', PREC.MULT],
        ['/', PREC.MULT],
        ['%', PREC.MULT],
        ['<', PREC.REL],
        ['<=', PREC.REL],
        ['==', PREC.EQUAL],
        ['!=', PREC.EQUAL],
        ['>=', PREC.REL],
        ['>', PREC.REL],
        ['??', PREC.EQUAL],
        ['is', PREC.EQUAL],
        ['as', PREC.EQUAL],
      ].map(([operator, precedence]) =>
        prec.left(precedence, seq($._expression, operator, $._expression))
      )
    ),

    // literals - grammar.txt is useless here as it just refs to lexical specification

    boolean_literal: $ => choice(
      'true',
      'false'
    ),

    character_literal: $ => seq(
      "'",
      choice(/[^'\\]/, $.escape_sequence),
      "'"
    ),

    escape_sequence: $ => token(choice(
      /\\x[0-9a-fA-F][0-9a-fA-F]?[0-9a-fA-F]?[0-9a-fA-F]?/,
      /\\u[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]/,
      /\\U[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]/,
      /\\[^xuU]/,
    )),

    integer_literal: $ => seq(
      choice(
        (/[0-9]+/),
        (/0x[0-9a-fA-F]+/)
      ),
      optional($._integer_type_suffix)
    ),

    _integer_type_suffix: $ => (/u|U|l|L|ul|UL|uL|Ul|lu|LU|Lu|lU/),

    null_literal: $ => 'null',

    real_literal: $ => {
      const suffix = /[fFdDmM]/;
      const exponent = /[eE][+-]?[0-9]+/;
      return token(choice(
        seq(
          (/[0-9]+/),
          '.',
          (/[0-9]+/),
          optional(exponent),
          optional(suffix)
        ),
        seq(
          '.',
          (/[0-9]+/),
          optional(exponent),
          optional(suffix)
        ),
        seq(
          (/[0-9]+/),
          exponent,
          optional(suffix)
        ),
        seq(
          (/[0-9]+/),
          suffix
        )
      ))
    },

    string_literal: $ => seq(
      '"',
      repeat(choice(
        /[^"\\\n]+/,
        $.escape_sequence
      )),
      '"'
    ),

    verbatim_string_literal: $ => seq(
      '@"',
      /[^"]*/,
      '"'
    ),

    // Commments

    comment: $ => token(choice(
      seq('//', /.*/),
      seq(
        '/*',
        repeat(choice(
          /[^*]/,
          /\*[^/]/
        )),
        '*/'
      )
    )),

    // Custom non-Roslyn additions beyond this point that will not sync up with grammar.txt

    // We use this instead of type so 'void' is only treated as type in the right contexts
    return_type: $ => choice($._type, $.void_keyword),
    void_keyword: $ => 'void',

    // We could line this up with grammar.txt *_trivia at some point.
    // Will need to understand how structured_trivia is implemented.
    preprocessor_directive: $ => token(
      seq(
        // TODO: Only match start of line ignoring whitespace
        '#',
        choice(
          'if',
          'else',
          'elif',
          'endif',
          'define',
          'undef',
          'warning',
          'error',
          'line',
          'region',
          'endregion',
          'pragma warning',
          'pragma checksum',
        ),
        /.*/
      )
    )
  }
})

function commaSep(rule) {
  return optional(commaSep1(rule))
}

function commaSep1(rule) {
  return seq(
    rule,
    repeat(seq(
      ',',
      rule
    ))
  )
}
