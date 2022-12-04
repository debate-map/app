import {GetUser, systemUserID} from "dm_common";
import {Assert, FancyFormat} from "web-vcore/nm/js-vextensions.js";
import {CreateCommandsPlugin, DBUpdate, GetAsync} from "web-vcore/nm/mobx-graphlink.js";
import {SetServerWS_CurrentCommandUser} from "../Main.js";

export function CreateCommandsPlugin_Main() {
	return CreateCommandsPlugin({
		schemaDeps_auto: true,
		// till we find way to auto-avoid conflicts with pgl introspection types, use this // commented; not needed anymore, since "get-graphql-from-jsonschema" adds "T0" to end of type-names
		//schemaDeps_auto_exclude: mglClasses.filter(a=>a["_table"] != null).map(a=>a.name),
		//schemaDeps_auto_exclude: ["MapView", "MapNodeView"], // exclude classes we know aren't needed for the graphql api, and which cause warnings (eg. "$ref" cycles)
		//schemaDeps: ["MapNode_Partial", "MapNodeRevision_Partial"],
		/*typeDefFinalizer: typeDef=>{
			function CleanUpGraphQLTypeName(name: string) {
				if (name.includes("T0")) name = name.replace(/T0/g, ".").replace(/\.$/, "");
				return name;
			}
			typeDef.name = CleanUpGraphQLTypeName(typeDef.name);
			typeDef.str = typeDef.str.replace(/(\W)(.*?T0.*?)(\W)/g, (str, g1, typeName, g3)=>{
				return `${g1}${CleanUpGraphQLTypeName(typeName)}${g3}`;
			});
			return typeDef;
		},*/
		typeDefStrFinalizer: str=>{
			const replacements = {
				//Uuid: "UUID",
				// replace refs to scalar json-schemas, with just their scalar type (no graphql types are created for these, since graphql can't represent them as a separate type)
				// commented; now automated within mobx-graphlink (in FindGQLTypeName())
				//UUIDT0: "String",
			};

			// undo the underscore-removing that jsonschema2graphql does
			/*for (const key of schemaEntryJSONs.keys()) {
				if (key.includes("_")) {
					replacements[key.replace(/_/g, "")] = key;
				}
			}*/

			for (const [from, to] of Object.entries(replacements)) {
				//str = str.replace(new RegExp(from, "g"), to);
				str = str.replace(new RegExp(`(^|[^a-zA-Z0-9_])(${from})([^a-zA-Z0-9_]|$)`, "g"), (matchStr, g1, typeName, g3)=>{
					return `${g1}${to}${g3}`;
				});
			}

			return str;
		},
		//logTypeDefs: true,
		//logTypeDefs_detailed: ["PermissionSet"],

		preCommandRun: async info=>{
			const req = info.context.req;
			// if request has no user authenticated, but this request is from an internal pod (as proven by SecretForRunAsSystem header), treat it as being authed as the system-user (temp)
			const secretForRunAsSystem = req.headers["SecretForRunAsSystem".toLowerCase()]; // header-names are normalized to lowercase by postgraphile apparently
			if (req.user == null && process.env.DB_PASSWORD != null && secretForRunAsSystem == process.env.DB_PASSWORD) {
				const systemUser = await GetAsync(()=>GetUser(systemUserID));
				info.context.req = {...req, user: systemUser} as any;
				// we must also update this field afterward (since it's derivative)
				info.command._userInfo_override = systemUser;
			}

			//console.log("User in command resolver:", info.context.req.user?.id);
			Assert(info.context.req.user != null, "Cannot run command on server unless logged in.");
			console.log(`Preparing to run command "${info.command.constructor.name}". @args:`, info.args, "@userID:", info.context.req.user.id);
			SetServerWS_CurrentCommandUser(info.context.req.user);
		},
		postCommandRun: async info=>{
			if (info.error) {
				const commandInfoStr_deep = FancyFormat({toJSON_opts: {
					trimDuplicates: true,
					entryReplacer_post: (key, value)=>{
						//if (typeof value == "object" && value?.options?.graph) {
						if (key == "options" && value?.graph) {
							return {$omit: true};
						}
					},
				}}, info.command);
				console.error(`Command "${info.command.constructor.name}" errored!`,
					`\n@Command:`, commandInfoStr_deep, // NodeJS logging doesn't show deep enough
					`\n@DBUpdates:\n${(info["dbUpdates"] as DBUpdate[] ?? []).map(a=>`\t${a.path} -> set to -> ${JSON.stringify(a.value)}`).join("\n") || "none (eg. error during Validate function)"}`,
					`\n@error:`, info.error);
			} else {
				console.log(`Command "${info.command.constructor.name}" done! @returnData:`, info.returnData);
			}
			SetServerWS_CurrentCommandUser(null);
		},
	});
}