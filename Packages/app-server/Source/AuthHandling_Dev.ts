import passport from "passport";
import {GetServerURL, User} from "dm_common";
import LocalStrategy from "passport-local";
import express, {Request, RequestHandler} from "express";
import {Assert} from "web-vcore/nm/js-vextensions";
import {Profile} from "passport-google-oauth20";
import {DoneCallback, StoreUserDataForGoogleSignIn, UserBasicInfo} from "./AuthHandling.js";

const DEV = process.env.ENV == "dev";

type ExpressApp = ReturnType<typeof express>;
// all the funcs below do nothing by default (all fake/dev login behavior should be within the if-statement below, to avoid accidental usage in non-dev mode)
export let PrepPassportJS_Dev = ()=>{};
export let SetUpAuthHandling_Dev = (app: ExpressApp)=>{};
//export let DeserializeUser_Dev = async(userBasicInfo: UserBasicInfo): Promise<User|n>=>null;

export const fakeUserData_idPrefix = `DevID_`;
if (DEV) {
	console.log("WARNING: In dev-mode, so enabling fake/passwordless login.");
	PrepPassportJS_Dev = ()=>{
		// fake/dev strategy
		passport.use(new LocalStrategy(
			async(username: string, password: string, done: DoneCallback)=>{
				//return done(null, UsernameToFakeUserData(username));
				const fakeUser = UsernameToFakeUserData(username);

				// the StoreUserDataForGoogleSignIn func currently only uses these fields: emails, displayName, photos, _json
				const fakeUser_asGProfile: Profile = {
					emails: [{value: `${fakeUser.displayName}@fake.com`}],
					displayName: fakeUser.displayName,
					photos: [],
					//_json: {},
				} as any;

				await StoreUserDataForGoogleSignIn(null, null, fakeUser_asGProfile, done, true);
			},
		));
	};

	SetUpAuthHandling_Dev = (app: ExpressApp)=>{
		// fake/dev login
		app.post("/auth/dev", // post fails atm (probably due to misconfiguration in rs->js proxy)
		//app.get("/auth/dev",
			(req, res, next)=>{
				console.log("Got dev auth request. URL:", req.get("Referrer"));
				next();
			},
			passport.authenticate("local", {}),
			(req, res)=>{
				//res.redirect('/');
				res.redirect(GetServerURL("web-server", "/", req?.get("Referrer")));
			});
	};

	/*DeserializeUser_Dev = async(userBasicInfo: UserBasicInfo)=>{
		if (userBasicInfo.id?.startsWith(fakeUserData_idPrefix)) {
			//const username = FakeSlugIDToUsername(userBasicInfo.id);
			const username = userBasicInfo.displayName;
			return UsernameToFakeUserData(username);
		}
	};*/

	// utility functions
	function FakeSlugIDToUsername(id: string) {
		return id.slice(id.lastIndexOf("_") + 1);
	}
	function UsernameToFakeSlugID(username: string) {
		const prefixSegment = fakeUserData_idPrefix;
		const usernameSegment_maxLength = 22 - (prefixSegment.length + 1);

		//const usernameSegment = username.replace(/[^a-zA-Z0-9]/g, "_").slice(0, usernameSegment_maxLength);
		const usernameSegment = username.replace(/[^a-zA-Z0-9]/g, "_");
		Assert(usernameSegment.length <= usernameSegment_maxLength, "Fake username is too long!");

		const gapSize = 22 - prefixSegment.length - usernameSegment.length;
		return prefixSegment + "_".repeat(gapSize) + usernameSegment;
	}
	function UsernameToFakeUserData(username: string) {
		return new User({
			id: UsernameToFakeSlugID(username),
			displayName: username,
			edits: 0,
			joinDate: 1,
			lastEditAt: null,
			permissionGroups: {basic: true, verified: true, mod: true, admin: true},
			photoURL: null,
		});
	}
}