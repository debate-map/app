import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {VReactMarkdown_Remarkable, Observer} from "vwebapp-framework";
import {MapNodeL2} from "@debate-map/server-link/Source/Link";
import {GetFontSizeForNode} from "@debate-map/server-link/Source/Link";
import {ReferencesAttachment} from "@debate-map/server-link/Source/Link";
import {QuoteAttachment} from "@debate-map/server-link/Source/Link";
import {ImageAttachment} from "@debate-map/server-link/Source/Link";
import {GetImage} from "@debate-map/server-link/Source/Link";
import {SourcesUI} from "./SourcesUI";

export class SubPanel extends BaseComponent<{node: MapNodeL2}, {}> {
	render() {
		const {node} = this.props;
		return (
			<div style={{position: "relative", margin: "5px -5px -5px -5px", padding: `${node.current.references ? 0 : 6}px 5px 5px 5px`,
				// border: "solid rgba(0,0,0,.5)", borderWidth: "1px 0 0 0"
				background: "rgba(0,0,0,.5)", borderRadius: "0 0 0 5px",
			}}>
				{node.current.references &&
					<SubPanel_References attachment={node.current.references} fontSize={GetFontSizeForNode(node)}/>}
				{node.current.quote &&
					<SubPanel_Quote attachment={node.current.quote} fontSize={GetFontSizeForNode(node)}/>}
				{node.current.image &&
					<SubPanel_Image imageAttachment={node.current.image}/>}
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
							//return React.createElement("section", props.Excluding("literal", "nodeKey"), props.literal);
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
export class SubPanel_Image extends BaseComponentPlus({} as {imageAttachment: ImageAttachment}, {}) {
	render() {
		const {imageAttachment} = this.props;
		const image = GetImage(imageAttachment.id);
		if (image == null) return <div/>;
		return (
			<div style={{position: "relative"}}>
				<img src={image.url} style={{width: image.previewWidth != null ? `${image.previewWidth}%` : null, maxWidth: "100%"}}/>
				<div style={{margin: "3px 0", height: 1, background: "rgba(255,255,255,.3)"}}/>
				<SourcesUI sourceChains={image.sourceChains}/>
			</div>
		);
	}
}