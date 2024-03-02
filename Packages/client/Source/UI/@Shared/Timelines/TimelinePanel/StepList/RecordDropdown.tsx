import {store} from "Store";
import {GetOpenMapID} from "Store/main";
import {GetMapState} from "Store/main/maps/mapStates/$mapState";
import {zIndexes} from "Utils/UI/ZIndexes.js";
import {Map, GetMap, GetTimelineSteps, GetTimelineStepsReachedByTimeX, GetTimelineStepTimesFromStart, GetTimeline} from "dm_common";
import {Assert, CopyText, DeepEquals, ShallowEquals, SleepAsync, Timer, VRect, WaitXThenRun} from "js-vextensions";
import React from "react";
import {AddNotificationMessage, Observer, RunInAction_Set, TextPlus} from "web-vcore";
import {Button, CheckBox, Column, DropDown, DropDownContent, DropDownTrigger, Row, Spinner, Text, TextInput} from "web-vcore/nm/react-vcomponents.js";
import {BaseComponent} from "web-vcore/nm/react-vextensions.js";
import {MapState} from "Store/main/maps/mapStates/@MapState.js";
import {FastScrollModeCheckbox, ScreenshotModeCheckbox} from "UI/@Shared/Maps/MapUI/ActionBar_Right/LayoutDropDown.js";
import {GetPlaybackTime} from "Store/main/maps/mapStates/PlaybackAccessors/Basic.js";
import {desktopBridge} from "Utils/Bridge/Bridge_Desktop.js";
import {TimeToString} from "Utils/UI/General.js";
import {OPFS_Map} from "Utils/OPFS/OPFS_Map.js";
import {ShowMessageBox} from "web-vcore/.yalc/react-vmessagebox";
import {OPFSDir_GetFileChildren} from "Utils/OPFS/ElectronOPFS.js";
import {GetTopAudioForStep} from "Utils/OPFS/Map/OPFS_Step.js";
import {StepList} from "../StepList.js";

