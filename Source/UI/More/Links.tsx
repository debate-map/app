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
* Github (source code): [https://github.com/Venryx/DebateMap](https://github.com/Venryx/DebateMap)

### Canonical Debate Lab

The Debate Map project is being developed with the feedback of the Canonical Debate Lab group.

You're welcome to join our [Slack channel](https://join.slack.com/t/canonicaldebatelab/shared_invite/enQtMzEzOTU3NzYyMDY3LTI4YzUxM2I0MjFjZDNlMzQxZDM4YTgwNDNlMTY3YWQwNjJhYjk0ODE1MGU5NzQ2MTAyNTFhZWRhMGNjMjAxNmE) as we develop the model further. We share news and project updates, conduct weekly Hangouts calls, and have frequent discussions on how to improve the debate-software model.

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

The numbers indicate how well the sites rank on each factor, segmented into levels/tiles. (lower is better)

| Site | Layout format | Contribution efficiency | Features | Momentum | Open source |
| ---																		| ---	| ---	| ---	| ---	| ---	|
| [Kialo](https://www.kialo.com)									| 1	| 2	| 2	| 2	| no	|
| [Arguman](http://en.arguman.org)								| 2	| 3	| 4	| 4	| yes	|
| [Banter](https://banter.wiki)									| 2	| 2	| 4	| 7	| ...	|
| [Debucate](https://www.debucate.com)							| 3	| 3	| 5	| 7	| ...	|
| [CreateDebate](http://www.createdebate.com)				| 4	| 3	| 3	| 3	| ...	|
| [DebateHub](https://debatehub.net)							| 4	| 3	| 3	| 9	| ...	|
| [Netivist](https://netivist.org)								| 7	| 2	| 3	| 4	| ...	|
| [Quibl](http://www.quibl.com)									| 8	| 4	| 5	| 4	| ...	|
| [Debate.org](http://www.debate.org)							| 6	| 5	| 4	| 1	| ...	|
| [DebateGraph](http://debategraph.org)						| 6	| 7	| 4	| 4	| no	|
| [LettuceDebate](http://www.lettucedebate.com)				| 8	| 8	| 5	| 9	| ...	|
| [ConvinceMe](http://www.convinceme.net)						| 4	| 3	| 7	| 9	| ...	|
| [TruthMapping](https://www.truthmapping.com)				| 3	| 5	| 7	| 9	| no	|
| [YourView](http://yourview-production.herokuapp.com)	| 5	| 4	| 4	| 9	| ...	|

### Others

The websites below don't really match the "collaborative debating" concept, but still relate in some way and may be found useful:
* [ProCon](http://www.procon.org): Presents various arguments on topics in a clear and impartial way, but does not allow improvement by users.
* [DebateWise](http://debatewise.org): About the same as the above, except with voting on the article and comments, but slightly lower quality.
* [Snopes](http://www.snopes.com): Fact-checking website, on a wide range of topics.
* [PolitiFact](http://www.politifact.com): Fact-checking website, focused mainly on politics.
* [FactCheck](http://factcheck.org): Also a fact-checking website. Does not seem as full-fledged as the previous two.
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