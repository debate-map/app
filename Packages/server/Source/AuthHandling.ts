import passport from "passport";
import {Strategy as GoogleStrategy} from "passport-google-oauth20";
import express from "express";
import cookieSession from "cookie-session";
import {AddUser, GetUser, User, User_Private} from "dm_common";
import {GetAsync} from "web-vcore/nm/mobx-graphlink.js";
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
		await command.Run();
		done();
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
	const user = await GetAsync(()=>GetUser(id));
	if (user == null) done(`Cannot find user with id "${id}".`);
	done(null, user);
});

export function SetUpAuthHandling(app: ExpressApp) {
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(cookieSession({
		name: "debate-map-session",
		keys: [""],
	}));

	app.get("/auth/google", passport.authenticate("google", {scope: ["profile", "email"]}));
	/*app.post("/auth/google/callback",
		(req, res, next)=>{
			console.log("Got request. @reqBody:", req.body);
			//res.send("Kay...");
			next();
		},
		passport.authenticate("google", {
			//failureRedirect: "/login-failed",
			failureFlash: true,
		}, (err, user, info)=>{
			console.log("Got:", err, user, info);
		}),
		(req, res)=>{
			console.log("Passport authentication complete. @req.user:", req.user);
			// Successful authentication, redirect home.
			//res.redirect("/");
			res.send("Success.");
		});*/
	app.post("/auth/google/callback", (req, res, next)=>{
		console.log("Got request. @reqBody:", req.body);
		res.send("Kay...");
		/*passport.authenticate("google", {
			//failureRedirect: "/login-failed",
			failureFlash: true,
		}, (err, user, info)=>{
			console.log("Got:", err, user, info);
		})(req, res, next);*/
	});
}