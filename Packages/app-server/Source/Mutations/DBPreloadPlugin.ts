//import {makeExtendSchemaPlugin, gql} from "graphile-utils";
import graphileUtils from "graphile-utils";
import {PoolClient} from "pg";
import {Context as Context_base} from "postgraphile";
import {Assert} from "web-vcore/nm/js-vextensions";
import express, {Request, Response} from "express";

import {createRequire} from "module";
const {makeExtendSchemaPlugin, gql} = graphileUtils;
const require = createRequire(import.meta.url);

type Context = Context_base<any> & {
	pgClient: PoolClient;
	req: Request;
	res: Response;
	//user: User|n;
};

export class PreloadRequest {
	forMap?: PreloadRequest_ForMap;
}
export class PreloadRequest_ForMap {
	mapID: string;
	depth: number;
}

export class PreloadResult {
	data: any;
	error: any;
}

export const DBPreloadPlugin = makeExtendSchemaPlugin(build=>{
	return {
		typeDefs: gql`
			type GetPreloadData_Return {
				TODO
			}
			extend type Query {
				GetPreloadData(TODO): GetPreloadData_Return
			}
		`,
		resolvers: {
			Query: {
				GetPreloadData: async(parent, args: {preloads: PreloadRequest[]}, ctx: Context, info)=>{
					const {preloads} = args;
					Assert(Array.isArray(preloads));
					const preloadResults = [] as PreloadResult[];
					for (const preload of preloads) {
						let result;
						if (preload.forMap != null) {
							// todo
						}
						preloadResults.push(result);
					}
					return {preloadResults};
				},
			},
		},
	};
});