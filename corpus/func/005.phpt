==========
Testing register_shutdown_function()
==========

<?php

function foo()
{
	print "foo";
}

register_shutdown_function("foo");

print "foo() will be called on shutdown...\n";

?>

---

(program (function_definition (name) (formal_parameters) (compound_statement (expression_statement (print_intrinsic (string))))) (expression_statement (function_call_expression (qualified_name (name)) (arguments (string)))) (expression_statement (print_intrinsic (string))))
