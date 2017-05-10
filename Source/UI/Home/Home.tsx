import {Connect} from "../../Frame/Database/FirebaseConnect";
import {DeepGet} from "../../Frame/V/V";
import {SubNavBarButton} from "../@Shared/SubNavBar";
import SubNavBar from "../@Shared/SubNavBar";
import {BaseComponent, SimpleShouldUpdate, GetInnerComp, FindDOM_, ShallowEquals} from "../../Frame/UI/ReactGlobals";
import VReactMarkdown from "../../Frame/ReactComponents/VReactMarkdown";
import {styles} from "../../Frame/UI/GlobalStyles";
import ScrollView from "react-vscrollview";
import {JumpToHash, ToAbsoluteUrl, URL} from "../../Frame/General/URLs";
import {E} from "../../Frame/General/Globals_Free";
import {List} from "../../Frame/Serialization/VDF/VDFExtras";
import GlobalMapUI from "../Global/GlobalMapUI";
import MapUI from "../@Shared/Maps/MapUI";
import {MapType, Map} from "../../Store/firebase/maps/@Map";
import {MapNode, MapNodeEnhanced} from "../../Store/firebase/nodes/@MapNode";
import {MapNodeType} from "../../Store/firebase/nodes/@MapNodeType";
import {MapView} from "../../Store/main/mapViews/@MapViews";
import {GetNode} from "../../Store/firebase/nodes";
import {Vector2i} from "../../Frame/General/VectorStructs";
import Editor from "react-md-editor";
import * as ReactMarkdown from "react-markdown";
import {GetNodeEnhanced} from "../../Store/firebase/nodes/$node";

let red = `rgba(255,0,0,.7)`;
let green = `rgba(0,255,0,.6)`;
let pageText = `
The Debate Map project is an interactive web platform aimed at improving the efficiency of discussion and debate.
It's crowd-sourced and open-source, and welcomes reader contributions.

Its primary improvements are (in short):
* Restructuring dialogue to make use of both dimensions.
* Breaking down lines of reasoning into single-sentence "nodes".
* Providing rich tools that operate on those nodes -- such as rating, tagging, statistical analysis, and belief-tree sharing and comparison.

Here is a quick example:

GlobalMapPlaceholder

The tree-like structure assists in traversing the various lines of evidence:
	at each level, there is a "thesis" (blue) which makes a claim, and a set of simple "arguments" (green and red) which support/oppose it.
By keeping the forms of these arguments simple, we're able to match them (in many cases) with the basic forms of logical arguments (modus ponens, etc.),
	permitting quick evaluation of the logical connections -- this saves time, and lets us focus on the underlying chain of evidence instead of parsing statement meanings.

## Advantages

### Preserve response context

<span style="color: ${red};">
Problem:</span>
On heated topics, debates often involve many points being made and responded to in each post.
Because traditional dialogue is linear, this creates a large gap between each point and its responses.

<span style="color: ${green};">
Solution:</span>
Make use of both dimensions: have points flow down, and responses flow to the right.
Responses are now directly next to the points they're made against -- easing the reading process.

### Sort the arguments by strength

<span style="color: ${red};">
Problem:</span>
Topics under debate can be large, with dozens of points to consider. Thread-based mediums give no help in finding the strongest ones, forcing you to skim through them all.

<span style="color: ${green};">
Solution:</span>
Provide built-in voting on the strength of each point. Even if you don't agree with the general population, the strongest points will still bubble up near to the top.

### Reduce the power of rhetoric

<span style="color: ${red};">
Problem:</span>
The perception of who "won" a debate often depends more on how skilled the debaters are, than how strongly their views are backed by evidence.

<span style="color: ${green};">
Solution:</span>
Require points to be distilled to their simplest forms. Weasel words, exhaggerations, and other noise become easier to spot and point out. (just add a response right next to it!)

### Don't reinvent the wheel

<span style="color: ${red};">
Problem:</span>
Debates rage across the internet, with the same arguments being made hundreds, even thousands, of times. This means a lot of redundant thought and typing!

<span style="color: ${green};">
Solution:</span>
Break down arguments into their constituent parts, and let each part be connected anywhere in the tree where relevant. Also, provide tools to easily merge duplicates.
	Now whenever a response or other change is made, it becomes visible throughout the tree, wherever the parent point is connected.

### Prevent burying of minority viewpoints

<span style="color: ${red};">
Problem:</span>
Some viewpoints repeatedly encounter resistance whenever attempted to be argued for.
This discourages new ideas from being presented -- and when they are presented, makes it harder for them to be heard,
	as they can be "buried" (or even blocked) by the more numerous majority.

<span style="color: ${green};">
Solution:</span>
Provide a level playing ground, with equal space for both sides: supporting arguments go above the line, and opposing ones below.
	No matter how great the majority, the minority viewpoint maintains its position at the table, allowing its strongest points to be directly compared with those of its opposition.

### No time commitment

<span style="color: ${red};">
Problem:</span>
Engaging in traditional debate can be tiring, because once you start, you're often pulled in and are required to invest hours to provide a fair defense of your viewpoint.
	This discourages many people from contributing at all, leaving debates only for the "hard-core".

<span style="color: ${green};">
Solution:</span>
Because debates and arguments persist in the global debate map, you don't need to "explain it all" for your viewpoint to be fairly represented.
	Instead, you can supply only what you see has not been added yet, letting you contribute often and on many topics.

## Other features

### Fine-grained statistical information

With:
* Beliefs and arguments broken down into their constituent parts.
* Rating and tagging of each piece by users.
* Filtering of the data based on user self-tagging (and other properties).

it becomes possible to do very fine-grained studies of public opinion.

For example, one can now easily answer questions such as:
* How do flat-earthers reconcile the time-zone differences between east and west hemispheres?
* What president would have been elected, if the candidates were voted on by those living in country X?
* Is there any correlation between one's political group, and their preference in mobile phone operating systems?
* How much has support for legal marijuana changed over the past 5 years? And what changes in arguments and argument perceptions correspond with this?

### Detailed worldview sharing

By acting as a global, crowd-sourced tree of theses, communicating your view of the world becomes much faster. Instead of writing instance-specific text
	for each conversation, you can map your views once, and simply form a "remix" of your personal belief tree that is tailored for the conversation at hand.

The conversation can then proceed from that point, with the reasoning behind your views now known and easily referencable in the background.

### Assisted worldview examination

Engaging with a tool that operates on percentages, numbers, and weights makes self-accountability easier to achieve:
	by entering numbers, one is declaring to himself how much he considers his beliefs to be supported, and by what means.
This allows one to then do tool-based analysis on his views, and more easily spot areas of possible bias or unjustified conclusions.

One can then proceed to look more closely at those areas, examining the pool of existing evidence and reasoning,
	and referencing statistics on how the rest of the population considers each piece along the way.

More info on open-source projects: <https://opensource.com/resources/what-open-source>  
This project's GitHub repo (source code): <https://github.com/Venryx/DebateMap>
`;

