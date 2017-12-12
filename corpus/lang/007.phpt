==========
Function call with global and static variables
==========

<?php
error_reporting(0);
$a = 10;

function Test()
{
	static $a=1;
	global $b;
	$c = 1;
	$b = 5;
	echo "$a $b ";
	$a++;
	$c++;
	echo "$a $c ";
}

Test();
echo "$a $b $c ";
Test();
echo "$a $b $c ";
Test();
?>

---

(program (script_section (expression_statement (function_call_expression (qualified_name (name)) (arguments (float)))) (expression_statement (assignment_expression (simple_variable (variable_name (name))) (integer))) (function_definition (name) (compound_statement (function_static_declaration (static_variable_declaration (variable_name (name)) (float))) (global_declaration (simple_variable (variable_name (name)))) (expression_statement (assignment_expression (simple_variable (variable_name (name))) (float))) (expression_statement (assignment_expression (simple_variable (variable_name (name))) (float))) (echo_statement (string)) (expression_statement (postfix_increment_expression (simple_variable (variable_name (name))))) (expression_statement (postfix_increment_expression (simple_variable (variable_name (name))))) (echo_statement (string)))) (expression_statement (function_call_expression (qualified_name (name)) (arguments))) (echo_statement (string)) (expression_statement (function_call_expression (qualified_name (name)) (arguments))) (echo_statement (string)) (expression_statement (function_call_expression (qualified_name (name)) (arguments)))))
