import passport from "passport";
import {Strategy as GoogleStrategy} from "passport-google-oauth20";
import express from "express";
import cookieSession from "cookie-session";
import {pgClient, pgPool} from "./index.js";

//type ExpressApp = Express.Application;
type ExpressApp = ReturnType<typeof express>;

passport.use(new GoogleStrategy(
	{
		clientID: process.env.CLIENT_ID,
		clientSecret: process.env.CLIENT_SECRET,
		callbackURL: "http://localhost:3105/auth/google/callback",
	},
	async(accessToken: string, refreshToken: string, profile: {id: string, email: string}, done: (err?, user?)=>any)=>{
		await pgPool.query("INSERT INTO users(name, email) VALUES($1, $2) ON CONFLICT (id) DO NOTHING", [profile.id, profile.email]);
		done();
	}));
passport.serializeUser((user, done)=>{
	done(null, user["id"]);
})
passport.deserializeUser(async(id, done)=>{
	const {rows} = await pgClient.query("select * from users where id = $1", []);
	if (rows.length == 0) done(`Cannot find user with id "${id}".`);
	done(null, rows[0]);
});

export function SetUpAuthHandling(app: ExpressApp) {
	app.use(passport.initialize());
	app.use(passport.session());
	app.use(cookieSession({
		name: "debate-map-session",
		keys: [""],
	}));

	app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));
	app.get("/auth/google/callback", passport.authenticate("google", {
		//failureRedirect: "/login-failed",
		failureFlash: true,
	}),
	function(req, res) {
		// Successful authentication, redirect home.
		res.redirect("/");
	});
}