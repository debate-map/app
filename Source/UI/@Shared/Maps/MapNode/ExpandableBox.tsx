import {Button, Row} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";

type Props = {
	parent?,
	className?: string, width: number, widthOverride: number, innerWidth?: number, outlineColor?: string, padding: number | string, style, onClick?,
	backgroundFillPercent: number, backgroundColor: Color, markerPercent: number,
	text, onTextHolderClick?, beforeChildren?, afterChildren?,
	expanded: boolean, toggleExpanded: Function,
};
export class ExpandableBox extends BaseComponent<Props, {}> {
	static ValidateProps(props: Props) {
		let {backgroundFillPercent} = props;
		Assert(backgroundFillPercent >= 0 && backgroundFillPercent <= 100, "Background fill-percent must be between 0 and 100.");
	}
	
	parent;
	textHolder: HTMLDivElement;
	expandButton: Button;
	render() {
		let {parent,
			className, width, widthOverride, innerWidth, outlineColor, padding, style, onClick,
			backgroundFillPercent, backgroundColor, markerPercent,
			text, onTextHolderClick, beforeChildren, afterChildren,
			expanded, toggleExpanded} = this.props;
		this.parent = parent; // probably temp; used to access NodeUI_Inner comp's props, from MapUI.FindNodeBox
			
		return (
			<div className={className}
					style={E({
						display: "flex", position: "relative", borderRadius: 5, cursor: "default",
						width, minWidth: widthOverride,
						boxShadow: "rgba(0,0,0,1) 0px 0px 2px" + (outlineColor ? `, rgba(${outlineColor},1) 0px 0px 1px` : "").repeat(6),
					}, style)}
					onClick={onClick}>
				{beforeChildren}
				<Row style={{alignItems: "stretch", width: innerWidth || "100%", borderRadius: 5, cursor: "pointer"}}>
					<div ref={c=>this.textHolder = c} style={{position: "relative", width: "calc(100% - 17px)", padding,
						//overflow: "hidden" // let it overflow for now, until we have proper handling for katex-overflowing
					}} onClick={onTextHolderClick}>
						<div style={{
							position: "absolute", left: 0, top: 0, bottom: 0,
							width: backgroundFillPercent + "%", background: backgroundColor.css(), borderRadius: "5px 0 0 5px",
						}}/>
						<div style={{
							position: "absolute", right: 0, top: 0, bottom: 0,
							width: (100 - backgroundFillPercent) + "%", background: `rgba(0,0,0,.7)`, borderRadius: backgroundFillPercent <= 0 ? "5px 0 0 5px" : 0,
						}}/>
						{markerPercent != null &&
							<div style={{
								position: "absolute", left: markerPercent + "%", top: 0, bottom: 0,
								width: 2, background: "rgba(0,255,0,.5)",
							}}/>}
						{text}
					</div>
					<Button ref={c=>this.expandButton = c}
						text={expanded ? "-" : "+"} //size={28}
						style={{
							display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
							width: 17, //minWidth: 18, // for some reason, we need min-width as well to fix width-sometimes-ignored issue
							padding: 0,
							fontSize: expanded ? 23 : 17,
							lineHeight: "1px", // keeps text from making meta-theses too tall
							backgroundColor: backgroundColor.Mix("black", .2).alpha(.9).css(),
							border: "none",
							":hover": {backgroundColor: backgroundColor.Mix("black", .1).alpha(.9).css()},
						}}
						onClick={toggleExpanded}/>
				</Row>
				{afterChildren}
			</div>
		);
	}
}