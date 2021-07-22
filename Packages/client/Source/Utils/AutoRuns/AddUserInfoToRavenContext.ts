import {autorun} from "web-vcore/nm/mobx.js";
import {GetOpenMapID} from "Store/main";
import {GetMapView} from "Store/main/maps/mapViews/$mapView.js";
import {Clone} from "web-vcore/nm/js-vextensions.js";
import Raven from "web-vcore/nm/raven-js";
import {Me} from "dm_common";
import {AutoRun_HandleBail} from "./@Helpers.js";

AutoRun_HandleBail(()=>{
	// edit: something used to be here?
	let lastAuth;
	let lastMapView;
	let lastContextData; // only gets updated when one of the above components change
	AutoRun_HandleBail(()=>{
		// const auth = GetAuth();
		//const auth = GetAuth_Raw();
		const auth = Me();
		const mapView = GetOpenMapID() ? GetMapView(GetOpenMapID()) : null;

		let newContextData;
		const ExtendNewContextData = newData=>{
			if (newContextData == null) newContextData = Clone(lastContextData || {});
			newContextData.Extend(newData);
		};
		// if (auth != lastAuth) ExtendNewContextData({ auth: auth ? auth.IncludeKeys('id', 'displayName') : null });
		//if (auth != lastAuth) ExtendNewContextData({auth: auth ? auth.IncludeKeys("uid", "displayName", "email", "photoURL") : null});
		if (auth != lastAuth) ExtendNewContextData({auth: auth ? auth.IncludeKeys("id", "displayName", /*"email",*/ "photoURL") : null});
		if (mapView != lastMapView) ExtendNewContextData({mapView});

		if (newContextData != null) {
			// Log('Setting user-context: ', newContextData);
			Raven.setUserContext(newContextData);
			lastContextData = newContextData;
		}

		lastAuth = auth;
		lastMapView = mapView;
	});
}, {name: "AddUserInfoToRavenContext"});