//import {makeExtendSchemaPlugin, gql} from "graphile-utils";
import {Request, Response} from "express";
import graphileUtils from "graphile-utils";
import {PoolClient} from "pg";
import {Context as Context_base} from "postgraphile";
const {makeExtendSchemaPlugin, gql} = graphileUtils;

type Context = Context_base<any> & {
	pgClient: PoolClient;
	req: Request;
	res: Response;
	//user: User|n;
};

export const OtherResolversPlugin = makeExtendSchemaPlugin(build=>{
	return {
		typeDefs: gql`
		`,
		resolvers: {
		},
	};
});