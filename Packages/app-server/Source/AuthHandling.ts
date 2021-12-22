import passport from "passport";
import {Strategy as GoogleStrategy} from "passport-google-oauth20";
import express, {Request, RequestHandler} from "express";
import cookieSession from "cookie-session";
import {AddUser, GetUser, GetUsers, GetUserHiddensWithEmail, User, UserHidden, systemUserID, GetSystemAccessPolicyID, systemPolicy_publicUngoverned_name} from "dm_common";
import {GetAsync} from "web-vcore/nm/mobx-graphlink.js";
import {Assert, ToInt} from "web-vcore/nm/js-vextensions.js";
import {pgPool} from "./Main.js";
import {graph} from "./Utils/LibIntegrations/MobXGraphlink.js";
import {GetAppServerURL, GetWebServerURL} from "./Utils/LibIntegrations/Apollo.js";

const DEV = process.env.ENV == "dev";

//type ExpressApp = Express.Application;
type ExpressApp = ReturnType<typeof express>;

type GoogleAuth_ProviderData = {
	displayName: string;
	email: string;
	phoneNumber: string;
	photoURL: string;
	providerId: string; // "google.com"
	uid: string;
};

function Timeout<T extends Function>(func: T, timeout: number, onTimeout: (resolve: (value: any)=>any, reject: (reason?: any)=>any)=>any) {
	return function(...args) {
		const promise = func.apply(this, args);
		return Promise.race([
			promise,
			new Promise((resolve, reject)=>{
				setTimeout(()=>onTimeout(resolve, reject), timeout);
			}),
		]);
	};
}

/*const callbackURL_proxy = new String("[callback-url-proxy]");
callbackURL_proxy.toString = ()=>{
	const referrerURL = currentAuthRequest?.get("Referrer");
	console.log("Referrer url for auth request:", referrerURL);
	return GetAppServerURL("/auth/google/callback", referrerURL);
};*/

Object.defineProperty(Object.prototype, "callbackURL", {
	get() {
		const referrerURL = currentAuthRequest?.get("Referrer");
		console.log("Referrer url for auth request:", referrerURL);
		return GetAppServerURL("/auth/google/callback", referrerURL);
		/*if (process.env.ENV == "prod") return "https://app-server.debates.app/auth/google/callback"; // temp fix (shouldn't be needed, but apparently the rel-to-abs code passport uses is wrong)
		return "/auth/google/callback";*/
	},
});

