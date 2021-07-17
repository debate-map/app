//import {makeExtendSchemaPlugin, gql} from "graphile-utils";
import graphileUtils from "graphile-utils";
import {PoolClient} from "pg";
import {Context as Context_base} from "postgraphile";
import {Command, GetCommandClassMetadatas, WithBrackets} from "web-vcore/nm/mobx-graphlink.js";
const {makeExtendSchemaPlugin, gql} = graphileUtils;

type Context = Context_base<any> & {
	pgClient: PoolClient;
};

function GQL_BetterErrorHandling(str: string) {
	try {
		return gql`${str}`;
	} catch (ex) {
		console.log("GQL error hit for str:", str);
		throw ex;
	}
}

export const CommandsPlugin = makeExtendSchemaPlugin(build=>{
	const commandClassMetas = GetCommandClassMetadatas();

	const allNewTypeDefs_strings = [] as string[];
	for (const meta of commandClassMetas) {
		// type-defs (used by mutation-resolver type)
		for (const typeDef of meta.payload_typeDefs) {
			allNewTypeDefs_strings.push(typeDef.str);
		}
		for (const typeDef of meta.return_typeDefs) {
			allNewTypeDefs_strings.push(typeDef.str);
		}

		const returnGQLTypeName = meta.FindGQLTypeName({group: "return", typeName: `${meta.commandClass.name}_ReturnData`})!;

		// output example: "UpdateTerm(id: ID!, updates: UpdateTermT0UpdatesT0): UpdateTerm_ReturnT0"
		allNewTypeDefs_strings.push(`
extend type Mutation {
	${meta.commandClass.name}${WithBrackets(meta.Args_GetArgDefsStr())}: ${returnGQLTypeName}
}
		`);
	}

	const mutationResolvers = commandClassMetas.ToMapObj(meta=>meta.commandClass.name, classInfo=>{
		return async(parent, args, context: Context, info)=>{
			/*const { rows } = await context.pgClient.query(
				sqlText, // e.g. "select * from users where id = $1"
				optionalVariables // e.g. [27]
			);*/

			//context.pgClient.query()

			const CommandClass = classInfo.commandClass as any;
			const command: Command<any> = new CommandClass(args);
			command._userInfo_override = context.req.user;
			console.log("User in command resolver:", context.req.user);
			debugger;
			const returnData = await command.RunLocally();
			console.log(`Command "${CommandClass.name}" done! @args:`, args, `@returnData:`, returnData);

			return returnData;
		};
	});

	const allNewTypeDefs = allNewTypeDefs_strings.map(str=>{
		// if type-def string is empty, add a placeholder field (to avoid graphql error)
		if (!str.includes("{")) {
			str += " { _: Boolean }";
		}
		return GQL_BetterErrorHandling(str);
	});
	//console.log("CommandsPlugin init done. @typeDefs:\n==========\n", allNewTypeDefs_strings.join("\n\n"), "\n==========\n@mutationResolvers:", mutationResolvers);
	return {
		typeDefs: allNewTypeDefs,
		resolvers: {
			Mutation: mutationResolvers,
		},
	};
});