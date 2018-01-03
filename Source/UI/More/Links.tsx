import {SubNavBarButton} from "../@Shared/SubNavBar";
import SubNavBar from "../@Shared/SubNavBar";
import {BaseComponent, SimpleShouldUpdate} from "react-vextensions";
import VReactMarkdown from "../../Frame/ReactComponents/VReactMarkdown";
import {ScrollView} from "react-vscrollview";
import {styles} from "../../Frame/UI/GlobalStyles";
import VReactMarkdown_Remarkable from "../../Frame/ReactComponents/VReactMarkdown_Remarkable";

let pageText = `
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

&nbsp;

## Other websites

### Collaborative debating 

Hopefully, of course, you'll find this site the best option for debate-mapping -- and that through feedback we can resolve its remaining deficiencies.${""
	} For those wanting to see other options, however, the below is a listing of the best alternatives we're aware of. (most sites don't do this!)

Criteria:
* Layout format: how efficiently you can parse arguments and premises from the presented data.
* Contribution efficiency: how easy it is to create and edit content.
* Features: how substantial the features provided are.
* Momentum: how large/healthy the community is, and how much the project continues to be improved/developed.
* Open source: whether the source code is provided. (which allows for wider usage, and community-based improvement)

The scores indicate how well each site does on the given factor, relative to the others.

| Site | Layout format | Contribution efficiency | Features | Momentum | Open source |
| ---																		| ---	| ---	| ---	| ---	| ---	|
| [Kialo](https://www.kialo.com)									| 100	| 90	| 90	| 90	| no	|
| [Arguman](http://en.arguman.org)								| 90	| 80	| 75	| 70	| yes	|
| [Banter](https://banter.wiki)									| 90	| 90	| 70	| 40	| ...	|
| [Debucate](https://www.debucate.com)							| 80	| 85	| 65	| 45	| ...	|
| [CreateDebate](http://www.createdebate.com)				| 70	| 85	| 80	| 80	| ...	|
| [DebateHub](https://debatehub.net)							| 70	| 85	| 80	| 15	| ...	|
| [Netivist](https://netivist.org)								| 40	| 90	| 85	| 75	| ...	|
| [Quibl](http://www.quibl.com)									| 35	| 75	| 65	| 75	| ...	|
| [Debate.org](http://www.debate.org)							| 50	| 65	| 70	| 100	| ...	|
| [DebateGraph](http://debategraph.org)						| 55	| 40	| 75	| 75	| no	|
| [LettuceDebate](http://www.lettucedebate.com)				| 30	| 30	| 65	| 20	| ...	|
| [ConvinceMe](http://www.convinceme.net)						| 70	| 80	| 45	| 15	| ...	|
| [TruthMapping](https://www.truthmapping.com)				| 80	| 60	| 45	| 10	| no	|
| [YourView](http://yourview-production.herokuapp.com)	| 60	| 70	| 75	| 15	| ...	|

### Others

The websites below don't really match the "collaborative debating" concept, but still relate in some way and may be found useful:
* [ProCon](http://www.procon.org): Presents various arguments on topics in a clear and impartial way, but does not allow improvement by users.
* [DebateWise](http://debatewise.org): About the same as the above, except with voting on the article and comments, but slightly lower quality.
* [Snopes](http://www.snopes.com): Fact-checking website, on a wide range of topics.
* [PolitiFact](http://www.politifact.com): Fact-checking website, focused mainly on politics.
* [FactCheck](http://factcheck.org): Yes, also a fact-checking website. Does not seem as full-fledged as the previous two.
`;

@SimpleShouldUpdate
export default class LinksUI extends BaseComponent<{}, {}> {
	render() {
		let {page, match} = this.props;
		return (
			<article className="selectableAC" style={styles.page}>
				{/*<VReactMarkdown className="selectable" source={pageText} containerProps={{style: styles.page}}/>*/}
				<VReactMarkdown_Remarkable source={pageText}/>
			</article>
		);
	}
}