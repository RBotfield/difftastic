==========
Testing function parameter passing
==========

<?php
function test ($a,$b) {
	echo $a+$b;
}
test(1,2);
?>

---

(program (function_definition (name) (formal_parameters (simple_parameter (variable_name (name))) (simple_parameter (variable_name (name)))) (compound_statement (echo_statement (binary_expression (variable_name (name)) (variable_name (name)))))) (expression_statement (function_call_expression (qualified_name (name)) (arguments (integer) (integer)))))
