export const userBlockMiddleware = (req, res, next)=>{
	// uncomment this if you want to restrict the users that can connect to postgraphile (eg. only you, while testing something)
	/*const ip = GetIPAddress(req);
	console.log("Got request. @ip:", ip, "@user:", req["user"]);
	const ipStr = ip.toString();
	const allowConditions = [
		a=>a == "::ffff:127.0.0.1",
		a=>a.startsWith(process.env.PGLRequiredIPStart ?? "n/a"),
	] as ((str: string)=>boolean)[];
	if (!allowConditions.Any(a=>a(ipStr))) {
		//res.status(403).end("Temporarily blocked for maintenance.");
		console.log("Blocking connection.");
		return;
	}
	console.log("Proceeding:", ip);*/

	next();
};