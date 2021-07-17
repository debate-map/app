//import {makeExtendSchemaPlugin, gql} from "graphile-utils";
import graphileUtils from "graphile-utils";
import {PoolClient} from "pg";
import {Context as Context_base} from "postgraphile";
import {Command, commandClasses, ConstructGQLArgsStr, ConstructGQLArgTypesStr} from "web-vcore/nm/mobx-graphlink";
import {getGraphqlSchemaFromJsonSchema} from "get-graphql-from-jsonschema";
import {Assert} from "web-vcore/nm/js-vextensions";
import {JSONSchema7, JSONSchema7Definition} from "get-graphql-from-jsonschema/node_modules/@types/json-schema";
import {DocumentNode} from "web-vcore/nm/@apollo/client";
const {makeExtendSchemaPlugin, gql} = graphileUtils;

type Context = Context_base<any> & {
	pgClient: PoolClient;
};

function FinalizeSchemaForClassInfos(schema: JSONSchema7) {
	// make sure "type" is specified
	if (schema.type == null) {
		if (schema.$ref == "UUID") schema.type = "string";
		else schema.type = "object";
	}
	// make sure type does not contain "null" as an option
	if (schema.type instanceof Array && schema.type.includes("null")) {
		schema.type = schema.type.Except("null");
	}

	// if type:array, make sure "items" is specified
	if (schema.type == "array" && schema.items == null) {
		schema.items = FinalizeSchemaForClassInfos({});
	}

	// if type:object, make sure "properties" is specified
	if (schema.type == "object" && schema.properties == null) {
		schema.properties = {};
	}

	// apply the same fixes for sub-schemas
	for (const [propName, propSchema] of Object.entries(schema.properties ?? {})) {
		if (typeof propSchema == "object") {
			FinalizeSchemaForClassInfos(propSchema);
		}
	}

	return schema;
}

function GetCommandClassInfos(classes: (typeof Command)[]) {
	return classes.map(commandClass=>{
		const payloadInfo = FinalizeSchemaForClassInfos(commandClass._payloadInfoGetter?.() ?? {});
		const returnInfo = FinalizeSchemaForClassInfos(commandClass._returnInfoGetter?.() ?? {});
		console.log("CommandClass:", commandClass.name, "@payloadInfo:", JSON.stringify(payloadInfo, null, 2), "@returnInfo:", JSON.stringify(returnInfo, null, 2));

		/*const argsObj = {};
		for (const [propName, propSchema] of Object.entries(payloadInfo.properties ?? {}) as [string, Object][]) {
			const required = payloadInfo.required?.includes(propName) ?? false;
			let gqlType = JSONSchemaFieldInfoToGQLTypeName(propSchema, required);
			if (gqlType == null) {
				if ()
			}
			argsObj[propName] = 
		}*/

		const {typeName: payload_typeName, typeDefinitions: payload_typeDefs} = getGraphqlSchemaFromJsonSchema({
			rootName: commandClass.name,
			schema: payloadInfo as any,
			direction: "input",
		});

		const {typeName: return_typeName, typeDefinitions: return_typeDefs} = getGraphqlSchemaFromJsonSchema({
			rootName: `${commandClass.name}_ReturnData`,
			schema: returnInfo as any,
		});

		function AugmentTypeDefs(typeDefs: string[]) {
			return typeDefs.map(typeDef=>{
				//const typeName = typeDef.match(/type (.+?) {/)?.[1];
				//const typeName = typeDef.match(/type (.+?)( |$)/)?.[1];
				const typeName = typeDef.match(/(type|input) (.+?)( |$)/)?.[2];
				Assert(typeName, `Could not find type-name in type-def: ${typeDef}`);
				return {name: typeName, str: typeDef};
			});
		}
		return {
			commandClass, payloadInfo, returnInfo,
			payload_typeName, payload_typeDefs: AugmentTypeDefs(payload_typeDefs),
			return_typeName, return_typeDefs: AugmentTypeDefs(return_typeDefs),
		};
	});
}