@Observer
export class RecordDropdown extends BaseComponent<{}, {forcedRerenders: number}> {
	static initialState = {forcedRerenders: 0};
	render() {
		const {forcedRerenders} = this.state;
		const uiState = store.main.timelines.recordPanel;

		const map = GetMap(GetOpenMapID());
		if (map == null) return;
		const mapState = GetMapState(map?.id);
		const timelineID = mapState?.selectedTimeline;
		const timeline = GetTimeline(timelineID);
		if (timeline == null) return;

		// we need these for the ffmpeg "prep" action
		const steps = GetTimelineSteps(timeline.id);
		const stepTimes = GetTimelineStepTimesFromStart(steps);
		const stepTopAudios = steps.map(step=>GetTopAudioForStep(step.id, map.id));

		return (
			<DropDown>
				<DropDownTrigger><Button text="Record" style={{height: "100%"}}/></DropDownTrigger>
				<DropDownContent style={{zIndex: zIndexes.overNavBarDropdown, right: 0, width: 400}}><Column>
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
						<FastScrollModeCheckbox/>
					</Row>
					<Row>
						<CheckBox text="Locked map-ui size:" value={uiState.lockedMapSize} onChange={val=>RunInAction_Set(this, ()=>uiState.lockedMapSize = val)}/>
						<Text ml={5}>X:</Text>
						<Spinner ml={5} value={uiState.lockedMapSize_x} onChange={val=>RunInAction_Set(uiState, ()=>uiState.lockedMapSize_x = val)}/>
						<Text ml={5}>Y:</Text>
						<Spinner ml={5} value={uiState.lockedMapSize_y} onChange={val=>RunInAction_Set(uiState, ()=>uiState.lockedMapSize_y = val)}/>
					</Row>
					<Row>
						<Text>Render folder:</Text>
						<TextInput ml={5} value={uiState.renderFolderName} onChange={val=>RunInAction_Set(this, ()=>uiState.renderFolderName = val)}/>
						<Button ml={5} p="5px 10px" text="Now" onClick={()=>RunInAction_Set(this, ()=>uiState.renderFolderName = TimeToString(Date.now(), true))}/>
						<Button ml={5} p="5px 10px" text="Go" onClick={()=>desktopBridge.Call("OpenMainDataSubfolder", {pathSegments: ["Maps", map!.id, "Renders", uiState.renderFolderName]})}/>
					</Row>
					<Row>
						<Button p="5px 10px" text="Prep" onClick={async()=>{
							const opfsForMap = OPFS_Map.GetEntry(map.id);
							const renderFolder = opfsForMap.GetChildFolder("Renders").GetChildFolder(uiState.renderFolderName);
							const renderFolderHandle = await renderFolder.GetTargetDirectoryHandle_EnsuringExists("create");

							const filenames = [...await OPFSDir_GetFileChildren(renderFolderHandle)].map(a=>a.name);
							const frameFilenames = filenames
								.filter(a=>a.match(/(\d+)\.png/) != null)
								.OrderBy(a=>{
									const match = a.match(/(\d+)\.png/);
									return match ? Number(match[1]) : 0;
								});

							// create an ffmpeg_input.txt file, with the filenames of the images in the given folder
							//const ffmpegInputFile = await folderHandle.getFileHandle("ffmpeg_input.txt", {create: true});
							const inputFileText_images = frameFilenames.map((filename, i)=>{
								const nextFrameFilename = frameFilenames[i + 1] as string|n;
								const durationInFrames = nextFrameFilename ? (nextFrameFilename.match(/(\d+)\.png/)![1].ToInt() - filename.match(/(\d+)\.png/)![1].ToInt()) : 1;
								const durationInSeconds = durationInFrames / 60;
								return `file '${filename}'\nduration ${durationInSeconds}`;
							}).join("\n");
							await renderFolder.SaveFile_Text(inputFileText_images, "ffmpeg_input_images.txt");

							// also add the audio files
							/*const steps_audioFilepaths = steps.map((step, i)=>{
								const topAudio = stepTopAudios[i];
								if (topAudio?.file == null) return null;
								const audioFilename = topAudio.file?.name;
								return `file:../../Step_${step.id}/${audioFilename}`;
							});
							const inputFileText_audios = steps.map((step, i)=>{
								const audioFilepath = steps_audioFilepaths[i];
								if (audioFilepath == null) return null;
								const nextStepWithAudio_i = steps.findIndex((a, i2)=>i2 > i && steps_audioFilepaths[i2] != null);
								const timeTillNextStepWithAudio = nextStepWithAudio_i != -1 ? stepTimes[nextStepWithAudio_i] - stepTimes[i] : step.timeUntilNextStep;
								return [
									`file '${audioFilepath}'`,
									// commented; these don't do what I thought they did (they choose the slice from the file to include, not where to put it in the output file)
									//`inpoint ${stepTimes[i]}`,
									//stepTimes[i + 1] != null && `outpoint ${stepTimes[i + 1]}`,
									`duration ${timeTillNextStepWithAudio}`,
								].filter(a=>a != null).join("\n");
							}).filter(a=>a != null).join("\n");
							await renderFolder.SaveFile_Text(inputFileText_audios, "ffmpeg_input_audios.txt");*/

							ShowMessageBox({
								title: "Prep done", cancelButton: true,
								message: `
									Prep done; saved to ffmpeg_input.txt.
									
									Click OK to open its parent folder, to then inspect that file.
								`.AsMultiline(0),
								onOK: ()=>{
									desktopBridge.Call("OpenMainDataSubfolder", {pathSegments: ["Maps", map!.id, "Renders", uiState.renderFolderName]});
								},
							});
						}}/>
						<Text ml={5}>{`ffmpeg (copy->run):`}</Text>
						<Button ml={5} p="5px 10px" text="Stitch" onClick={()=>{
							const steps_audioFilepaths = steps.map((step, i)=>{
								const topAudio = stepTopAudios[i];
								if (topAudio?.file == null) return null;
								const audioFilename = topAudio.file?.name;
								return `file:../../Step_${step.id}/${audioFilename}`;
							});
							const audioEntries = steps.map((step, i)=>{
								const audioFilepath = steps_audioFilepaths[i];
								if (audioFilepath == null) return null;
								//const nextStepWithAudio_i = steps.findIndex((a, i2)=>i2 > i && steps_audioFilepaths[i2] != null);
								//const timeTillNextStepWithAudio = nextStepWithAudio_i != -1 ? stepTimes[nextStepWithAudio_i] - stepTimes[i] : step.timeUntilNextStep;
								const stepEndTime = steps[i + 1] != null ? stepTimes[i + 1] : stepTimes[i] + (step.timeUntilNextStep ?? 0);
								return {audioFilepath, startAt: stepTimes[i], endAt: stepEndTime, volume: stepTopAudios[i]?.meta?.volume ?? 1};
							}).filter(a=>a != null) as {audioFilepath: string, startAt: number, endAt: number, volume: number}[];

							const audioFilterStrings = audioEntries.map((entry, i)=>{
								const inputLabel = `[${i}]`;
								const subfiltersStr = [
									// note: we use the [adelay] filter since it's most straightforward, but you could also use [itsdelay+aresample] or [anullsrc] approaches
									`adelay=${(entry.startAt * 1000).toFixed(0)}:all=1`, // convert to ms; and apply to all channels (not really needed for current files since mono-channeled, but worth future-proofing)
									entry.volume != 1 && `volume=${entry.volume}`,
								].filter(a=>a).join(",");
								const outputLabel = `[o${i}]`;
								return `${inputLabel}${subfiltersStr}${outputLabel}`;
							});
							const allFilterOutputLabels = audioEntries.map((entry, i)=>`[o${i}]`).join("");
							// if the command errors saying amix has an unknown option, you'll need to update to a newer ffmpeg (~2021+); normalize flag needed as issue fix: https://stackoverflow.com/a/68503794
							audioFilterStrings.push(`${allFilterOutputLabels}amix=inputs=${audioEntries.length}:normalize=0[audioOutput]`);

							const concatOfImages_inputIndex = audioEntries.length;

							// NOTE: This command could exceed the limit of 8191 characters (for cmd.exe), if there are too many audio files.
							// One way to resolve, is to have the command be written to a file, and then tell ffmpeg to read the command from that file. (https://superuser.com/a/1264453)
							// (Some other mitigations could be changing file-name patterns, and/or using powershell, but these just kick the can down the road.)
							CopyText([
								`ffmpeg`, // ffmpeg executable

								// audios
								// ==========

								...audioEntries.map((entry, i)=>`-i '${entry.audioFilepath}'`),
								audioEntries.length > 0 && `-filter_complex "${audioFilterStrings.join("; ")}"`,

								// input approach: file containing list of files (for audios)
								/*`-safe 0`, // accept any filename
								`-f concat`,
								`-i ffmpeg_input_audios.txt`, // use the ffmpeg_input_audios.txt file prepared earlier as the input to ffmpeg*/

								// images
								// ==========

								// input approach: files in folder (could have tried glob approach, but doesn't work on windows)
								//`-i %d.png`, // input files
								//`-r 60`, // input framerate: 60fps

								// input approach: file containing list of files (for images)
								`-safe 0`, // accept any filename
								`-f concat`,
								`-i ffmpeg_input_images.txt`, // use the ffmpeg_input_images.txt file prepared earlier as the input to ffmpeg (needed since there are gaps in the frame filenames)

								// the rest
								// ==========

								// for video output, use input X (result from concat of ...images.txt file)
								// for audio output, use the "audioOutput" stream (result from the filter_complex above)
								`-map ${concatOfImages_inputIndex}:v`,
								audioEntries.length > 0 && `-map "[audioOutput]"`,
								`-codec:v copy`,

								// todo: confirm that this produces a true lossless video (if not, maybe try the recommendation here: https://video.stackexchange.com/a/33681)
								`-c:v libx264`, // use h264 codec
								//`-c:v libx265` // use h265 codec
								`-r 60`, // output framerate: 60fps (slightly increases file-size, and arguably not needed; but kept for now since may increase compatibility?)
								//`-vf fps=60`, // output framerate: 60fps
								`-pix_fmt yuv420p`, // use yuv420p pixel format (supports lossless)
								`-qp 0`, // use lossless encoding
								//`-vf "crop=trunc(iw/2)*2:trunc(ih/2)*2"`, // ensure width/height are even (required for selected format/codec) // commented, since we lock to a valid resolution anyway

								`output.mp4`, // output filename
							].filter(a=>a).join(" "));
						}}/>
						<Button ml={5} p="5px 10px" text="Compress" onClick={()=>{
							CopyText([
								`ffmpeg`,
								`-i output.mp4`,
								`output.webm`,
							].join(" "));
						}}/>
					</Row>
					<Row>
						<Text>Current frame:</Text>
						<Spinner ml={5} enabled={mapState?.playingTimeline_time != null} value={mapState?.playingTimeline_time != null ? GetTimelineTimeAsFrameNumber(mapState.playingTimeline_time) : 0} onChange={val=>{
							//if (mapState?.playingTimeline_time == null) return;
							//if (newTime == -1) return;
							const newTime = GetFrameNumberAsTimelineTime(val);
							StepList.instance?.SetTargetTime(newTime, "setPosition");
						}}/>
						{uiState.recording_endFrame != -1 &&
						<Text>/{uiState.recording_endFrame} (forced rerenders: {forcedRerenders})</Text>}
					</Row>
					<Row>
						<TextPlus info={`Minimum time (in ms) to wait before considering a given frame-render finished. (ie. to save and move past it)`}>Frame min-wait:</TextPlus>
						<Spinner ml={5} value={uiState.frameRender_minWait} onChange={val=>RunInAction_Set(this, ()=>uiState.frameRender_minWait = val)}/>
						<TextPlus ml={5} info={`How many ms of "stability" (ie. unchanging pixels in map-ui viewport) before considering a given frame-render finished. (ie. to save and move past it)`}>Stability-wait:</TextPlus>
						<Spinner ml={5} value={uiState.frameRender_stabilityWait} onChange={val=>RunInAction_Set(this, ()=>uiState.frameRender_stabilityWait = val)}/>
					</Row>
					<Row>
						<Text>Start recording:</Text>
						<CheckBox ml={5} value={uiState.recording} onChange={val=>(uiState.recording ? this.StopRecording() : this.StartRecording())}/>
					</Row>
				</Column></DropDownContent>
			</DropDown>
		);
	}
	async StartRecording() {
		const uiState = store.main.timelines.recordPanel;
		Assert(!uiState.recording, "Cannot start recording, as already recording.");

		const map = GetMap(GetOpenMapID());
		const mapState = GetMapState(map?.id);
		Assert(map && mapState?.playingTimeline_time != null, "Cannot start recording, as no map is open, or timeline playing panel is not open.");

		const steps = await GetTimelineSteps.Async(mapState.selectedTimeline ?? "n/a");
		const stepTimes = await GetTimelineStepTimesFromStart.Async(steps);

		RunInAction_Set(this, ()=>{
			uiState.recording = true;
			uiState.recording_endFrame = GetTimelineTimeAsFrameNumber(stepTimes.LastOrX() ?? 0);
		});
		document.addEventListener("keydown", this.keyHandler);
		//desktopBridge.RegisterFunction("DebateMap_CaptureFrame_forceBrowserRender", this.ForceBrowserRender, false);
		this.renderStartTime = Date.now();
		//this.renderFrameTimer.Start();

		// first send configuration for the rendering process
		const scrollViewEl = document.querySelector(".MapUI")?.parentElement?.parentElement;
		if (scrollViewEl == null) throw new Error("Could not find map-ui element.");
		const rect = VRect.FromLTWH(scrollViewEl.getBoundingClientRect());
		const renderConfig: Render_Config = {
			mapID: map.id, rect, renderFolderName: uiState.renderFolderName,
			frameRender_minWait: uiState.frameRender_minWait, frameRender_stabilityWait: uiState.frameRender_stabilityWait,
		};
		await desktopBridge.Call("DebateMap_FrameCapture_Start", renderConfig);

		// then start the rendering loop
		this.StartRenderingLoop(renderConfig, mapState).catch(error=>{
			AddNotificationMessage(`Got error while doing rendering process: ${error}`);
			this.StopRecording();
		});
	}
	StopRecording() {
		const uiState = store.main.timelines.recordPanel;
		Assert(uiState.recording, "Cannot stop recording, as not recording.");

		//this.renderFrameTimer.Stop();
		document.removeEventListener("keydown", this.keyHandler);
		//desktopBridge.UnregisterFunction("DebateMap_CaptureFrame_forceBrowserRender", this.ForceBrowserRender);
		RunInAction_Set(this, ()=>{
			uiState.recording = false;
			uiState.recording_endFrame = -1;
		});

		desktopBridge.Call("DebateMap_FrameCapture_Stop");
	}

