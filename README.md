# cede
The Practical Operating Substrate for Apps

**cede** is a lightweight state kernel for modern JavaScript applications.

Please note that while we convert Object/Array to Obj/Arr that is not the case with primitives.
Str/Num cannot exist due to the way JavaScript performs assignment.
Therefore, all primitive values stored in the tree are and instance of Signal.
Read more about this feature (not really a bug) at https://github.com/catpea/supernatural
