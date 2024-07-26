import {VURL, E} from "js-vextensions";
import {BaseComponent, ShallowChanged, FilterOutUnrecognizedProps, cssHelper} from "react-vextensions";
import {Remarkable} from "remarkable";
import RemarkableReactRenderer from "remarkable-react";
import React from "react";
import {ParseTextForPatternMatchSegments} from "../General/RegexHelpers.js";
import {GetCurrentURL} from "../URL/URLs.js";
import {Link} from "./Link.js";
import {ReplacementFunc} from "./VReactMarkdown.js";

//import Markdown from "react-remarkable";

/*export class VReactMarkdown_Remarkable extends BaseComponent
		<{source: string, replacements?: {[key: string]: ReplacementFunc}, style?},
		{}> {
	render() {
		let {source, replacements, style, containerProps, renderers, ...rest} = this.props;

		function OnMarkdownMountOrUnmount(comp: Markdown) {
			if (!comp) return;
			//let oldRules = {...c.md.renderer.rules};
			comp.md.renderer.rules.link_open = function(tokens, idx, options, env) {
				//let result = oldRules.link_open(tokens, idx, options, env);
				let url = URL.Parse(tokens[idx].href);
				let openInNewTab = url.domain != GetCurrentURL().domain;

				var title = tokens[idx].title ? ` title="${encodeURIComponent(tokens[idx].title)}"` : "";
				var target = openInNewTab ? ` target="_blank"` : "";
				return `<a href="${encodeURI(tokens[idx].href)}"${title}${target}>`;
			};
			comp.forceUpdate();
		}

		if (replacements) {
			let patterns = replacements.VKeys().map((regexStr, index)=>({name: index+"", regex: new RegExp(regexStr)}));
			let segments = ParseSegmentsForPatterns(source, patterns);
			return (
				<div>
					{segments.map((segment, index)=> {
						if (segment.patternMatched == null) {
							if (replacements.default) {
								return replacements.default(segment, index).VAct(a=>a.key = index);
							}
							return <Markdown {...rest} key={index} container="div" source={segment.textParts[0]} ref={OnMarkdownMountOrUnmount}/>;
						}
						let renderFuncForReplacement = replacements.VValues()[segment.patternMatched];
						return renderFuncForReplacement(segment, index).VAct(a=>a.key = index);
					})}
				</div>
			);
		}

		return <Markdown {...rest} container="dev" source={source} ref={OnMarkdownMountOrUnmount}/>;
	}
}*/

type Props = {
	source: string, markdownOptions?, rendererOptions?,
	replacements?: {[key: string]: ReplacementFunc}, extraInfo?, containerType?, style?, addMarginsForDanglingNewLines?: boolean,
} & React.HTMLProps<HTMLDivElement>;
export class VReactMarkdown_Remarkable extends BaseComponent<Props, {}> {
	static defaultProps = {containerType: "div"};

	markdown: Remarkable;
	InitMarkdown(props) {
		let {extraInfo, markdownOptions, rendererOptions} = props;
		markdownOptions = markdownOptions || {};
		this.markdown = new Remarkable(markdownOptions);

		const rendererOptions_final = {
			...rendererOptions,
			components: {
				// modify links to open in new tab, if they're to external sites
				a: (props=>{
					let {href, target, ...rest} = props;
					const toURL = VURL.Parse(href);
					if (target == "") target = null; // normalize falsy target
					if (target == null && toURL.domain != GetCurrentURL().domain) {
						target = "_blank";
					}
					return <Link {...FilterOutUnrecognizedProps(rest, "a")} to={href} target={target}/>;
				}),

				// disallow images by default (too easy of a means to vandalize; also, can be used to track user IPs)
				img: (props=>{
					const {src, alt, title, ...rest} = props;
					//return <img src={src} alt={alt} title={title} {...rest}/>;
					return null;
				}),

				/*htmlblock: (props=>{
					let {content} = props;
					return <div dangerouslySetInnerHTML={{__html: content}}/>;
				},
				htmltag: (props=>{
					let {content} = props;
					return <span dangerouslySetInnerHTML={{__html: content}}/>;
				}),*/

				...rendererOptions?.components,

				/*tokens: {
					htmlblock: "htmlblock",
					htmltag: "htmltag",
					...rendererOptions?.components?.tokens,
				},*/
			},
		};

		this.markdown.renderer = new RemarkableReactRenderer(rendererOptions_final);
	}

	ComponentWillReceiveProps(props) {
		if (ShallowChanged(props.markdownOptions, this.props.markdownOptions) || ShallowChanged(props.rendererOptions, this.props.rendererOptions)) {
			this.InitMarkdown(props);
		}
	}

	render() {
		const {source, extraInfo, markdownOptions, rendererOptions, replacements, containerType, style, addMarginsForDanglingNewLines, ...rest} = this.props;
		//source = source || this.FlattenedChildren.join("\n\n");
		const {css} = cssHelper(this);

		if (this.markdown == null) {
			this.InitMarkdown(this.props);
		}

		if (replacements) {
			const patterns = replacements.VKeys().map((regexStr, index)=>({name: `${index}`, regex: new RegExp(regexStr)}));
			const segments = ParseTextForPatternMatchSegments(source, patterns);
			if (segments.length > 1) {
				const segmentUIs = segments.map((segment, index)=>{
					if (segment.patternMatches.size == 0) {
						if (replacements.default) {
							return replacements.default(segment, index, extraInfo).VAct(a=>a.key = index.toString());
						}
						const text = segment.text.replace(/\r/g, "");
						return (
							<VReactMarkdown_Remarkable key={index} source={text.trim()} replacements={replacements} extraInfo={extraInfo}
								markdownOptions={markdownOptions} rendererOptions={rendererOptions}
								style={css(addMarginsForDanglingNewLines && {
									marginTop: text.startsWith("\n\n") ? 15 : text.startsWith("\n") ? 5 : 0,
									marginBottom: text.endsWith("\n\n") ? 15 : text.endsWith("\n") ? 5 : 0,
								})}
								addMarginsForDanglingNewLines={addMarginsForDanglingNewLines}/>
						);
					}
					const mainPatternMatched = [...segment.patternMatches.keys()][0];
					const renderFuncForReplacement = replacements.VValues()[mainPatternMatched.name] as ReplacementFunc;
					return renderFuncForReplacement(segment, index, extraInfo).VAct(a=>a.key = index.toString());
				});
				return React.createElement(containerType, {style}, segmentUIs);
			}
		}

		const markdownResult = this.markdown.render(source);
		return React.createElement(containerType, {...rest, style}, markdownResult);
	}
}