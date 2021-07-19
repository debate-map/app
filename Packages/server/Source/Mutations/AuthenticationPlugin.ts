//import {makeExtendSchemaPlugin, gql} from "graphile-utils";
import {User} from "dm_common";
import graphileUtils from "graphile-utils";
import {PoolClient} from "pg";
import {Context as Context_base} from "postgraphile";
import {Assert} from "web-vcore/nm/js-vextensions";
import express, {Request, Response} from "express";
import {GenerateUUID, UserInfo} from "web-vcore/nm/mobx-graphlink";
const {makeExtendSchemaPlugin, gql} = graphileUtils;

type Context = Context_base<any> & {
	pgClient: PoolClient;
	req: Request;
	res: Response;
	//user: User|n;
};

/*export const AuthenticationPlugin = makeExtendSchemaPlugin(build=>{
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
					/*const { rows } = await ctx.pgClient.query(
						sqlText, // e.g. "select * from users where id = $1"
						optionalVariables // e.g. [27]
					);*#/

					//ctx.pgClient.query()

					return {id: "tbd"};
				},
				test1: ((parent, args, ctx: Context, info)=>{
					return "test1";
				}),
			},
		},
	};
});*/

// auth extras plugin
// ==========

// probably todo: replace this system with a system that just reads the auth-cookies from the websocket connection headers (ie. req.headers["debate-map-session"])

export const connectionIDs_usedUp = new Set<string>();
export const connectionID_attachInfo = new Map<string, {ipAddress: string, userInfo: User|undefined}>();

/**
Used for associating the client's user-info with their websocket-connection.

The approach used is as follows: (see here for discussion: https://github.com/vuejs/vue-apollo/issues/144#issuecomment-882103646)
1) When frontend loads, it sends an http request to the server, calling getConnectionID; because it's an http-request, the http-only auth-token cookie gets included.
2) The server generates a random UUID for the current connection (ie. "connection id"), associates it with the user-data it read/verified from the http-only cookie, and sends the connection-id to the frontend.
3) The frontend sends its connection-id back to the server, calling passConnectionID, except this time over the persistent websocket connection.
4) The server checks for a matching connection-id; if found, checks if ip-address of getConnectionID caller matches current caller.
5) If the ip-addresses match, the user-id associated with the connection-id is now associated with the websocket connection as well; server then marks connection-id as "used up", preventing additional "redemption attempts".
6) Now for all future GraphQL requests over the websocket connection, the server knows what user-data is associated with it.

Ideas for making it even safer:
* Only accept usage/association-with-websocket-connection/"redemption" of a connection-id within a few seconds of its generation.
*/
export const AuthExtrasPlugin = makeExtendSchemaPlugin(build=>{
	return {
		typeDefs: gql`
			type _GetConnectionID_Return {
				id: String
			}
			extend type Mutation {
				_GetConnectionID: _GetConnectionID_Return
			}

			type _PassConnectionID_Return {
				userID: String
			}
			extend type Query {
				_PassConnectionID(connectionID: String): _PassConnectionID_Return
			}
		`,
		resolvers: {
			// the mutation runs as a separate http request, thus "ctx.req.user" has the user-info
			Mutation: {
				_GetConnectionID: async(parent, args, ctx: Context, info)=>{
					// generate a connection-id for the caller
					const connectionID = GenerateUUID(); // todo: make sure this is truly random/secure/unguessable
					//Assert(!connectionID_userInfo.has(connectionID), "Got connection-id clash!");

					// for the connection-id, associate the user-info retrieved from passportjs (derived from the "debate-map-session" http-only cookie)
					const attachInfo = {ipAddress: GetIPAddress(ctx.req), userInfo: ctx.req["user"] as User};
					connectionID_attachInfo.set(connectionID, attachInfo);
					console.log(`Stored connection-id attach info. @connectionID:`, connectionID, "@ipAddress:", attachInfo.ipAddress, "@userID:", attachInfo.userInfo?.id);
					return {id: connectionID};
				},
			},

			// queries run in the persistent websocket connection (well, pgl makes a subscription variant that does), thus we need the "fake query" below in order for the client to tell server its connection-id, enabling server to find its user-info
			Query: {
				_PassConnectionID: async(parent, args, ctx: Context, info)=>{
					Assert(ctx.req["user"] == null, "Cannot call PassConnectionID again; this websocket connection already has a user-id attached.");

					const connectionID = args.connectionID;
					Assert(!connectionIDs_usedUp.has(connectionID), "The connection-id provided has already been used to attach a user-id!");
					const attachInfo = connectionID_attachInfo.get(connectionID);
					Assert(attachInfo != null, `Could not find user-id for connection-id: ${connectionID}`);
					Assert(GetIPAddress(ctx.req) == attachInfo.ipAddress, `Cannot call PassConnectionID; the ip-address does not match the caller of _GetConnectionID!`);

					connectionIDs_usedUp.add(connectionID); // mark as used first; guarantees can't be used twice
					ctx.req["user"] = attachInfo.userInfo; // attaches the discovered user-id to the persistent websocket connection/request
					console.log(`Attached info to websocket request. @ipAddress:`, attachInfo.ipAddress, "@userID:", attachInfo.userInfo?.id);

					//return {userInfo};
					//return {_: true};
					return {userID: attachInfo.userInfo?.id};
				},
			},
		},
	};
});

function GetIPAddress(req: Request) {
	//var ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim(); // commented, since x-forwarded-for can be spoofed
	//console.log("IPAddress:", req.ip ?? req.ips?.[0] ?? req.socket.remoteAddress ?? req.connection.address);
	return req.ip ?? req.ips?.[0] ?? req.socket.remoteAddress ?? req.connection.address;
}