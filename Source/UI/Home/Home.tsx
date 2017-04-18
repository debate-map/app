import {Connect} from "../../Frame/Database/FirebaseConnect";
import {DeepGet} from "../../Frame/V/V";
import {SubNavBarButton} from "../@Shared/SubNavBar";
import SubNavBar from "../@Shared/SubNavBar";
import {BaseComponent, SimpleShouldUpdate} from "../../Frame/UI/ReactGlobals";
import VReactMarkdown from "../../Frame/ReactComponents/VReactMarkdown";
import {styles} from "../../Frame/UI/GlobalStyles";
import ScrollView from "react-vscrollview";
import {GetPathNodes} from "../../Store/router";
import {PropTypes} from "react";
import {GetUrlParts, JumpToHash, ToAbsoluteUrl} from "../../Frame/General/URLs";
import {E} from "../../Frame/General/Globals_Free";
import {List} from "../../Frame/Serialization/VDF/VDFExtras";
import GlobalMapUI from "../Global/GlobalMapUI";
import MapUI from "../@Shared/Maps/MapUI";
import {MapType, Map} from "../../Store/firebase/maps/@Map";
import {MapNode} from "../../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {MapView} from "../../Store/main/mapViews/@MapViews";
import {GetNode} from "../../Store/firebase/nodes";

let pageText = `
The Debate Map project is an innovative new platform for presenting and analyzing beliefs (or "theses") and the arguments that support them. Its content is crowd-sourced
	(like Wikipedia), and the software is open-source (under MIT), promoting collaborative development and increased accountability.<sup>[1](#footnote1)</sup>

There are three types of maps present on this site: personal maps, debate maps, and [the global map](/global).

Here is a quick example:

GlobalMapPlaceholder

The tree-like structure assists in traversing the various lines of evidence:
	at each level, there is a "thesis" which makes a claim, and a set of simple "arguments" which support it.
By keeping the forms of these arguments simple, we're able to match them (in many cases) with the basic forms of logical arguments (modus ponens, etc.),
	permitting quick evaluation of the logical connections -- this saves time, and lets us focus on the underlying chain of evidence instead of parsing statement meanings.

Along with other features (such as the crowd-sourced rating of nodes' strength, neutrality, etc.), this has the potential to...

## Transform discussion on contentious issues

Instead of the traditional thread-based dialogue (which tends toward long and hard-to-follow threads),
	or the brief but less thorough exchanges of in-person speech, this project aims to bring the benefits of both:
* Providing thoroughness and clarity-of-meaning by allowing arbitrarily deep subtrees. (each "supporting" or "opposing" its parent)
* Remaining traversable and easy to follow by having arguments mapped directly under the thesis they relate to, instead of sprawled out over many posts.
* Not re-inventing the wheel: populating a line of evidence or reasoning once, and then sharing it in every part of the tree (and in every conversation) where it's relevant.

The end result is a relatively clear and compact tree where, if a pair of members disagree, they can simply take turns "adding layers" -- having the software
	display where their belief trees differ, and each marking within the tree the paths/subtrees they see most strongly supporting their view. (feature not yet developed)

At some point it will occur that either:
1) One of them realizes that the arguments supporting his original position (or a sub-position) is weaker than a competitor's, and changes his views accordingly. (ideal!)
2) One of them becomes forced to claim belief in a thesis which is admitted to have weaker mapped/presented arguments than a competitor.
3) They'll disagree on something difficult to collaboratively break down, such as philosophical axioms or claims of personal experiences.
4) They'll get so deep down in the belief tree that even if in theory the approach could work, it becomes too time-consuming to further develop the many branches.

While the less desirable options are sure to occur (and more often than we'd like), we still believe that the "recursive unrolling of belief trees" is substantially
	clearer, less error-prone, less emotionally-heating, and more conducive to abstraction/reuse and statisticical analysis than the options previously available.

## Expedite and modernize the detailed sharing of one's worldview

By acting as a global, flexible, and crowd-sourced tree of theses, communicating your view of the world becomes much faster. Instead of writing instance-specific text
	for each conversation, you can map your views once, and simply form a "remix" of your personal belief tree that is tailored for the conversation at hand.

The conversation can then proceed from that point, with the reasoning behind your views now known and easily referencable in the background.

## Facilitate more careful examination of one's own belief system

Engaging with a tool that operates on percentages, numbers, and weights makes self-accountability easier to achieve:
	by entering numbers, one is declaring to himself how much he considers his beliefs to be supported, and by what means.
This allows one to then do tool-based analysis on his views, and more easily spot areas of possible bias or unjustified conclusions.

He can then proceed to look more closely at those areas, examining the pool of existing evidence and reasoning,
	and referencing statistics on how the rest of the population considers each piece along the way.

<a name="footnote1">1</a>: In case the project management falters or becomes biased, it's in the power of users
	to create and modify their own copies of the project. (Though I hope you'll find we do a good job -- maintaining and moderating -- making this not necessary!)

More info on open-source projects: <https://opensource.com/resources/what-open-source>  
This project's GitHub repo (source code): <https://github.com/Venryx/DebateMap>
`;

let demoRootNodeID = devEnv ? 1 : 463; // hard-coded for now
let demoMap = {_id: -100, name: "Demo", type: MapType.Personal, rootNode: demoRootNodeID} as Map;
export var DemoMap_mapView: MapView = {rootNodeViews: {
	[demoRootNodeID]: {
		expanded: true,
	}
}};