let demoRootNodeID = devEnv ? 1 : 463; // hard-coded for now
let demoMap = {_id: -100, name: `Demo`, type: MapType.Personal, rootNode: demoRootNodeID} as Map;
export function CreateDemoMapView(): MapView {
	return {rootNodeViews: {
		[demoRootNodeID]: {
			expanded: true,
		}
	}};
}

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

let info = {text: pageText};

@Connect(state=> ({
	demoRootNode: GetNodeEnhanced(GetNode(demoRootNodeID), demoRootNodeID+""),
}))
export default class HomeUI2 extends BaseComponent<{demoRootNode: MapNodeEnhanced}, {}> {
	/*static contextTypes = {
		router: PropTypes.shape({
			history: PropTypes.shape({
				push: PropTypes.func.isRequired,
				replace: PropTypes.func.isRequired,
				createHref: PropTypes.func.isRequired
			}).isRequired
		}).isRequired
	};*/
	static contextTypes = {router: ()=>{}};
	render() {
		let {demoRootNode} = this.props;
		/*if (demoRootNode_override) // for dev
			demoRootNode = demoRootNode_override;*/
		let {router} = this.context;

		/*if (1 == 1) {
			let Change = _=>this.Update();
			return (
				<Editor value={info.text} onChange={val=>Change(info.text = val)} options={{
					scrollbarStyle: `overlay`,
					//viewportMargin: Infinity // temp fix for that it doesn't detect scroll-wheel scrolling
				}}/>
			);
		}*/

		let markdownProps = {
			className: "selectable",
			containerProps: {style: E(styles.page)},
			renderers: {
				Paragraph: Paragraph,
				/*Text: props=> {
					...
					//return <span {...props}>{props.literal}</span>;
					//return React.DOM.span(null, props.literal, props);
					//return React.createElement("section", props.Excluding("literal", "nodeKey"), props.literal);
					return `[text]` as any;
				},*/
				Link: props=>Link(props, router),
			},
		};

		return (
			<article>
				<VReactMarkdown {...markdownProps} source={pageText}
					replacements={{
						"default": (segment, index)=> {
							let containerProps = E(markdownProps.containerProps) as any;
							containerProps.style = E(
								markdownProps.containerProps.style,
								index == 0 && {marginBottom: 0},
								index == 2 && {marginTop: 0},
							);
							return <ReactMarkdown {...markdownProps} source={segment.textParts[0]} containerProps={containerProps}/>;
						},
						"GlobalMapPlaceholder": (segment, index)=> {
							return <GlobalMapPlaceholder demoRootNode={demoRootNode} style={{}}/>;
						}
					}}
				/>
			</article>
		);
	}
}

