import {BaseComponent} from "../../../../../Frame/UI/ReactGlobals";
import { MapNode, ImageAttachment } from "../../../../../Store/firebase/nodes/@MapNode";
import {GetFontSizeForNode} from "../../../../../Store/firebase/nodes/$node";
import {ContentNode} from "../../../../../Store/firebase/contentNodes/@ContentNode";
import {Connect} from "Frame/Database/FirebaseConnect";
import {GetImage} from "../../../../../Store/firebase/images";
import {Image} from "../../../../../Store/firebase/images/@Image";
import SourcesUI from "./SourcesUI";
import VReactMarkdown_Remarkable from "../../../../../Frame/ReactComponents/VReactMarkdown_Remarkable";

export default class SubPanel extends BaseComponent<{node: MapNode}, {}> {
	render() {
		let {node} = this.props;
		return (
			<div style={{position: "relative", margin: "5px -5px -5px -5px", padding: "6px 5px 5px 5px",
				//border: "solid rgba(0,0,0,.5)", borderWidth: "1px 0 0 0"
				background: "rgba(0,0,0,.5)", borderRadius: "0 0 0 5px",
			}}>
				{node.contentNode &&
					<SubPanel_Quote contentNode={node.contentNode} fontSize={GetFontSizeForNode(node)}/>}
				{node.image &&
					<SubPanel_Image imageAttachment={node.image}/>}
			</div>
		);
	}
}
export class SubPanel_Quote extends BaseComponent<{contentNode: ContentNode, fontSize: number}, {}> {
	render() {
		let {contentNode, fontSize} = this.props;
		return (
			<div style={{position: "relative", fontSize, whiteSpace: "initial"}}>
				{/*<div>{`"${node.quote.text}"`}</div>*/}
				{/*<VReactMarkdown className="selectable Markdown" source={`"${contentNode.content}"`}
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
				/>*/}
				<VReactMarkdown_Remarkable source={contentNode.content}/>
				<div style={{margin: "3px 0", height: 1, background: "rgba(255,255,255,.3)"}}/>
				<SourcesUI sourceChains={contentNode.sourceChains}/>
			</div>
		);
	}
}
type SubPanel_ImageProps = {imageAttachment: ImageAttachment} & Partial<{image: Image}>;
@Connect((state, {imageAttachment}: SubPanel_ImageProps)=> ({
	image: GetImage(imageAttachment.id),
}))
export class SubPanel_Image extends BaseComponent<SubPanel_ImageProps, {}> {
	render() {
		let {image} = this.props;
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