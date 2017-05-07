import {SubNavBarButton} from "../@Shared/SubNavBar";
import SubNavBar from "../@Shared/SubNavBar";
import {BaseComponent, SimpleShouldUpdate} from "../../Frame/UI/ReactGlobals";
import VReactMarkdown from "../../Frame/ReactComponents/VReactMarkdown";
import ScrollView from "react-vscrollview";
import {styles} from "../../Frame/UI/GlobalStyles";
//import Markdown from "react-remarkable";
var Markdown = require("react-remarkable");

let pageText = `
### Social

* Facebook: [https://www.facebook.com/debatemap](https://www.facebook.com/debatemap)
* Twitter: [https://twitter.com/debatemaps](https://twitter.com/debatemaps)
* Reddit: [https://www.reddit.com/r/DebateMap](https://www.reddit.com/r/DebateMap)
* YouTube: [https://www.youtube.com/channel/UC2lP4zM7Mcm9_dO92gjpy_w](https://www.youtube.com/channel/UC2lP4zM7Mcm9_dO92gjpy_w)
* Google+: [https://plus.google.com/108442736183774686103](https://plus.google.com/108442736183774686103)

### Development

* Gitter (project chat): [https://gitter.im/DebateMap/Lobby](https://gitter.im/DebateMap/Lobby)
* Trello (task list): [https://trello.com/b/7ZhagPiN](https://trello.com/b/7ZhagPiN)
* Github: [https://github.com/Venryx/DebateMap](https://github.com/Venryx/DebateMap)

### Other websites

The following are some websites with goals similar to this project's.

Criteria:
* Clarity: how efficiently you can parse arguments and premises from the presented data.
* Editing efficiency: how easy it is to create and edit arguments and premises.
* Features: how substantial the additional features provided are. (beyond argument/premise presentation) 

| Site | Clarity, when shallow | Clarity, when deep | Editing efficiency | Features |
| --- | --- | --- | --- | --- |
| [Arguman](http://en.arguman.org) | 80% | 70% | 80%	| 60% |
| [ProCon](http://www.procon.org) | ... | ... | ... | ... |
| [DebateGraph](http://debategraph.org) | ... | ... | ... | ... |
| [Netivist](https://netivist.org) | ... | ... | ... | ... |
| [Debucate](https://www.debucate.com) | ... | ... | ... | ... |
| [TruthMapping](https://www.truthmapping.com) | ... | ... | ... | ... |
| [Debate.org](http://www.debate.org) | ...  | ... | ... | ... |
| [YourView](http://yourview-production.herokuapp.com) | ... | ... | ... | ... |
| [DebateHub](https://debatehub.net) | ... | ... | ... | ... |
| [DebateWise](http://debatewise.org) | ... | ... | ... | ... |
| [CreateDebate](http://www.createdebate.com) | ... | ... | ... | ... |
| [ConvinceMe](http://www.convinceme.net) | ... | ... | ... | ... |
| [Quibl](http://www.quibl.com) | ... | ... | ... | ... |
| [Cohere](http://cohere.open.ac.uk) | ... | ... | ... | ... |
| [LettuceDebate](http://www.lettucedebate.com) | ... | ... | ... | ... |
| [Banter](https://banter.wiki) | ... | ... | ... | ... |
`;

@SimpleShouldUpdate
export default class LinksUI extends BaseComponent<{}, {}> {
	render() {
		let {page, match} = this.props;
		return (
			<article className="selectableAC" style={styles.page}>
				{/*<VReactMarkdown className="selectable" source={pageText} containerProps={{style: styles.page}}/>*/}
				<Markdown container="div" source={pageText}/>
			</article>
		);
	}
}