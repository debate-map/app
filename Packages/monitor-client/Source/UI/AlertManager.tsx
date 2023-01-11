import {GetServerURL} from "dm_common";
import React, {useEffect} from "react";
import {store} from "Store";
import {Observer} from "web-vcore";
import {Column} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";

@Observer
export class AlertManagerUI extends BaseComponent<{}, {blobURL: string, responseHTML: string}> {
	render() {
		let {} = this.props;
		const {blobURL, responseHTML} = this.state;
		const adminKey = store.main.adminKey;

		const self = this;
		const baseURL = GetServerURL("monitor", `/proxy/alertmanager/`, window.location.href);
		useEffect(()=>{
			// todo: probably make-so admin-key is passed in a header instead, for lower chance of leakage (see: https://stackoverflow.com/questions/13432821)
			var xhr = new XMLHttpRequest();
			xhr.open("GET", baseURL);
			//let blob_url_internal;
			xhr.onreadystatechange = function handler() {
				if (this.readyState === this.DONE) {
					console.log("Result:", this);
					if (this.status === 200) {
						/*// this.response is a Blob, because we set responseType above
						var data_url = blob_url_internal = URL.createObjectURL(this.response);
						//document.querySelector("#output-frame-id").src = data_url;
						self.SetState({blobURL: data_url});*/

						self.SetState({responseHTML: this.responseText});
					}
				}
			};
			//xhr.responseType = "blob";
			//xhr.setRequestHeader("Authorization", `Bearer ${adminKey}`);
			xhr.setRequestHeader("admin-key", adminKey);
			//xhr.setRequestHeader("Cookie", `adminKey=${window.btoa(adminKey)}`);
			xhr.send();

			//return ()=>URL.revokeObjectURL(blob_url_internal);
		}, [adminKey, baseURL, self]);

		return (
			<Column style={{flex: 1, height: "100%"}}>
				<iframe
					//src={blobURL}
					srcDoc={responseHTML == null ? "" : responseHTML.replace(
						`<head>`,
						`<head><base href="${baseURL}"/><script>document.cookie = "adminKey=${window.btoa(adminKey)}";</script>`,
					)}
					style={{height: "100%"}}/>
			</Column>
		);
	}
}