/*if (devEnv) {
	demoMap = {_id: -100, name: "Demo", type: MapType.Personal, rootNode: -101} as Map;
	let lastNodeID = -100;
	let NextID = ()=>--lastNodeID;
	var demoRootNode_override = new MapNode({_id: -101, type: MapNodeType.MultiChoiceQuestion, creator: "[demo]",
		titles: {base: "Is the earth spherical?"},
		children: [
			new MapNode({_id: NextID(), type: MapNodeType.SupportingArgument, creator: "[demo]",
				titles: {base: "Shadow during lunar eclipses"},
				children: [
					new MapNode({_id: NextID(), type: MapNodeType.Thesis, creator: "[demo]",
						titles: {base: "The earth always casts a spherical shadow on the moon during lunar eclipses"}
					}),
					new MapNode({_id: NextID(), type: MapNodeType.Thesis, creator: "[demo]",
						titles: {base: "If the earth were flat, it would sometimes cast an oblong shadow on the moon during lunar eclipses"},
						children: [
							new MapNode({_id: NextID(), type: MapNodeType.SupportingArgument, creator: "[demo]",
								titles: {base: "When near horizon"},
								children: [
									new MapNode({_id: NextID(), type: MapNodeType.Thesis, creator: "[demo]",
										titles: {base: `Lunar eclipses sometimes happen when the moon is near the horizon`}
									}),
									new MapNode({_id: NextID(), type: MapNodeType.Thesis, creator: "[demo]",
										titles: {base: "If the earth were flat, and the moon near the horizon (during a lunar eclipse), the earth would cast an oblong shadow"},
									}),
								]
							}),
						]
					}),
				]
			}),
			new MapNode({_id: NextID(), type: MapNodeType.SupportingArgument, creator: "[demo]",
				titles: {base: "Ships and the horizon"},
				children: [
					new MapNode({_id: NextID(), type: MapNodeType.Thesis, creator: "[demo]",
						titles: {base: `As a ship first comes into view, only its top is visible (with the rest appearing as it comes closer)`}
					}),
					new MapNode({_id: NextID(), type: MapNodeType.Thesis, creator: "[demo]",
						titles: {base: "If the earth were flat, as a ship first came into view, it would be visible in its entirety (with it simply fading in)"}
					}),
				]
			}),
			new MapNode({_id: NextID(), type: MapNodeType.SupportingArgument, creator: "[demo]",
				titles: {base: "Constellations"},
				children: [
					new MapNode({_id: NextID(), type: MapNodeType.Thesis, creator: "[demo]",
						titles: {base: `The constellations that are visible change depending on what part of the earth you observe from`}
					}),
					new MapNode({_id: NextID(), type: MapNodeType.Thesis, creator: "[demo]",
						titles: {base: "If the earth were flat, the constellations that are visible would remain the same anywhere on earth"}
					}),
				]
			}),
		]
	});
}*/

@Connect(state=> ({
	demoRootNode: GetNode(demoRootNodeID),
}))
export default class HomeUI2 extends BaseComponent<{demoRootNode: MapNode}, {}> {
	static contextTypes = {
		router: PropTypes.shape({
			history: PropTypes.shape({
				push: PropTypes.func.isRequired,
				replace: PropTypes.func.isRequired,
				createHref: PropTypes.func.isRequired
			}).isRequired
		}).isRequired
	};
	render() {
		let {demoRootNode} = this.props;
		/*if (demoRootNode_override) // for dev
			demoRootNode = demoRootNode_override;*/
		let {router} = this.context;
		return (
			<VReactMarkdown className="selectable Markdown" source={pageText}
				containerProps={{style: E(styles.page)}}
				renderers={{
					Paragraph: props=> {
						if (DeepGet(props, "children.0.props.literal") == "GlobalMapPlaceholder")
							return <div {...props.Excluding("literal", "nodeKey")}>{props.children}</div>;
						//return React.createElement(g.Markdown_defaultRenderers.paragraph, props);
						return <p {...props.Excluding("literal", "nodeKey")}>{props.children}</p>;
					},
					Text: props=> {
						if (props.literal == "GlobalMapPlaceholder") {
							return (
								<div style={{margin: "0 -50px", /*height: 500,*/ userSelect: "none"}}>
									<style>{`.DemoMap * { user-select: none; }`}</style>
									<MapUI className="DemoMap" map={demoMap} rootNode={demoRootNode} padding={{left: 200, right: 500, top: 100, bottom: 100}} withinPage={true}>
										{/*<div style={{position: "absolute", right: "calc(100% + 50px)", top: 0, width: 5000, height: "100%", background: "rgba(0,0,0,.75)"}}/>
										<div style={{position: "absolute", left: "calc(100% + 50px)", top: 0, width: 5000, height: "100%", background: "rgba(0,0,0,.75)"}}/>*/}
									</MapUI>
								</div>
							);
						}
						//return <span {...props}>{props.literal}</span>;
						//return React.DOM.span(null, props.literal, props);
						//return React.createElement("section", props.Excluding("literal", "nodeKey"), props.literal);
						return "[text]" as any;
					},
					Link: props=> {
						let {href, nodeKey, children, literal, ...rest} = props;
						return (
							<a {...rest} href={href} key={nodeKey} onClick={e=> {
								//let fullURL = href.Contains("://") ? href : GetUrlParts()[0] + "/" + href;
								let fullURL = ToAbsoluteUrl(href);
								let toURLParts = GetUrlParts(fullURL);
								let currentURLParts = GetUrlParts();
								if (toURLParts[0] == currentURLParts[0]) { // if domain names same
									e.preventDefault();

									if (href.startsWith("#")) {
										JumpToHash(href.substr(1));
										//document.getElementById(h).scrollIntoView();   //Even IE6 supports this
										return;
									}

									//let history = State().router.history;
									let history = router.history;
									if (toURLParts[1] == currentURLParts[1]) // if paths same
										history.replace(href);
									else
										history.push(href);
								}
							}}>
								{children}
							</a>
						);
					}
				}}
			/>
		);
	}
}