//import {makeExtendSchemaPlugin, gql} from "graphile-utils";
import graphileUtils from "graphile-utils";
import {PoolClient} from "pg";
import {Context as Context_base} from "postgraphile";
const {makeExtendSchemaPlugin, gql} = graphileUtils;

type Context = Context_base<any> & {
	pgClient: PoolClient;
};

export const AuthenticationPlugin = makeExtendSchemaPlugin(build=>{
	return {
		typeDefs: gql`
		type authenticate_return {
			id: String
			# TODO
		}
		
		extend type Mutation {
			authenticate: authenticate_return
			test1: String
		}
		`,
		resolvers: {
			Mutation: {
				authenticate: async(parent, args, ctx: Context, info)=>{
					const { rows } = await ctx.pgClient.query(
						sqlText, // e.g. "select * from users where id = $1"
						optionalVariables // e.g. [27]
					 );
					return {id: "tbd"};
				},
				test1: ((parent, args, ctx: Context, info)=>{
					return "test1";
				}),
			},
		},
	};
});