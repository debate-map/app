import {autorun} from "mobx";
import {GetOpenMapID} from "Source/Store/main";
import {GetMapView} from "Source/Store/main/maps/mapViews/$mapView";
import {Clone} from "js-vextensions";
import Raven from "raven-js";
import {GetAuth_Raw} from "Subrepos/Server/Source/@Shared/Store/firebase";

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