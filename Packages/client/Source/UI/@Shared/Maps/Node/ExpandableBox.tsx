import {Button, Div, Row} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent, cssHelper} from "web-vcore/nm/react-vextensions.js";
import {Assert, E} from "web-vcore/nm/js-vextensions.js";
import React from "react";
import {Chroma_Mix} from "Utils/ClassExtensions/CE_General";
import {liveSkin} from "Utils/Styles/SkinManager";
import {ES, Observer, RunInAction_Set} from "web-vcore";
import {BorderRadiusCSS as CSSForCorners} from "Utils/UI/General";
import {store} from "Store";
import {TourDot} from "UI/@Shared/TourUI/TourDot";
import {SubscriptionLevel} from "dm_common";
import {NodeBox} from "./NodeBox";
import {NOTIFICATION_BELL_WIDTH} from "./NodeLayoutConstants.js";

type Props = {
	parent?,
	className?: string, width: number|string|n,
	widthOverride?: number|n, // is this still needed?
	innerWidth?: number, outlineColor?: chroma.Color|n, outlineThickness?: number|n, roundedTopLeftCorner?: boolean, padding: number | string, style?, onClick?, onDirectClick?, onMouseEnter?: Function, onMouseLeave?: Function,
	backgroundFillPercent: number, backgroundColor: chroma.Color, markerPercent: number|n,
	text, onTextHolderClick?, textHolderStyle?,
	beforeChildren?, afterChildren?,
	expanded: boolean, toggleExpanded: (event: React.MouseEvent<any>)=>any, expandButtonStyle?, isExpandButtonForNodeChildren: boolean,
	showNotificationButton?: boolean,
	notificationLevel: SubscriptionLevel,
	onToggleNotifications?: ()=>void;
};

@Observer
export class ExpandableBox extends BaseComponent<Props, {}> {
	static defaultProps = {outlineThickness: 1, roundedTopLeftCorner: true, showNotificationButton: false, notificationLevel: "none"};
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
			expanded, toggleExpanded, expandButtonStyle, isExpandButtonForNodeChildren, showNotificationButton, onToggleNotifications, notificationLevel, ...rest} = this.props;
		this.parent = parent; // probably temp; used to access NodeBox comp's props, from MapUI.FindNodeBox
		//const forNodeBox = parent instanceof NodeBox;

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
							paddingRight: showNotificationButton ? NOTIFICATION_BELL_WIDTH : undefined,
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
						{showNotificationButton &&
						<Div style={css({
							position: "absolute", right: 0, bottom: 0,
							display: "flex", alignItems: "flex-end", justifyContent: "center",
							":hover": {
								padding: 3,
							},
						})}>
							<button style={css({display: "inline-flex", background: "none", padding: "8px 2px", border: "none", cursor: "pointer"})} onClick={e=>{
								e.stopPropagation();
								e.preventDefault();
								if (onToggleNotifications) {
									onToggleNotifications();
								}
							}}>
								{notificationLevel === "none" &&
								<svg width="11px" height="11px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M14 21H10M8.63306 3.03371C9.61959 2.3649 10.791 2 12 2C13.5913 2 15.1174 2.63214 16.2426 3.75736C17.3679 4.88258 18 6.4087 18 8C18 10.1008 18.2702 11.7512 18.6484 13.0324M6.25867 6.25723C6.08866 6.81726 6 7.40406 6 8C6 11.0902 5.22047 13.206 4.34966 14.6054C3.61513 15.7859 3.24786 16.3761 3.26132 16.5408C3.27624 16.7231 3.31486 16.7926 3.46178 16.9016C3.59446 17 4.19259 17 5.38885 17H17M21 21L3 3" stroke="#D7D9DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
								</svg>}
								{notificationLevel === "partial" &&
								<svg width="11px" height="11px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M9.35419 21C10.0593 21.6224 10.9856 22 12 22C13.0145 22 13.9407 21.6224 14.6458 21M18 8C18 6.4087 17.3679 4.88258 16.2427 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.8826 2.63214 7.75738 3.75736C6.63216 4.88258 6.00002 6.4087 6.00002 8C6.00002 11.0902 5.22049 13.206 4.34968 14.6054C3.61515 15.7859 3.24788 16.3761 3.26134 16.5408C3.27626 16.7231 3.31488 16.7926 3.46179 16.9016C3.59448 17 4.19261 17 5.38887 17H18.6112C19.8074 17 20.4056 17 20.5382 16.9016C20.6852 16.7926 20.7238 16.7231 20.7387 16.5408C20.7522 16.3761 20.3849 15.7859 19.6504 14.6054C18.7795 13.206 18 11.0902 18 8Z" stroke="#D7D9DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
								</svg>}
								{notificationLevel === "all" &&
								<svg width="11px" height="11px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
									<path d="M9.35442 21C10.0596 21.6224 10.9858 22 12.0002 22C13.0147 22 13.9409 21.6224 14.6461 21M2.29414 5.81989C2.27979 4.36854 3.06227 3.01325 4.32635 2.3M21.7024 5.8199C21.7167 4.36855 20.9342 3.01325 19.6702 2.3M18.0002 8C18.0002 6.4087 17.3681 4.88258 16.2429 3.75736C15.1177 2.63214 13.5915 2 12.0002 2C10.4089 2 8.88283 2.63214 7.75761 3.75736C6.63239 4.88258 6.00025 6.4087 6.00025 8C6.00025 11.0902 5.22072 13.206 4.34991 14.6054C3.61538 15.7859 3.24811 16.3761 3.26157 16.5408C3.27649 16.7231 3.31511 16.7926 3.46203 16.9016C3.59471 17 4.19284 17 5.3891 17H18.6114C19.8077 17 20.4058 17 20.5385 16.9016C20.6854 16.7926 20.724 16.7231 20.7389 16.5408C20.7524 16.3761 20.3851 15.7859 19.6506 14.6054C18.7798 13.206 18.0002 11.0902 18.0002 8Z" stroke="#D7D9DA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
								</svg>}
							</button>
						</Div>}
					</div>
					<Button ref={c=>this.expandButton = c}
						text={<>
							{/*expanded ? "-" : "+"*/}
							{expanded ? "<" : ">"}
							{!expanded && isExpandButtonForNodeChildren &&
							<TourDot stateKey="nodeUI_expandButton" text={`Click ">" below to expand the children nodes.`}/>}
						</>} // size={28}
						style={css(
							{
								zIndex: 5,
								display: "flex", justifyContent: "center", alignItems: "center", borderRadius: "0 5px 5px 0",
								width: 17, // minWidth: 18, // for some reason, we need min-width as well to fix width-sometimes-ignored issue
								padding: 0,
								//fontSize: expanded ? 23 : 17, // for +/-
								fontSize: 14, fontWeight: "bold", // for arrows
								lineHeight: "1px", // keeps text from making meta-theses too tall
								backgroundColor: Chroma_Mix(backgroundColor, "black", 0.2).alpha(0.9).css(),
								border: "none",
								color: liveSkin.NodeTextColor().css(),
								":hover": {backgroundColor: Chroma_Mix(backgroundColor, "black", 0.1).alpha(0.9).css()},
							},
							expandButtonStyle,
						)}
						onClick={e=>{
							if (!expanded && isExpandButtonForNodeChildren && store.main.guide.tourDotStates.nodeUI_expandButton == null) {
								RunInAction_Set(this, ()=>store.main.guide.tourDotStates.nodeUI_expandButton = Date.now());
							}
							return toggleExpanded(e);
						}}/>
				</Row>
				{afterChildren}
			</div>
		);
	}
}