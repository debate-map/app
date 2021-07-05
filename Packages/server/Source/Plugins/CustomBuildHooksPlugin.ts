import {makeWrapResolversPlugin, SchemaBuilder} from "postgraphile";

// note: this plugin must be the first in the list (or earlier than most anyway), for the number-type fix
export const CustomBuildHooksPlugin = function PgNumericToFloatPlugin(builder: SchemaBuilder) {
	builder.hook("build", build=>{
		// Register a type handler for BIGINT (oid = 20), always returning the GraphQLFloat type
		build.pgRegisterGqlTypeByTypeId(
			"20", // id for "bigInt" type (as seen here: https://github.com/graphile/pg-aggregates/blob/main/src/AggregateSpecsPlugin.ts)
			()=>build.graphql.GraphQLFloat,
		);
		return build;
	});
};