const Paragraph = props=> {
	if (DeepGet(props, `children.0.props.literal`) == `GlobalMapPlaceholder`) {
		return <div {...props.Excluding(`literal`, `nodeKey`)}>{props.children}</div>;
	}
	//return React.createElement(g.Markdown_defaultRenderers.paragraph, props);
	return <p {...props.Excluding(`literal`, `nodeKey`)}>{props.children}</p>;
};
const Link = (props, router)=> {
	let {href, nodeKey, children, literal, ...rest} = props;
	return (
		<a {...rest} href={href} key={nodeKey} onClick={e=> {
			let currentURL = URL.Current();
			//let fullURL = href.Contains("://") ? href : GetUrlParts()[0] + "/" + href;
			let toURL = URL.Parse(ToAbsoluteUrl(href));
			if (toURL.domain == currentURL.domain) {
				e.preventDefault();

				if (href.startsWith(`#`)) {
					JumpToHash(href.substr(1));
					//document.getElementById(h).scrollIntoView();   //Even IE6 supports this
					return;
				}

				//let history = State().router.history;
				let history = router.history;
				if (ShallowEquals(toURL.pathNodes, currentURL.pathNodes)) { // if paths same
					history.replace(href);
				} else {
					history.push(href);
				}
			}
		}}>
			{children}
		</a>
	);
};

class GlobalMapPlaceholder extends BaseComponent<{demoRootNode: MapNodeEnhanced, style}, {}> {
	render() {
		let {demoRootNode, style} = this.props;
		let root, mapUI: MapUI, test2;
		if (isBot) return <div/>;

		return (
			<div ref={c=>root = FindDOM_(c)} style={{
				//margin: `0 -50px`,
				/*height: 500,*/ userSelect: "none", position: "relative",
				/*borderTop: "5px solid rgba(255,255,255,.3)",
				borderBottom: "5px solid rgba(255,255,255,.3)",*/
			}}>
				<style>{`
				/* since it has less padding to avoid drag-from-unselect-area-to-select-area situation, just disable selection completely */
				.DemoMap * { user-select: none; }

				.DemoMap.draggable > .content { cursor: default !important; /*pointer-events: none;*/ }
				:not(.below) > .in { display: none; }
				.below > .below { display: none; }
				.below .content { pointer-events: none; }
				.DemoMap.draggable .MapUI { pointer-events: initial; cursor: grab; cursor: -webkit-grab; cursor: -moz-grab; }
				.DemoMap.draggable.scrollActive .MapUI { cursor: grabbing !important; cursor: -webkit-grabbing !important; cursor: -moz-grabbing !important; }

				.DemoMap > .scrollTrack { display: none; }
				`}</style>
				
				<MapUI ref={c=>mapUI = c ? GetInnerComp(c) as any : null} className="DemoMap"
					map={demoMap} rootNode={demoRootNode} withinPage={true}
					//padding={{left: 200, right: 500, top: 100, bottom: 100}}
					padding={{left: (screen.availWidth / 2) - 300, right: screen.availWidth, top: 100, bottom: 100}}
				/>
				<div className="in" style={{position: `absolute`, left: 0, right: 0, top: 0, bottom: 0}}
					onMouseEnter={()=>root.removeClass(`below`)} onTouchStart={()=>root.removeClass(`below`)}/>
				<div className="below" style={{position: `absolute`, left: 0, right: 0, top: `100%`, height: 300}}
					onMouseEnter={()=>root.addClass(`below`)} onTouchStart={()=>root.addClass(`below`)}/>
			</div>
		);
	}
}