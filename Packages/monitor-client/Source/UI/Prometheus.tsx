import {GetServerURL} from "dm_common";
import React, {useEffect} from "react";
import {store} from "Store";
import {Observer} from "web-vcore";
import {Column} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";

@Observer
export class PrometheusUI extends BaseComponent<{}, {blobURL: string, responseHTML: string}> {
	render() {
		let {} = this.props;
		const {blobURL, responseHTML} = this.state;
		const adminKey = store.main.adminKey;

		const self = this;
		const baseURL = GetServerURL("monitor", `/proxy/prometheus/`, window.location.href);
		document.cookie = `adminKey=${window.btoa(adminKey)}`;
		useEffect(()=>{
			// todo: probably make-so admin-key is passed in a header instead, for lower chance of leakage (see: https://stackoverflow.com/questions/13432821)
			var xhr = new XMLHttpRequest();
			xhr.open("GET", `${baseURL}graph`);
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
				{responseHTML &&
				<iframe
					//src={blobURL}
					/*srcDoc={responseHTML == null ? "" : responseHTML.replace(
						`<head>`,
						`<head><base href="${baseURL}"/><script>document.cookie = "adminKey=${window.btoa(adminKey)}";</script>`,
					)}*/
					src={baseURL}
					style={{height: "100%"}}
					ref={(c: HTMLIFrameElement|n)=>{
						console.log("Ref:", c);
						if (c) {
							/*const iFrameDoc = c.contentWindow && c.contentWindow.document;
							if (!iFrameDoc) {
								console.error("iFrame security.");
								return;
							}
							iFrameDoc.write(responseHTML);
							iFrameDoc.close();*/
							setTimeout(()=>{
								console.log("Adding:", responseHTML);
								//c.contentDocument!.documentElement.innerHTML = responseHTML;
								//c.contentWindow!.document.documentElement.innerHTML = responseHTML;
								//c.contentWindow!.document.documentElement.append(responseHTML);
								//c.contentWindow!.document.body.append(responseHTML);
								//c.contentWindow!.document.body.append("Hello there!");

								const justContent = responseHTML
									// set cookie [not needed; we set cookie on root page above, and it's inherited]
									//.replace(`<head>`, `<head><base href="${baseURL}"/><script>document.cookie = "adminKey=${window.btoa(adminKey)}";</script>`)
									//.replace(`<head>`, `<head><script>document.cookie = "adminKey=${window.btoa(adminKey)}";</script>`)
									// just content
									.replace(`<!doctype html><html lang="en"><head>`, "")
									.replace(`</head><body class="bootstrap">`, "")
									.replace(`</body></html>`, "");

								//c.contentWindow!.document.body.insertAdjacentHTML("beforeend", justContent);
								const newFragment = c.contentWindow!.document.createRange().createContextualFragment(justContent);
								c.contentWindow!.document.body.appendChild(newFragment);

								console.log("Added:", c.contentWindow!.document.documentElement.innerHTML);
							}, 500);
						}
					}}
				/>}
			</Column>
		);
	}
}