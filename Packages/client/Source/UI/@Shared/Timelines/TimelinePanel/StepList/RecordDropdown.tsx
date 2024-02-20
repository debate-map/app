import {store} from "Store";
import {GetOpenMapID} from "Store/main";
import {GetMapState} from "Store/main/maps/mapStates/$mapState";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {Map, GetMap, GetTimelineSteps, GetTimelineStepsReachedByTimeX} from "dm_common";
import {Assert, DeepEquals, ShallowEquals, SleepAsync, Timer, VRect, WaitXThenRun} from "js-vextensions";
import React from "react";
import {AddNotificationMessage, Observer, RunInAction_Set} from "web-vcore";
import {Button, CheckBox, Column, DropDown, DropDownContent, DropDownTrigger, Row, Spinner, Text} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {MapState} from "Store/main/maps/mapStates/@MapState.js";
import {ScreenshotModeCheckbox} from "UI/@Shared/Maps/MapUI/ActionBar_Right/LayoutDropDown.js";
import {GetPlaybackTime} from "Store/main/maps/mapStates/PlaybackAccessors/Basic.js";
import {desktopBridge} from "Utils/Bridge/Bridge_Desktop.js";
import {StepList} from "../StepList.js";

@Observer
export class RecordDropdown extends BaseComponent<{}, {}> {
	render() {
		const uiState = store.main.timelines.recordPanel;
		return (
			<DropDown>
				<DropDownTrigger><Button text="Record" style={{height: "100%"}}/></DropDownTrigger>
				<DropDownContent style={{right: 0, width: 400, zIndex: zIndexes.subNavBar}}><Column>
					<Row>
						<Text style={{whiteSpace: "pre-wrap"}}>{`
						Notes:
						* Before starting, ensure you're in Firefox, with the debate-map chrome-extension installed, and "all-urls access" enabled. (chrome has severe rate-limiting on screenshots, and all-urls access is required atm for firefox to take screenshots)
						* Before starting, enable "screenshot mode" using the checkbox below; this will hide the scrollbars and such, for a clean recording.
						* To start recording, enable "Start recording" below; to stop recording, disable it. (or press "p" on your keyboard)
						`.AsMultiline(0)}</Text>
					</Row>
					<Row>
						<ScreenshotModeCheckbox text="Screenshot mode:"/>
					</Row>
					<Row>
						<CheckBox text="Locked map-ui size:" value={uiState.lockedMapSize} onChange={val=>RunInAction_Set(this, ()=>uiState.lockedMapSize = val)}/>
						<Text ml={5}>X:</Text>
						<Spinner ml={5} value={uiState.lockedMapSize_x} onChange={val=>RunInAction_Set(uiState, ()=>uiState.lockedMapSize_x = val)}/>
						<Text ml={5}>Y:</Text>
						<Spinner ml={5} value={uiState.lockedMapSize_y} onChange={val=>RunInAction_Set(uiState, ()=>uiState.lockedMapSize_y = val)}/>
					</Row>
					<Row>
						<Text>Start recording:</Text>
						<CheckBox ml={5} value={uiState.recording} onChange={val=>(uiState.recording ? this.StopRecording() : this.StartRecording())}/>
					</Row>
				</Column></DropDownContent>
			</DropDown>
		);
	}
	StartRecording() {
		const uiState = store.main.timelines.recordPanel;
		Assert(!uiState.recording, "Cannot start recording, as already recording.");

		const map = GetMap(GetOpenMapID());
		const mapState = GetMapState(map?.id);
		Assert(map && mapState?.playingTimeline_time != null, "Cannot start recording, as no map is open, or timeline playing panel is not open.");

		RunInAction_Set(this, ()=>uiState.recording = true);
		document.addEventListener("keydown", this.keyHandler);
		this.renderStartTime = Date.now();
		//this.renderFrameTimer.Start();
		this.StartRenderingLoop(map, mapState).catch(error=>{
			AddNotificationMessage(`Got error while doing rendering process: ${error}`);
			this.StopRecording();
		});
	}
	StopRecording() {
		const uiState = store.main.timelines.recordPanel;
		Assert(uiState.recording, "Cannot stop recording, as not recording.");

		//this.renderFrameTimer.Stop();
		document.removeEventListener("keydown", this.keyHandler);
		RunInAction_Set(this, ()=>uiState.recording = false);
	}

	keyHandler = (e: KeyboardEvent)=>{
		if (e.key == "p") {
			if (store.main.timelines.recordPanel.recording) {
				this.StopRecording();
			} /*else {
				this.StartRecording();
			}*/
		}
	};

