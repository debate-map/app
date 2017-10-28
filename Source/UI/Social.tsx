import {Div, BaseComponent} from "../Frame/UI/ReactGlobals";
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