	ForceBrowserRender = ()=>{
		this.SetState({forcedRerenders: (this.state.forcedRerenders ?? 0) + 1});
	};

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
	async StartRenderingLoop(renderConfig: Render_Config, mapState: MapState) {
		const uiState = store.main.timelines;
		while (uiState.recordPanel.recording) {
			if (mapState.playingTimeline_time == null) {
				return void this.StopRecording();
			}
			const currentFrameTime = mapState.playingTimeline_time;
			const currentFrameNumber = GetTimelineTimeAsFrameNumber(currentFrameTime);

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

			// capture current frame (this requires the site to be open in the debate-map electron app)
			let frameCaptured = false;
			while (uiState.recordPanel.recording && !frameCaptured) {
				try {
					await this.CaptureFrame(currentFrameNumber);
					frameCaptured = true;
				} catch (ex) {
					// if we hit a "fatal error", stop the whole rendering loop (else, just show it in console, but continue)
					if (ex?.message?.includes("Image size mismatch")) {
						throw ex;
					} else if (ex?.message?.includes("Did not obtain a valid frame-capture within time-limit.")) {
						// we may just have missed the initial frame-render, so force rerender of ui, such that the backend's frame-render listener can see a new entry
						this.ForceBrowserRender();
						console.error(ex);
						await SleepAsync(50);
					} else {
						console.error(ex);
						await SleepAsync(50);
					}
				}
			}

			// if recording was stopped (during the "await" periods above), break rendering loop now (before code below)
			if (!uiState.recordPanel.recording) break;

			// if we're now past the last frame in the timeline, stop the timer
			const justRenderedLastFrame = currentFrameNumber >= uiState.recordPanel.recording_endFrame;
			if (justRenderedLastFrame) {
				console.log(`Just rendered last frame (reached frame ${currentFrameNumber}), so stopping recording.`);
				return void this.StopRecording();
			}

			StepList.instance?.AdjustTargetTimeByFrames(1);
		}
	}

