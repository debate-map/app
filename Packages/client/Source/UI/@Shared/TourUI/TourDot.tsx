import {useEffect, useRef, useState} from "react";
import {store} from "Store";
import {TourDotClicks} from "Store/main/guide";
import {SLMode} from "UI/@SL/SL";
import {zIndexes} from "Utils/UI/ZIndexes";
import {RunInAction_Set} from "web-vcore";
import {Row} from "react-vcomponents";
import {AddGlobalStyle} from "react-vextensions";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

AddGlobalStyle(`
	.pulsating-circle {
		position: absolute;
		left: 50%;
		top: 50%;
		transform: translateX(-50%) translateY(-50%);

		/*&:before {*/
		& span {
			content: '';
			position: relative;
			display: block;
			width: 300%;
			height: 300%;
			box-sizing: border-box;
			margin-left: -100%;
			margin-top: -100%;
			border-radius: 45px;
			background-color: #01a4e9;
			animation: pulse-ring 1.25s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
		}

		&:after {
		/*& span {*/
			content: '';
			position: absolute;
			left: 0;
			top: 0;
			display: block;
			width: 100%;
			height: 100%;
			background-color: hsla(205,100%,75%,1);
			border: 1px solid rgba(0,0,0,.3);
			border-radius: 15px;
			box-shadow: 0 0 8px rgba(0,0,0,.3);
			/*animation: pulse-dot 1.25s cubic-bezier(0.455, 0.03, 0.515, 0.955) -.4s infinite;*/
		}
	}

	@keyframes pulse-ring {
		0% {
			transform: scale(.33);
		}
		80%, 100% {
			opacity: 0;
		}
	}

	@keyframes pulse-dot {
		0% {
			transform: scale(.8);
		}
		50% {
			transform: scale(1);
		}
		100% {
			transform: scale(.8);
		}
	}
`);
if (SLMode) {
	AddGlobalStyle(`
		.pulsating-circle {
			&:after {
				background-color: #E7F5FF;
				border: 2px solid #3C87B8;
			}
		}
	`);
}

export type TourDotProps = {
	stateKey: keyof TourDotClicks,
	text: string,
	dotSize?: number
};

export const TourDot = observer_mgl((props: TourDotProps)=>{
	const {stateKey, text, dotSize = 10} = props;
	const uiState = store.main.guide.tourDotStates;

	const [popupOpen, setPopupOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	// if already completed and popup not currently open, render nothing
	if (uiState[stateKey] != null && !popupOpen) return null;

	useEffect(()=>{
		// only use this effect when tour-entry popup is open
		if (!popupOpen) return;

		const listener = (e: MouseEvent)=>{
			// if this tour-entry has already been opened, and then user clicks somewhere outside of its popup, consider the entry "read", and thus mark it as "completed"
			if (!e.composedPath().includes(containerRef.current as any)) {
				setPopupOpen(false);
			}
		};

		document.addEventListener("click", listener);
		return ()=>document.removeEventListener("click", listener);
	}, [popupOpen]);

	return (
		<>
			<div
				style={{
					position: "absolute", top: 0, right: 0,
					cursor: "help",
				}}
				title="Click to show tip. (and hide dot)"
				onClick={e=>{
					setPopupOpen(true);
					RunInAction_Set(()=>store.main.guide.tourDotStates[stateKey] = Date.now());
					// stop propagation, so that the click doesn't trigger the parent's onClick
					e.stopPropagation();
					return false;
				}}
			>
				<div className="pulsating-circle" style={{width: dotSize, height: dotSize}}>
					<span onAnimationStart={e=>{
						// keep all animations in-sync, by locking their "start time" to 0
						e.currentTarget.getAnimations().forEach(a=>a.startTime = 0);
					}}/>
				</div>
			</div>
			{popupOpen &&
			<Row
				style={{
					position: "absolute", left: "100%", bottom: "100%", zIndex: zIndexes.tourDotPopup,
					lineHeight: "initial", // needed to fix "height:1px" issue that otherwise happens when TourDot is "inside" a Button's "text" contents
					background: "rgba(255,255,255,.7)", borderRadius: 5, color: "black",
					fontSize: 12, padding: 5, whiteSpace: "normal", maxWidth: 200,
					// reset some stylings that parent components may have set (eg. ExpandableBox sets {fontWeight:bold})
					fontWeight: "initial",
					// fsr,"max-content" is needed here (in some contexts, eg. in Button's "text"), in order to have the div actually expand to the max-width for long content (else, only expands enough for largest word/line)
					width: "max-content",
				}}
				onClick={e=>{
					// stop propagation, so that the click doesn't trigger the parent's onClick
					e.stopPropagation();
					return false;
				}}
			>
				{text}
			</Row>}
		</>
	);
});