function GQL_BetterErrorHandling(str: string) {
	try {
		return gql`${str}`;
	} catch (ex) {
		console.log("GQL error hit for str:", str);
		throw ex;
	}
}

// todo: probably delete this for now (may make GraphQL auth system someday, but for now passportjs works fine)
export const CommandsPlugin = makeExtendSchemaPlugin(build=>{
	const commandClassInfos = GetCommandClassInfos(commandClasses);

	const allNewTypeDefs_strings = [] as string[];
	for (const info of commandClassInfos) {
		// type-defs (used by mutation-resolver type)
		for (const typeDef of info.payload_typeDefs) {
			allNewTypeDefs_strings.push(typeDef.str);
		}
		for (const typeDef of info.return_typeDefs) {
			allNewTypeDefs_strings.push(typeDef.str);
		}

		// eslint-disable-next-line no-loop-func
		function FindGQLTypeName(opts: {group: "payload" | "return", typeName?: string, propName?: string}) {
			if (opts.propName) {
				const groupInfo = opts.group == "payload" ? info.payloadInfo : info.returnInfo;
				const fieldJSONSchema = groupInfo.properties?.[opts.propName] as JSONSchema7;
				if (fieldJSONSchema?.type == "string") return "String";
				if (fieldJSONSchema?.type == "number") return "Float";
				if (fieldJSONSchema?.type == "boolean") return "Boolean";
			}

			const typeName_normalized = opts.typeName
				? opts.typeName.toLowerCase() // UpdateTerm_Return -> updateterm_return
				: `${info.commandClass.name}.${opts.propName}`.toLowerCase(); // id -> updateterm.id
			const typeDefs = opts.group == "payload" ? info.payload_typeDefs : info.return_typeDefs;
			const typeDefNames_normalized = typeDefs.map(typeDef=>{
				return typeDef.name?.replace(/(T0)+/g, ".").toLowerCase().slice(0, -1); // UpdateTermT0UpdatesT0 -> updateterm.updates
			});
			const result = typeDefs[typeDefNames_normalized.findIndex(a=>a == typeName_normalized)];
			Assert(result, `Could not find type-def for type/prop name "${opts.typeName ?? opts.propName}". @typeName_normalized:${typeName_normalized} @typeDefNames_normalized:${typeDefNames_normalized.join(",")}`);
			return result.name;
		}

		const argGQLTypeNames = {};
		for (const propName of Object.keys(info.payloadInfo.properties ?? {})) {
			argGQLTypeNames[propName] = FindGQLTypeName({group: "payload", propName});
		}
		const returnGQLTypeName = FindGQLTypeName({group: "return", typeName: `${info.commandClass.name}_ReturnData`})!;
		Assert(returnGQLTypeName, "Could not find");

		// output example: "UpdateTerm(id: ID!, updates: UpdateTermT0UpdatesT0): UpdateTerm_ReturnT0"
		allNewTypeDefs_strings.push(`
extend type Mutation {
	${info.commandClass.name}${ConstructGQLArgTypesStr(argGQLTypeNames)}: ${returnGQLTypeName}
}
		`);
	}

	const mutationResolvers = commandClassInfos.ToMapObj(classInfo=>classInfo.commandClass.name, classInfo=>{
		return async(parent, args, ctx: Context, info)=>{
			/*const { rows } = await ctx.pgClient.query(
				sqlText, // e.g. "select * from users where id = $1"
				optionalVariables // e.g. [27]
			);*/

			//ctx.pgClient.query()

			const CommandClass = classInfo.commandClass as any;
			const command = new CommandClass(args);
			const returnData = await command.Run();
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
	console.log("CommandsPlugin init done. @typeDefs:\n==========\n", allNewTypeDefs_strings.join("\n\n"), "\n==========\n@mutationResolvers:", mutationResolvers);
	return {
		typeDefs: allNewTypeDefs,
		resolvers: {
			Mutation: mutationResolvers,
		},
	};
});