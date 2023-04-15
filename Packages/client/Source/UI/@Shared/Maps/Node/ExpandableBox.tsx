import {Button, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, cssHelper} from "web-vcore/nm/react-vextensions.js";
import {Assert, E} from "web-vcore/nm/js-vextensions.js";
import React from "react";
import {Chroma_Mix} from "Utils/ClassExtensions/CE_General";
import {liveSkin} from "Utils/Styles/SkinManager";
import {ES} from "web-vcore";
import {BorderRadiusCSS as CSSForCorners} from "Utils/UI/General";

type Props = {
	parent?,
	className?: string, width: number|string|n,
	widthOverride?: number|n, // is this still needed?
	innerWidth?: number, outlineColor?: chroma.Color|n, outlineThickness?: number|n, roundedTopLeftCorner?: boolean, padding: number | string, style?, onClick?, onDirectClick?, onMouseEnter?: Function, onMouseLeave?: Function,
	backgroundFillPercent: number, backgroundColor: chroma.Color, markerPercent: number|n,
	text, onTextHolderClick?, textHolderStyle?,
	beforeChildren?, afterChildren?,
	expanded: boolean, toggleExpanded: (event: React.MouseEvent<any>)=>any, expandButtonStyle?,
};
export class ExpandableBox extends BaseComponent<Props, {}> {
	static defaultProps = {outlineThickness: 1, roundedTopLeftCorner: true};
	static ValidateProps(props: Props) {
		const {backgroundFillPercent} = props;
		Assert(backgroundFillPercent >= 0 && backgroundFillPercent <= 100, "Background fill-percent must be between 0 and 100.");
	}

	parent;
	textHolder: HTMLDivElement|n;
	expandButton: Button|n;
	render() {
		const {parent,
			className, width, widthOverride, innerWidth, outlineColor, outlineThickness, roundedTopLeftCorner, padding, style, onClick, onDirectClick, onMouseEnter, onMouseLeave,
			backgroundFillPercent, backgroundColor, markerPercent,
			text, onTextHolderClick, textHolderStyle, beforeChildren, afterChildren,
			expanded, toggleExpanded, expandButtonStyle, ...rest} = this.props;
		this.parent = parent; // probably temp; used to access NodeUI_Inner comp's props, from MapUI.FindNodeBox

		const {key, css} = cssHelper(this);
		return (
			<div className={key("ExpandableBox", className)}
				style={css({
					display: "flex", position: "relative", borderRadius: CSSForCorners(5, {tl: roundedTopLeftCorner}), cursor: "default",
					//width, minWidth: widthOverride,
					width: widthOverride ?? width,
					boxShadow: `rgba(0,0,0,.5) 0px 0px 2px${(outlineColor ? `, ${outlineColor.css()} 0px 0px ${outlineThickness}px` : "").repeat(6)}`,
				}, style)}
				onClick={onClick} onMouseEnter={onMouseEnter as any} onMouseLeave={onMouseLeave as any} {...rest}>
				{beforeChildren}
				<Row className={key("ExpandableBox_mainContent")}
					style={css({alignItems: "stretch", width: innerWidth || "100%", borderRadius: CSSForCorners(5, {tl: roundedTopLeftCorner}), cursor: "pointer"})}
					onClick={onDirectClick}
				>
					<div ref={c=>this.textHolder = c} onClick={onTextHolderClick} style={ES(
						{
							position: "relative", width: "calc(100% - 17px)", padding,
							// overflow: "hidden" // let it overflow for now, until we have proper handling for katex-overflowing
						},
						textHolderStyle,
					)}>
						<div style={{
							position: "absolute", left: 0, top: 0, bottom: 0,
							width: `${backgroundFillPercent}%`, borderRadius: CSSForCorners(5, {tl: roundedTopLeftCorner, tr: false, br: false, bl: true}),
							background: backgroundColor.css("hsl"), // outputting as hsl makes it easier to test variants in dev-tools
						}}/>
						<div style={{
							position: "absolute", right: 0, top: 0, bottom: 0,
							width: `${100 - backgroundFillPercent}%`, background: liveSkin.OverlayPanelBackgroundColor().css(), borderRadius: backgroundFillPercent <= 0 ? "5px 0 0 5px" : 0,
						}}/>
						{markerPercent != null &&
							<div style={{
								position: "absolute", left: `${markerPercent}%`, top: 0, bottom: 0,
								width: 2, background: "rgba(0,255,0,.5)",
							}}/>}
						{text}
						{/* children */}
					</div>
					<Button ref={c=>this.expandButton = c}
						text={expanded ? "-" : "+"} // size={28}
						style={css(
							{
								display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
								width: 17, // minWidth: 18, // for some reason, we need min-width as well to fix width-sometimes-ignored issue
								padding: 0,
								fontSize: expanded ? 23 : 17,
								lineHeight: "1px", // keeps text from making meta-theses too tall
								backgroundColor: Chroma_Mix(backgroundColor, "black", 0.2).alpha(0.9).css(),
								border: "none",
								color: liveSkin.NodeTextColor().css(),
								":hover": {backgroundColor: Chroma_Mix(backgroundColor, "black", 0.1).alpha(0.9).css()},
							},
							expandButtonStyle,
						)}
						onClick={toggleExpanded}/>
				</Row>
				{afterChildren}
			</div>
		);
	}
}