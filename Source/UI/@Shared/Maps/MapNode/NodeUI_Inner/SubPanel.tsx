import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {VReactMarkdown_Remarkable} from "vwebapp-framework";
import {ImageAttachment} from "Store/firebase/nodeRevisions/@ImageAttachment";
import {MapNode, MapNodeL2} from "../../../../../Store/firebase/nodes/@MapNode";
import {GetFontSizeForNode} from "../../../../../Store/firebase/nodes/$node";
import {QuoteAttachment} from "../../../../../Store/firebase/nodeRevisions/@QuoteAttachment";
import {GetImage} from "../../../../../Store/firebase/images";
import {Image} from "../../../../../Store/firebase/images/@Image";
import {SourcesUI} from "./SourcesUI";

export class SubPanel extends BaseComponent<{node: MapNodeL2}, {}> {
	render() {
		const {node} = this.props;
		return (
			<div style={{position: "relative", margin: "5px -5px -5px -5px", padding: "6px 5px 5px 5px",
				// border: "solid rgba(0,0,0,.5)", borderWidth: "1px 0 0 0"
				background: "rgba(0,0,0,.5)", borderRadius: "0 0 0 5px",
			}}>
				{node.current.quote &&
					<SubPanel_Quote contentNode={node.current.quote} fontSize={GetFontSizeForNode(node)}/>}
				{node.current.image &&
					<SubPanel_Image imageAttachment={node.current.image}/>}
			</div>
		);
	}
}
export class SubPanel_Quote extends BaseComponent<{contentNode: QuoteAttachment, fontSize: number}, {}> {
	render() {
		const {contentNode, fontSize} = this.props;
		return (
			<div style={{position: "relative", fontSize, whiteSpace: "initial"}}>
				{/* <div>{`"${node.quote.text}"`}</div> */}
				{/* <VReactMarkdown className="selectable Markdown" source={`"${contentNode.content}"`}
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
				<VReactMarkdown_Remarkable source={contentNode.content}/>
				<div style={{margin: "3px 0", height: 1, background: "rgba(255,255,255,.3)"}}/>
				<SourcesUI sourceChains={contentNode.sourceChains}/>
			</div>
		);
	}
}

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