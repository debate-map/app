import {BaseComponent, BaseComponentPlus} from "web-vcore/nm/react-vextensions.js";
import {VReactMarkdown_Remarkable, Observer, YoutubePlayerUI, ParseYoutubeVideoID, HTMLProps_Fixed} from "web-vcore";
import {MapNodeL2, GetFontSizeForNode, ReferencesAttachment, QuoteAttachment, MediaAttachment, GetMedia, MediaType, GetMainAttachment} from "dm_common";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {SourcesUI} from "./SourcesUI.js";

@Observer
export class SubPanel extends BaseComponent<{node: MapNodeL2, toolbarShowing: boolean} & HTMLProps_Fixed<"div">, {}> {
	render() {
		const {node, toolbarShowing, ...rest} = this.props;
		const mainAttachment = GetMainAttachment(node.current);
		return (
			<div {...rest} style={{position: "relative", margin: `5px 0 ${toolbarShowing ? "-5px" : "0"} 0`, padding: `${mainAttachment?.references ? 0 : 6}px 5px 5px 5px`,
				// border: "solid rgba(0,0,0,.5)", borderWidth: "1px 0 0 0"
				background: liveSkin.NodeSubPanelBackgroundColor().css(), borderRadius: "0 0 0 5px",
			}}>
				{mainAttachment?.references &&
					<SubPanel_References attachment={mainAttachment?.references} fontSize={GetFontSizeForNode(node)}/>}
				{mainAttachment?.quote &&
					<SubPanel_Quote attachment={mainAttachment?.quote} fontSize={GetFontSizeForNode(node)}/>}
				{mainAttachment?.media &&
					<SubPanel_Media mediaAttachment={mainAttachment?.media}/>}
			</div>
		);
	}
}

@Observer
export class SubPanel_References extends BaseComponent<{attachment: ReferencesAttachment, fontSize: number}, {}> {
	render() {
		const {attachment, fontSize} = this.props;
		return (
			<div style={{position: "relative", fontSize, whiteSpace: "initial"}}>
				<div style={{margin: "3px 0", height: 1, background: "rgba(255,255,255,.3)"}}/>
				<SourcesUI sourceChains={attachment.sourceChains} headerText="References"/>
			</div>
		);
	}
}

@Observer
export class SubPanel_Quote extends BaseComponent<{attachment: QuoteAttachment, fontSize: number}, {}> {
	render() {
		const {attachment, fontSize} = this.props;
		return (
			<div style={{position: "relative", fontSize, whiteSpace: "initial"}}>
				{/* <div>{`"${node.quote.text}"`}</div> */}
				{/* <VReactMarkdown className="selectable Markdown" source={`"${quoteAttachment.content}"`}
					containerProps={{style: E()}}
					renderers={{
						Text: props=> {
							//return <span {...props}>{props.literal}</span>;
							//return React.DOM.span(null, props.literal, props);
							//return React.createElement("section", props.ExcludeKeys("literal", "nodeKey"), props.literal);
							return "[text]" as any;
						},
						Link: props=><span/>,
					}}
				/> */}
				<VReactMarkdown_Remarkable source={attachment.content}/>
				<div style={{margin: "3px 0", height: 1, background: "rgba(255,255,255,.3)"}}/>
				<SourcesUI sourceChains={attachment.sourceChains}/>
			</div>
		);
	}
}

@Observer
export class SubPanel_Media extends BaseComponentPlus({} as {mediaAttachment: MediaAttachment}, {}) {
	render() {
		const {mediaAttachment} = this.props;
		const media = GetMedia(mediaAttachment.id)!; // nn: db-ref, bail
		const videoID = ParseYoutubeVideoID(media.url);
		return (
			<div style={{position: "relative"}}>
				{/*<Row mt={5} style={{display: "flex", alignItems: "center"}}>*/}
				{media.type == MediaType.image &&
					<img src={media.url} style={{width: mediaAttachment.previewWidth != null ? `${mediaAttachment.previewWidth}%` : undefined, maxWidth: "100%"}}/>}
				{media.type == MediaType.video && <>
					{videoID == null && <div>Invalid YouTube video url: {media.url}</div>}
					{videoID != null && <YoutubePlayerUI videoID={videoID} /*startTime={0}*/ heightVSWidthPercent={.5625}
						onPlayerInitialized={player=>{
							player.GetPlayerUI().style.position = "absolute";
						}}/>}
				</>}
				<div style={{margin: "3px 0", height: 1, background: "rgba(255,255,255,.3)"}}/>
				<SourcesUI sourceChains={mediaAttachment.sourceChains}/>
			</div>
		);
	}
}