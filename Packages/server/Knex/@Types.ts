// typescript with commonjs is a bit weird; by defining these types here, they are shared with all other modules in Knex folder
type Knex = import("knex").Knex;
type Knex_Transaction = import("knex").Knex.Transaction;
type Knex_ColumnBuilder = import("knex").Knex.ColumnBuilder;