	renderStartTime = 0;
	async StartRenderingLoop(map: Map, mapState: MapState) {
		const uiState = store.main.timelines;
		while (uiState.recordPanel.recording) {
			if (mapState.playingTimeline_time == null) {
				return void this.StopRecording();
			}
			const currentFrameTime = mapState.playingTimeline_time;

			// wait for current-frame's data to finish rendering in the react tree
			const renderWaitStartTime = Date.now();
			while (uiState.recordPanel.recording) {
				const elementsForFrameRender = document.getElementsByClassName("forFrameRender");
				const elementsForCurrentFrameRender = document.getElementsByClassName(GetClassForFrameRenderAtTime(currentFrameTime));
				const isCurrentFrameFullyRendered = elementsForCurrentFrameRender.length > 0 && elementsForCurrentFrameRender.length == elementsForFrameRender.length;
				if (isCurrentFrameFullyRendered) {
					break;
				} else if (Date.now() - renderWaitStartTime > 5000) {
					console.error("Render-wait loop appears to be stuck. @elementsForFrameRender:", elementsForFrameRender, "@elementsForCurrentFrameRender:", elementsForCurrentFrameRender);
				}
				await SleepAsync(50);
			}

			// capture current frame (this requires that the debate-map chrome-extension is installed)
			let frameCaptured = false;
			while (uiState.recordPanel.recording && !frameCaptured) {
				try {
					await this.CaptureFrame(map.id, currentFrameTime);
					frameCaptured = true;
				} catch (ex) {
					if (ex?.message?.includes("Image size mismatch")) {
						throw ex;
					} else {
						await SleepAsync(50);
					}
				}
			}

			// if we're now past the last frame in the timeline, stop the timer
			const steps = await GetTimelineSteps.Async(mapState.selectedTimeline ?? "n/a");
			const reachedSteps = await GetTimelineStepsReachedByTimeX.Async(mapState.selectedTimeline ?? "n/a", currentFrameTime);
			const justRenderedLastFrame = reachedSteps.length >= steps.length;
			if (justRenderedLastFrame) {
				console.log(`Just rendered last frame (reached step ${reachedSteps.length} of ${steps.length}), so stopping recording.`);
				return void this.StopRecording();
			}

			StepList.instance?.AdjustTargetTimeByFrames(1);
		}
	}

	CaptureFrame(mapID: string, frameTime: number): Promise<void> {
		let resolved = false;
		return new Promise<void>((resolve, reject)=>{
			const frameNumber = GetTimelineTimeAsFrameNumber(frameTime);
			const scrollViewEl = document.querySelector(".MapUI")?.parentElement?.parentElement;
			if (scrollViewEl == null) return void reject(new Error("Could not find map-ui element."));
			const rect = VRect.FromLTWH(scrollViewEl.getBoundingClientRect());

			const message = {
				//type: "DebateMap_CaptureFrame",
				mapID, rect,
				renderStartTime: this.renderStartTime, currentFrameTime: frameTime, currentFrameNumber: frameNumber,
			};
			type Message = typeof message;
			//window.postMessage(message, "*"); // to extension
			desktopBridge.Call("DebateMap_CaptureFrame", message); // to electron

			/*const listener = (event: MessageEvent<any>)=>{
				// We only accept messages from ourselves
				if (event.source != window) return;

				if (event.data?.type == "DebateMap_CaptureFrame_done") {
					if (DeepEquals(event.data.ExcludeKeys("type"), message.ExcludeKeys("type"))) {
						console.log("Finished rendering frame:", frameNumber);
						//window.removeEventListener("message", listener); // from extension
						desktopBridge.UnregisterFunction("DebateMap_CaptureFrame_done", listener); // from electron
						resolved = true;
						resolve();
					}
				}
			};
			window.addEventListener("message", listener); // from extension*/

			const listener = (message2: Message, error?: string)=>{
				if (error != null) {
					console.error("Error occurred during frame capture:", error);
					reject(new Error(error));
					return;
				}

				if (DeepEquals(message2, message)) {
					console.log("Finished rendering frame:", frameNumber);
					desktopBridge.UnregisterFunction("DebateMap_CaptureFrame_done", listener); // from electron
					resolved = true;
					resolve();
				}
			};
			desktopBridge.RegisterFunction("DebateMap_CaptureFrame_done", listener, false); // from electron

			WaitXThenRun(500, ()=>{
				if (resolved) return;
				reject(new Error(`Timed out waiting for frame ${frameNumber} to render.`));
			});
		});
	}
}

export function GetPlaybackTimeAsFrameNumber() {
	const currentFrameTime = GetPlaybackTime();
	if (currentFrameTime == null) return null;
	return GetTimelineTimeAsFrameNumber(currentFrameTime);
}
export function GetTimelineTimeAsFrameNumber(time: number, fps = 60) {
	return (time * fps).RoundTo(1);
}

export function GetClassForFrameRenderAtTime(time: number|n) {
	return `forFrameRender_${time != null ? time.toString().replace(".", "_") : "forFrameRender_na"}`;
}