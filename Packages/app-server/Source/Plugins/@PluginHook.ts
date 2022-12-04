import {GeneratePatchesPlugin} from "@pg-lq/postgraphile-plugin";
import {makePluginHook} from "postgraphile";
//import "web-vcore/nm/js-vextensions_ApplyCETypes.ts";
import "web-vcore/nm/js-vextensions_ApplyCETypes.js";
import {wsTransferVariant} from "../Main.js";
import {GetIPAddress} from "../Mutations/AuthenticationPlugin.js";

const liveSubscribeOps_timesSeen = new Map<string, number>();
const websocketRequestExtras = new WeakMap<Request, WebsocketRequestExtras>();
class WebsocketRequestExtras {
	liveSubscribeOps_timesSeen = new Map<string, number>();
}
export class LogSubscribeCalls_Hook {
	"postgraphile:liveSubscribe:executionResult"(result, {contextValue, operationName, variableValues}) {
		if (!websocketRequestExtras.has(contextValue.req)) websocketRequestExtras.set(contextValue.req, new WebsocketRequestExtras());
		const reqExtras = websocketRequestExtras.get(contextValue.req)!;

		const opKey = `@opName:${operationName} @vals:${JSON.stringify(variableValues)}`;
		const timesSeen = (liveSubscribeOps_timesSeen.get(opKey) ?? 0) + 1;
		const timesSeen_req = (reqExtras.liveSubscribeOps_timesSeen.get(opKey) ?? 0) + 1;
		// only show entries with variables present atm, since otherwise we can't tell between duplicates and just connection-filter-filtered ones
		if (Object.keys(variableValues).length > 0) {
			const wsReqs = reqExtras.liveSubscribeOps_timesSeen;
			console.log(`Got liveSubscribe exec-result. @reqCalls:(ws:${timesSeen_req},all:${timesSeen}) @wsReqs:(types:${[...wsReqs.keys()].length},calls:${[...wsReqs.values()].Sum()}) @ip:${GetIPAddress(contextValue.req)
				} ${opKey}`);
		}
		liveSubscribeOps_timesSeen.set(opKey, timesSeen);
		reqExtras.liveSubscribeOps_timesSeen.set(opKey, timesSeen_req);

		return result;
	}
}
export function CreatePluginHook_Main() {
	return makePluginHook([
		// todo: turn this variant on, and add the client-side plugin, for more efficient list-change messages
		wsTransferVariant == "patches" && new GeneratePatchesPlugin(),
		new LogSubscribeCalls_Hook(),
	] as any[]);
}