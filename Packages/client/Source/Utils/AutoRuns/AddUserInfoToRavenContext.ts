import {autorun} from "web-vcore/nm/mobx";
import {GetOpenMapID} from "Store/main";
import {GetMapView} from "Store/main/maps/mapViews/$mapView";
import {Clone} from "web-vcore/nm/js-vextensions";
import Raven from "web-vcore/nm/raven-js";
import {GetAuth_Raw} from "@debate-map/server-link/Source/Link";

autorun(()=>{
	let lastAuth;
	let lastMapView;
	let lastContextData; // only gets updated when one of the above components change
	autorun(()=>{
		// const auth = GetAuth();
		const auth = GetAuth_Raw();
		const mapView = GetOpenMapID() ? GetMapView(GetOpenMapID()) : null;

		let newContextData;
		const ExtendNewContextData = newData=>{
			if (newContextData == null) newContextData = Clone(lastContextData || {});
			newContextData.Extend(newData);
		};
		// if (auth != lastAuth) ExtendNewContextData({ auth: auth ? auth.Including('id', 'displayName') : null });
		if (auth != lastAuth) ExtendNewContextData({auth: auth ? auth.Including("uid", "displayName", "email", "photoURL") : null});
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