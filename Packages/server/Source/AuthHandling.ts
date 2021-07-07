import passport from "passport";
import {Strategy as GoogleStrategy} from "passport-google-oauth20";
import express from "express";
import cookieSession from "cookie-session";
import {AddUser, GetUser, User, User_Private} from "dm_common";
import {GetAsync} from "web-vcore/nm/mobx-graphlink.js";
import expressSession from "express-session";
import qs from "qs";
import {pgClient, pgPool} from "./Main.js";

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

passport.use(new GoogleStrategy(
	{
		clientID: process.env.CLIENT_ID as string,
		clientSecret: process.env.CLIENT_SECRET as string,
		callbackURL: "http://localhost:3105/auth/google/callback",
	},
	async(accessToken, refreshToken, profile, done)=>{
		console.log("Test1");
		//await pgPool.query("INSERT INTO users(name, email) VALUES($1, $2) ON CONFLICT (id) DO NOTHING", [profile.id, profile.email]);
		const user = new User({
			displayName: profile.displayName,
			permissionGroups: {basic: true, verified: false, mod: false, admin: false},
			photoURL: profile.photos?.[0]?.value,
		});
		const user_private = new User_Private({
			email: profile.emails?.map(a=>a.value).find(a=>a),
			providerData: [profile._json],
		});
		const command = new AddUser({user, user_private});
		const newID = await command.Run();
		console.log("AddUser done! NewID:", newID);

		if (true) return void done(null, {id: newID}); // temp (till AddUser actually adds a user that can be retrieved in next step)

		const result = await GetAsync(()=>GetUser(newID), {errorHandling: "log"});
		console.log("User result:", result);
		done(null, result!);
	},
));
passport.serializeUser((user, done)=>{
	console.log("Test1.5");
	done(null, user["id"]);
});
passport.deserializeUser(async(id: string, done)=>{
	/*const {rows} = await pgClient.query("select * from users where id = $1", []);
	if (rows.length == 0) done(`Cannot find user with id "${id}".`);*/
	console.log("Test2");

	if (true) return void done(null, {id}); // temp (till AddUser actually adds a user that can be retrieved in next step)

	const user = await GetAsync(()=>GetUser(id));
	if (user == null) done(`Cannot find user with id "${id}".`);
	done(null, user);
});

export function SetUpAuthHandling(app: ExpressApp) {
	//app.use(express.session({ secret: 'keyboard cat' }));
	/*app.use(cookieSession({
		name: "debate-map-session",
		keys: ["test1"],
	}));*/
	app.use(expressSession({
		secret: "debate-map-session-123123",
		resave: false,
		saveUninitialized: false,
	}));
	app.use(passport.initialize());
	app.use(passport.session());

	app.get("/Test1", async(req, res, next)=>{
		console.log("Trying to add user... @req.body:", req.body);
		const user = new User({
			displayName: "displayName",
			permissionGroups: {basic: true, verified: false, mod: false, admin: false},
			photoURL: null,
		});
		const user_private = new User_Private({
			email: "test@gmail.com",
			providerData: ["n/a"],
		});
		const command = new AddUser({user, user_private});
		console.log("Running command...");
		const result = await command.Run();
		console.log("Command done! Result:", result);
		next();
	});

	// server-side access-token-retrieval approach
	app.get("/auth/google", passport.authenticate("google", {
		scope: ["profile", "email"],
	}));
	app.get("/auth/google/callback",
		(req, res, next)=>{
			console.log("Early got-request. @reqBody:", req.body, req.url);

			// hack fixes
			/*req.body = req.url;
			req.headers["content-type"] = "application/x-www-form-urlencoded";
			//req.headers["content-length"] = `${req.url.length}`;
			//req.headers["content-length"] = Buffer.byteLength(req.url, "utf8").toString();
			req.headers["content-length"] = new TextEncoder().encode(req.url).length.toString();
			//req.headers["content-length"] = "0";*/
			const url_queryStrPart = new URL(`http://localhost/${req.url}`).search.slice(1); // remove "?" at start
			console.log("QueryStrPart:", url_queryStrPart);
			req.body = qs.parse(url_queryStrPart, {
				allowPrototypes: true,
				arrayLimit: 100,
				depth: Infinity,
				parameterLimit: 1000,
			});

			/*req.body = JSON.stringify(qs.parse(url_queryStrPart, {
				allowPrototypes: true,
				arrayLimit: 100,
				depth: Infinity,
				parameterLimit: 1000,
			}));
			req.headers["content-type"] = "application/json";
			req.headers["content-length"] = Buffer.byteLength(req.body, "utf8").toString();*/

			//res.send("Kay...");
			next();
		},
		//express.urlencoded({extended: true}),
		//express.urlencoded({extended: false}),
		express.json(),
		(req, res, next)=>{
			console.log("Got request. @reqBody:", req.body, req.url);
			//res.send("Kay...");
			next();
		},
		passport.authenticate("google", {
			//failureRedirect: "/login-failed",
			//failureMessage: true,
			failWithError: true, // passes error to client (bad for security; temp)
			//failureFlash: true,
		/*}, (err, user, info)=>{
			console.log("Got:", err, user, info); // this is finally getting called!
		}*/
		}),
		(req, res)=>{
			console.log("Passport authentication complete. @req.user:", req.user);
			// Successful authentication, redirect home.
			res.redirect("/good");
			//res.send("Success.");
		});
	/*app.get("/auth/google/callback", (req, res, next)=>{
		console.log("Got request. @reqBody:", req.body, "@req.url:", req.url, req.baseUrl, req.originalUrl);
		passport.authenticate("google", (err, user, info)=>{
			console.log("Got2:", err, user, info);

			//req.logIn(user, )

			console.log("Passport authentication complete. @req.user:", req.user);
			// Successful authentication, redirect home.
			res.redirect("http://localhost:3005");
			//res.send("Success.");
		})(req, res, next);
	});*/

	// client-side access-token-retrieval approach
	/*app.post("/auth/google/callback", (req, res, next)=>{
		console.log("Got request. @reqBody:", req.body);
		//res.send("Kay...");
		/*passport.authenticate("google", {
			//failureRedirect: "/login-failed",
			failureFlash: true,
		}, (err, user, info)=>{
			console.log("Got1:", err, user, info);
		})(req, res, next);*#/
		passport.authorize("google", (err, user, info)=>{
			console.log("Got2:", err, user, info);
		})(req, res, next);
	});*/
}