let currentAuthRequest: Request<{}, any, any, any, Record<string, any>>;
passport.use(new GoogleStrategy(
	{
		clientID: process.env.CLIENT_ID as string,
		clientSecret: process.env.CLIENT_SECRET as string,
		//callbackURL: GetAppServerURL("/auth/google/callback"),
		/*get callbackURL() {
			const referrerURL = currentAuthRequest?.get("Referrer");
			console.log("Referrer url for auth request:", referrerURL);
			return GetAppServerURL("/auth/google/callback", referrerURL);
		},*/
		//callbackURL: callbackURL_proxy as any,
		// use relative url here; apparently passport-oauth supports this: https://github.com/jaredhanson/passport-oauth2/blob/86a6ae476e09c0864aef97456822d3e2915727f3/lib/strategy.js#L142
		//callbackURL: "/auth/google/callback",
	},
	async(accessToken, refreshToken, profile, done)=>{
		//console.log("Test1");
		const profile_firstEmail = profile.emails?.map(a=>a.value).find(a=>a);
		if (profile_firstEmail == null) return void done("Account must have associated email-address to sign-in.");
		const Timeout_5s = <T extends Function>(message: number|string, func: T)=>Timeout(func, 5000, (resolve, reject)=>{
			const finalMessage = `Database query timed out. [${message}]`;
			reject(finalMessage);
			done(finalMessage);
		});

		//await pgPool.query("INSERT INTO users(name, email) VALUES($1, $2) ON CONFLICT (id) DO NOTHING", [profile.id, profile.email]);

		const userHiddensData = await pgPool.query(`SELECT * FROM "userHiddens"`);
		const existingUserHiddens = userHiddensData.rows as UserHidden[];
		console.log("Existing user emails:", existingUserHiddens.map(a=>a.email));

		//const existingUser = await GetAsync(()=>GetUsers()));
		const existingUser_hidden = await Timeout_5s(1, GetAsync)(()=>GetUserHiddensWithEmail(profile_firstEmail)[0], {errorHandling_final: "log"});
		if (existingUser_hidden != null) {
			console.log("Found existing user for email:", profile_firstEmail);
			const existingUser = await Timeout_5s(2, GetAsync)(()=>GetUser(existingUser_hidden.id), {errorHandling_final: "log"});
			console.log("Also found user-data:", existingUser);
			Assert(existingUser != null, `Could not find user with id matching that of the entry in userHiddens (${existingUser_hidden.id}), which was found based on your provided account's email (${existingUser_hidden.email}).`);
			return void done(null, existingUser);
		}

		console.log(`User not found for email "${profile_firstEmail}". Creating new.`);

		const permissionGroups = {basic: true, verified: true, mod: false, admin: false};

		// temp; make every new user who signs up a mod
		//permissionGroups.mod = true;

		// maybe temp; make first (non-system) user an admin
		//if (existingUserHiddens.length <= 1) {
		const usersCountData = await pgPool.query("SELECT count(*) FROM (SELECT 1 FROM users LIMIT 10) t;");
		const usersCount = ToInt(usersCountData.rows[0].count);
		if (usersCount <= 1) {
			console.log("First non-system user signing-in; marking as admin.");
			permissionGroups.VSet({mod: true, admin: true});
		}

		const user = new User({
			displayName: profile.displayName,
			permissionGroups,
			photoURL: profile.photos?.[0]?.value,
		});
		const defaultPolicyID = await Timeout_5s(3, GetAsync)(()=>GetSystemAccessPolicyID(systemPolicy_publicUngoverned_name));
		const userHidden = new UserHidden({
			email: profile_firstEmail,
			providerData: [profile._json],
			lastAccessPolicy: defaultPolicyID,
		});
		const command = new AddUser({user, userHidden});
		command._userInfo_override = graph.userInfo; // use system-user to run the AddUser command
		const {id: newID} = (await command.RunLocally()).returnData;
		console.log("AddUser done! NewID:", newID);

		//if (true) return void done(null, {id: newID}); // temp (till AddUser actually adds a user that can be retrieved in next step)

		const result = await Timeout_5s(4, GetAsync)(()=>GetUser(newID), {errorHandling_final: "log"});
		console.log("User result:", result);
		done(null, result!);
	},
));
type UserBasicInfo = {id: string, displayName: string, photoURL: string|n};
passport.serializeUser((user: User, done)=>{
	//console.log("Test1.5:"); //, JSON.stringify(user));
	const basicInfo: UserBasicInfo = {id: user["id"], displayName: user["displayName"], photoURL: user["photoURL"]}; // todo: maybe serialize just the user-id, like before
	done(null, basicInfo);
});
passport.deserializeUser(async(userBasicInfo: UserBasicInfo, done)=>{
	/*const {rows} = await pgClient.query("select * from users where id = $1", []);
	if (rows.length == 0) done(`Cannot find user with id "${id}".`);*/
	//console.log("Test2:", JSON.stringify(userBasicInfo));

	//if (true) return void done(null, {id}); // temp (till AddUser actually adds a user that can be retrieved in next step)

	const user = await GetAsync(()=>GetUser(userBasicInfo.id));
	if (user == null) done(`Cannot find user with id "${userBasicInfo.id}".`);
	done(null, user);
});

// commented; we just use the return-value of "_PassConnectionID" now
/*const setUserIDResponseCookie: RequestHandler = (req, res, next)=>{
	const currentUserID = req.user?.["id"];
	//console.log("Afterward, got user:", currentUserID);

	var userIDCookie = req.cookies["debate-map-userid"];
	// if user-id cookie is out of date, update it
	if (currentUserID != userIDCookie) {
		if (currentUserID) {
			res.cookie("debate-map-userid", currentUserID, {
				//maxAge: new Date(2147483647 * 1000).toUTCString(),
				expires: new Date(253402300000000), // from: https://stackoverflow.com/a/28289961/2441655
				httpOnly: false, // httpOnly:false, so frontend code can access it

				//domain: ".app.localhost", // see above for reason
				//domain: ".localhost", // see above for reason
				//domain: "localhost",
			});
		} else {
			res.clearCookie("debate-map-userid");
		}
	}
	next();
};*/

