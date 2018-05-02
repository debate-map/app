import {BaseComponent} from "react-vextensions";
import {styles} from "../Frame/UI/GlobalStyles";
import VReactMarkdown_Remarkable from "../Frame/ReactComponents/VReactMarkdown_Remarkable";

let pageText = `
The Social page is under development.

In the meantime, here are links to our social media and development pages:

### Social media

* Blog: [https://medium.com/debate-map](https://medium.com/debate-map)
* Facebook: [https://www.facebook.com/debatemap](https://www.facebook.com/debatemap)
* Twitter: [https://twitter.com/debatemaps](https://twitter.com/debatemaps)
* Reddit: [https://www.reddit.com/r/DebateMap](https://www.reddit.com/r/DebateMap)
* YouTube: [https://www.youtube.com/channel/UC2lP4zM7Mcm9_dO92gjpy_w](https://www.youtube.com/channel/UC2lP4zM7Mcm9_dO92gjpy_w)
* Google+: [https://plus.google.com/108442736183774686103](https://plus.google.com/108442736183774686103)

### Development

* Gitter (project chat): [https://gitter.im/DebateMap/Lobby](https://gitter.im/DebateMap/Lobby)
* Trello (task list): [https://trello.com/b/7ZhagPiN](https://trello.com/b/7ZhagPiN)
* Github (source code): [https://github.com/Venryx/DebateMap](https://github.com/Venryx/DebateMap)

### Canonical Debate Lab

The Debate Map project is being developed with the feedback of the Canonical Debate Lab group.

You're welcome to join our [Slack channel](https://join.slack.com/t/canonicaldebatelab/shared_invite/enQtMzEzOTU3NzYyMDY3LTI4YzUxM2I0MjFjZDNlMzQxZDM4YTgwNDNlMTY3YWQwNjJhYjk0ODE1MGU5NzQ2MTAyNTFhZWRhMGNjMjAxNmE) as we develop the model further. We share news and project updates, conduct weekly Hangouts calls, and have frequent discussions on how to improve the debate-software model.
`;

export default class SocialUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<article className="selectableAC" style={styles.page}>
				{/*<VReactMarkdown className="selectable" source={pageText} containerProps={{style: styles.page}}/>*/}
				<VReactMarkdown_Remarkable source={pageText}/>
			</article>
		);
	}
}