	CaptureFrame(frameNumber: number): Promise<void> {
		let resolved = false;
		let rejected = false;
		return new Promise<void>((resolve, reject)=>{
			const scrollViewEl = document.querySelector(".MapUI")?.parentElement?.parentElement;
			if (scrollViewEl == null) {
				rejected = true;
				reject(new Error("Could not find map-ui element."));
				return;
			}

			const listener = (renderedFrameNumber: number, error?: string)=>{
				//if (!DeepEquals(message2, message)) {
				if (renderedFrameNumber != frameNumber) {
					console.error("Received frame number doesn't match expected frame number. @received:", renderedFrameNumber, "@expected:", frameNumber);
					return;
				}
				// only remove listener once we receive *our* callback (ie. if we receive a callback for a different frame [as handled above], don't remove our listener yet)
				removeListener();

				//console.log("Received:", renderedFrameNumber, "@error:", error);
				if (error != null) {
					console.error("Error occurred during frame capture:", error);
					rejected = true;
					reject(new Error(error));
					return;
				}

				console.log("Finished rendering frame:", frameNumber);
				resolved = true;
				resolve();
			};
			const removeListener = ()=>desktopBridge.UnregisterFunction("DebateMap_CaptureFrame_done", listener);
			desktopBridge.RegisterFunction("DebateMap_CaptureFrame_done", listener, false); // set up listener
			desktopBridge.Call("DebateMap_CaptureFrame", {currentFrameNumber: frameNumber}); // make call

			// backend has its own "give-up timeout", so wait a long time here before calling it quits (could happen, eg. if an unhandled error occurred -- currently also happens for last frame)
			WaitXThenRun(5000, ()=>{
				if (resolved || rejected) return;
				removeListener(); // once we've given up, don't allow our listener to trigger anymore
				reject(new Error(`Timed out waiting for frame ${frameNumber} to render. (error probably occurred in backend)`));
			});
		});
	}
}
// sync:desktop
type Render_Config = {mapID: string, rect: VRect, renderFolderName: string, frameRender_minWait: number, frameRender_stabilityWait: number};

export function GetPlaybackTimeAsFrameNumber() {
	const currentFrameTime = GetPlaybackTime();
	if (currentFrameTime == null) return null;
	return GetTimelineTimeAsFrameNumber(currentFrameTime);
}
export function GetTimelineTimeAsFrameNumber(time: number, fps = 60) {
	return (time * fps).RoundTo(1);
}
export function GetFrameNumberAsTimelineTime(frameNumber: number, fps = 60) {
	return frameNumber / fps;
}

export function GetClassForFrameRenderAtTime(time: number|n) {
	return `forFrameRender_${time != null ? time.toString().replace(".", "_") : "forFrameRender_na"}`;
}