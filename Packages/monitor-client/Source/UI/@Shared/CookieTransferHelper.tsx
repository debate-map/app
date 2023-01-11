import {GetServerURL} from "dm_common";
import React from "react";
import {AssertWarn} from "web-vcore/nm/js-vextensions";
import {BaseComponent} from "web-vcore/nm/react-vextensions";

let adminKeyCookieLastSetTo: string|n = null;

/** Helper needed to workaround cross-domain cookie restrictions, for when monitor-client is served by webpack.
See pod_proxies.rs for the server-side handling of the exchange. */
export class CookieTransferHelper extends BaseComponent<{adminKey: string}, {}> {
	render() {
		const {adminKey, children} = this.props;

		const iframeExampleURL = GetServerURL("monitor", `/example-path`, window.location.href);
		const canSetCookieDirectly = window.location.origin == new URL(iframeExampleURL).origin;
		const canUseCookieHelper = window.location.origin == "http://localhost:5131";

		let cookieSet = adminKeyCookieLastSetTo == adminKey;
		if (!cookieSet && canSetCookieDirectly) {
			document.cookie = `adminKey=${window.btoa(adminKey)}`;
			adminKeyCookieLastSetTo = adminKey;
			cookieSet = true;
		}

		let messageListenerForIframe;
		return (
			<>
				{!cookieSet && canUseCookieHelper &&
				<iframe src={GetServerURL("monitor", `/storeAdminKeyCookie`, window.location.href)} style={{height: "100%"}} ref={iframeEl=>{
					if (iframeEl) {
						AssertWarn(messageListenerForIframe == null);
						messageListenerForIframe = e=>{
							if (e.origin !== "http://localhost:5130") return;
							if (e.data.readyForAdminKey != null) {
								iframeEl.contentWindow!.postMessage({adminKey}, "http://localhost:5130");
							}
							if (e.data.adminKeyStored) {
								adminKeyCookieLastSetTo = adminKey;
								this.Update();
							}
						};
						window.addEventListener("message", messageListenerForIframe, false);
					} else {
						window.removeEventListener("message", messageListenerForIframe, false);
						messageListenerForIframe = null;
					}
				}}/>}
				{cookieSet &&
				children}
			</>
		);
	}
}