const inCrossOriginAuth = false;
export function SetUpAuthHandling(app: ExpressApp) {
	//app.set('trust proxy', '127.0.0.1');
	// trust-proxy needed, so that "req.protocol" becomes "https", so that cookie-session allows setting a secure cookie
	//app.set('trust proxy', 1); // proxy info can be trusted, since users access the server through the cloudflare proxy
	// actually, just manually modify the flag (test)
	/*app.use((req, res, next)=>{
		Object.defineProperty(req, "protocol", {value: "https"});
		next();
	});*/

	//app.use(express.session({ secret: 'keyboard cat' }));
	app.use(cookieSession({
		name: "debate-map-session",
		keys: ["key1", "key2"],

		//domain: ".app.localhost", // explicitly set domain to ".app.localhost", so that it ignores the port segment, letting cookie be seen by both [app.]localhost:3005 and [db.app.]localhost:3105
		//domain: ".localhost",
		//domain: "localhost",

		httpOnly: true, // already the default
		/*get secure() { console.log("Secure:", inCrossOriginAuth); return inCrossOriginAuth; },
		get sameSite() { console.log("Secure:", inCrossOriginAuth); return inCrossOriginAuth ? "none" : undefined; },*/
		// needed so that cookies can be received by localhost frontend (when "?db=prod" flag is used)
		secure: true,
		sameSite: "none",
		//maxAge: 60 * 60 * 24 * 1000,
	}));
	// actually, just enable the "secure" flag on the sessionCookies object (see nm/cookie-session/index.js and nm/cookies/index.js)
	app.use((req, res, next)=>{
		req["sessionCookies"].secure = true;
		next();
	});

	/*app.use(expressSession({
		secret: "debate-map-session-123123",
		resave: false,
		saveUninitialized: false,
	}));*/
	app.use(passport.initialize());
	app.use(passport.session());

	// server-side access-token-retrieval approach
	app.get("/auth/google",
		(req, res, next)=>{
			//console.log("Got auth request. URL:", req.url);
			console.log("Got auth request. URL:", req.get("Referrer"));
			currentAuthRequest = req;
			next();
		},
		passport.authenticate("google", {
			scope: ["profile", "email"],
			//display: "popup",
		}));
	//includeUserIDAsResponseCookie);
	app.get("/auth/google/callback",
		/*(req, res, next)=>{
			console.log("Received callback...");
			next();
		},*/
		passport.authenticate("google"),
		//setUserIDResponseCookie,
		(req, res, next)=>{
			console.log("User_RM:", req.user);
			// if success
			if (req.user) {
				res.redirect(GetWebServerURL("/login-succeeded", req?.get("Referrer")));
			} else {
				res.redirect(GetWebServerURL("/login-failed", req?.get("Referrer")));
			}
			next();
		});
	app.get("/auth/google/callback_returnToLocalhost",
		passport.authenticate("google"),
		(req, res, next)=>{
			console.log("New_Session_Cookie:", req.sessionOptions, req.protocol, req.url, req.baseUrl, req.originalUrl, req.ip, req.ips);

			console.log("User_LH:", req.user);
			// if success
			if (req.user) {
				res.redirect(GetWebServerURL("/login-succeeded", req?.get("Referrer"), true));
			} else {
				res.redirect(GetWebServerURL("/login-failed", req?.get("Referrer"), true));
			}
			next();
		});

	app.get("/signOut", (req, res)=>{
		req.logOut();
		if (req.session?.destroy) {
			req.session.destroy(()=>{
				res.redirect(GetWebServerURL("/", req?.get("Referrer")));
			});
		} else {
			res.redirect(GetWebServerURL("/", req?.get("Referrer")));
		}
	});

	// for testing commands, as server-side
	/*app.get("/Test1", async(req, res, next)=>{
		console.log("Trying to add user... @req.body:", req.body);
		const user = new User({
			displayName: "displayName",
			permissionGroups: {basic: true, verified: false, mod: false, admin: false},
			photoURL: null,
		});
		const userHidden = new UserHidden({
			email: "test@gmail.com",
			providerData: ["n/a"],
		});
		const command = new AddUser({user, userHidden});
		console.log("Running command...");
		const result = await command.Run();
		console.log("Command done! Result:", result);
		next();
	});*/
}