export function DMCommon_InServer() {
	return typeof global != "undefined";
}
export function DMCommon_InFrontend() {
	//return typeof window != "undefined";
	return !DMCommon_InServer();
}