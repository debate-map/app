import {BaseComponent} from "react-vextensions";
import {gql, useSubscription} from "web-vcore/nm/@apollo/client";

export const LINK_PRESERVER_SUBSCRIPTION = gql`
subscription($input: LinkPreserverInput!) {
	linkPreserver(input: $input) {
		alive
		pageRefreshRequested
	}
}
`;
type LinkPreserverResult = {alive: boolean, pageRefreshRequested: boolean};

export class LinkPreserver extends BaseComponent<{}, {}> {
	render() {
		let {} = this.props;

		// Choose 45s as our update-interval; this avoids Cloudflare's "100 seconds of dormancy" timeout. (https://community.cloudflare.com/t/cloudflare-websocket-timeout/5865)
		// (we use a <60s interval, so that it will reliably hit each 60s timer-interval that Chrome 88+ allows for hidden pages: https://developer.chrome.com/blog/timer-throttling-in-chrome-88/#intensive-throttling)
		const updateInterval = 45000;

		const {data, loading} = useSubscription(LINK_PRESERVER_SUBSCRIPTION, {
			variables: {input: {updateInterval}},
			onSubscriptionData: info=>{
				const {alive, pageRefreshRequested} = info.subscriptionData.data.linkPreserver as LinkPreserverResult;
				if (pageRefreshRequested) {
					console.log("Refreshing page due to server request.");
					window.location.reload();
				}
			},
		});

		return null;
	}
}