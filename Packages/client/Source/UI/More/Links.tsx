import {BaseComponent, SimpleShouldUpdate} from "web-vcore/nm/react-vextensions.js";
import {VReactMarkdown_Remarkable, PageContainer} from "web-vcore";

export const slackInviteLink = "https://join.slack.com/t/canonicaldebatelab/shared_invite/zt-408acfmb-qhowbidwY0aKaET7wP_IEQ";

const pageText = `
### Social media

* Blog: [https://medium.com/debate-map](https://medium.com/debate-map)
* Facebook: [https://www.facebook.com/debatemap](https://www.facebook.com/debatemap)
* Twitter: [https://twitter.com/debatemaps](https://twitter.com/debatemaps)
* Reddit: [https://www.reddit.com/r/DebateMap](https://www.reddit.com/r/DebateMap)
* YouTube: [https://www.youtube.com/channel/UC2lP4zM7Mcm9_dO92gjpy_w](https://www.youtube.com/channel/UC2lP4zM7Mcm9_dO92gjpy_w)

### Development

* Gitter (project chat): [https://gitter.im/DebateMap/Lobby](https://gitter.im/DebateMap/Lobby)
* Github (source code): [https://github.com/debate-map/app](https://github.com/debate-map/app)

### Canonical Debate Lab

The Debate Map project is being developed with the feedback of the Canonical Debate Lab group.

You're welcome to join our [Slack channel](${slackInviteLink}) as we develop the model further.
We share news and project updates, conduct weekly Hangouts calls, and have frequent discussions on how to improve the debate-software model.

Links:
* Slack (project chat): [Invite link](${slackInviteLink})
* Blog: [https://medium.com/canonical-debate-lab](https://medium.com/canonical-debate-lab)
* Facebook: [https://www.facebook.com/CanonicalDebateLab](https://www.facebook.com/CanonicalDebateLab)
* Twitter: [https://twitter.com/CanonicalDebate](https://twitter.com/CanonicalDebate)
* Github organization: [https://github.com/canonical-debate-lab](https://github.com/canonical-debate-lab)

&nbsp;

## Other websites

### Collaborative debating 

Hopefully, of course, you'll find this site the best option for debate-mapping -- and that through feedback we can resolve its remaining deficiencies.
For those wanting to see other options, however, the below is a listing of the best alternatives we're aware of.

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

### To evaluate

The following sites have not yet been evaluated for the criteria in the table above:
* https://www.whysaurus.com
* https://socratrees.azurewebsites.net
* https://ameliorate.app

### Others

The websites below don't really match the "collaborative debating" concept, but still relate in some way and may be found useful:
* [ProCon](http://www.procon.org): Presents various arguments on topics in a clear and impartial way, but does not allow improvement by users.
* [DebateWise](http://debatewise.org): About the same as the above, except with voting on the article and comments, but slightly lower quality.
* [Snopes](http://www.snopes.com): Fact-checking website, on a wide range of topics.
* [PolitiFact](http://www.politifact.com): Fact-checking website, focused mainly on politics.
* [FactCheck](http://factcheck.org): Also a fact-checking website. Does not seem as full-fledged as the previous two.
`;

@SimpleShouldUpdate
export class LinksUI extends BaseComponent<{}, {}> {
	render() {
		const {page, match} = this.props;
		return (
			<PageContainer scrollable={true}>
				<article className="selectableAC">
					{/* <VReactMarkdown className="selectable" source={pageText}/> */}
					<VReactMarkdown_Remarkable source={pageText}/>
				</article>
			</PageContainer>
		);
	}
}