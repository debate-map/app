//import {makeExtendSchemaPlugin, gql} from "graphile-utils";
import graphileUtils from "graphile-utils";
const {makeExtendSchemaPlugin, gql} = graphileUtils;

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
				authenticate: async()=>{
					// todo
					return {id: "tbd"};
				},
				test1: ()=>{
					return "test1";
				},
			},
		},
	};
});