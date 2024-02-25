import {Me} from "dm_common";
import {Clone} from "web-vcore/nm/js-vextensions.js";
import Raven from "web-vcore/nm/raven-js";
import {AutoRun_HandleBail} from "./@Helpers.js";

let lastUser;
let lastContextData; // only gets updated when one of the above components change
AutoRun_HandleBail(()=>{
	const user = Me();

	let newContextData;
	const ExtendNewContextData = newData=>{
		if (newContextData == null) newContextData = Clone(lastContextData || {});
		Object.assign(newContextData, newData);
	};
	if (user != lastUser) ExtendNewContextData({user});

	if (newContextData != null) {
		//console.log("Setting context data: ", newContextData);
		Raven.setUserContext(newContextData);
		lastContextData = newContextData;
	}

	lastUser = user;
}, {name: "AddUserInfoToRavenContext"});