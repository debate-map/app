import {Button, CheckBox, Column, DropDown, DropDownContent, DropDownTrigger, Row, Spinner, Text, TextArea, TimeSpanInput} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import WaveSurfer from "wavesurfer.js";
import {StartUpload, Range} from "js-vextensions";
import {Observer, RunInAction, RunInAction_Set, TextPlus, UseSize} from "web-vcore";
import {useEffect, useMemo, useState} from "react";
import useResizeObserver from "use-resize-observer";
import {E, GetPercentFromXToY, Lerp, SleepAsync, StartDownload, Timer, WaitXThenRun} from "web-vcore/nm/js-vextensions";
import {store} from "Store";
import {OPFS_Map} from "Utils/OPFS/OPFS_Map";
import {GetTimelineSteps, Map, Timeline} from "dm_common";
import {ShowMessageBox} from "react-vmessagebox";
import {autorun} from "web-vcore/nm/mobx";
import {AudioMeta} from "Utils/OPFS/Map/AudioMeta";
import {zIndexes} from "Utils/UI/ZIndexes";
import {AutoRun_HandleBail} from "Utils/AutoRuns/@Helpers";
import {ModifyAudioFileMeta, SetStepClipTimeInAudio} from "./StepList/Editing/StepEditorUI";

class ParseData {
	audioData?: ParseData_Audio;
	textData?: ParseData_Text;
}

class ParseData_Audio {
	samplesPerRow: number;
	rowFractionOfFull: number;
	secondsPerRow: number;

	combinedData: RowData;
	rowDatas: RowData[];
}
class RowData {
	minValues = [] as number[];
	maxValues = [] as number[];
}

class ParseData_Text {
	text?: string;
}

@Observer
export class AudioPanel extends BaseComponent<{map: Map, timeline: Timeline}, {}> {
	wavesurferRoot: HTMLDivElement|n;
	render() {
		const {map, timeline} = this.props;
		const uiState = store.main.timelines.audioPanel;
		const tracker1 = uiState.wavesurferStateChangedAt;
		const timelineSteps = GetTimelineSteps(timeline.id);

		//const [rowContainerRef, {width: rowContainerWidth, height: rowContainerHeight}] = UseSize();
		const {ref: rowContainerRef, width: rowContainerWidth_raw, height: rowContainerHeight_raw} = useResizeObserver();
		const rowContainerWidth = rowContainerWidth_raw ?? 500;
		const rowContainerHeight = rowContainerHeight_raw ?? 0;
		//const rows = (rowContainerHeight / 100).FloorTo(1).KeepAtLeast(1);
		const rows = uiState.waveformRows == 0 ? (rowContainerHeight / 100).FloorTo(1).KeepAtLeast(1) : uiState.waveformRows;

		const wavesurfer = useMemo(()=>{
			const val = WaveSurfer.create({
				container: document.createElement("div"), // placeholder (real container is set in ref callback of div below)
				waveColor: "rgb(200, 0, 200)",
				progressColor: "rgb(100, 0, 100)",
			});
			//val.on("click", ()=>wavesurfer.play());
			//val.on("ready", ()=>LoadSelectedFileIntoWavesurfer_IfNotAlready());
			return val;
		}, []);
		async function LoadFileIntoWavesurfer_IfNotAlreadyAndValid(file: File|n) {
			if (file == null) return;
			if (wavesurfer["lastFileLoaded"] == file) return;
			wavesurfer["lastFileLoaded"] = file;

			// if selected file has an extension we know-about/create, but which are not media files, then just clear the parse-data and waveform-ui
			if (file.name.EndsWithAny(".json")) {
				wavesurfer.empty();
				await SleepAsync(0); // wait moment, so react warning doesn't happen (of setting state during render)
				setParseData({
					textData: {text: await file.text()},
				});
				return;
			}

			await wavesurfer.loadBlob(file);
			if (file != wavesurfer["lastFileLoaded"]) return; // if another file was loaded in the meantime, cancel completion of this load (else could overwrite loading of more recent one)
			ParseWavesurferData();
		}
		useEffect(()=>{
			const dispose = AutoRun_HandleBail(()=>{
				if (uiState.act_startPlayAtTimeX != -1) {
					const targetTime = uiState.act_startPlayAtTimeX;
					// avoid recursive loop, by performing action out of call-stack (and thus mobx autorun's observation)
					(async()=>{
						RunInAction("AudioPanel.useEffect[for mobx act_X]", ()=>{
							uiState.act_startPlayAtTimeX = -1; // reset flag
							uiState.selection_start = targetTime;
							wavesurfer.seekTo(targetTime / wavesurfer.getDuration());
							wavesurfer.play();
							uiState.wavesurferStateChangedAt = Date.now();
						});
					})();
				}
			});
			return ()=>dispose();
		});

		const [parseData, setParseData] = useState<ParseData|null>(null);
		const {audioData, textData} = parseData ?? {};
		//const rowDatas = parseData?.audioData?.rowDatas ?? [];
		const ParseWavesurferData = ()=>{
			// export peaks with just enough max-length/precision that each pixel-column in the row-container will have 1 sample
			const newSamples_targetCount = rowContainerWidth * rows;

			const decodedData = wavesurfer.getDecodedData();
			if (decodedData == null) return;
			const channelDatas = Range(0, decodedData.numberOfChannels, 1, false).map(i=>decodedData.getChannelData(i));
			const oldSamples_count = channelDatas.map(channelData=>channelData.length).Max();
			const newSampleSize = Math.ceil(oldSamples_count / newSamples_targetCount);
			const newSamples_actualCount = Math.ceil(oldSamples_count / newSampleSize);

			const combinedData = new RowData();
			for (let i = 0; i < newSamples_actualCount; i++) {
				// we avoid using helpers like arr.Min() here, since it slows down processing a lot (eg. ~2s -> ~10s for 15min audio)
				let min = 0;
				let max = 0;
				for (const channelData of channelDatas) {
					const result = channelData.slice(i * newSampleSize, (i + 1) * newSampleSize);
					for (const val of result) {
						if (val < min) min = val;
						if (val > max) max = val;
					}
				}
				/*combinedData.minValues.push(min);
				combinedData.maxValues.push(max);*/
				// have top/bottom halves mirror each other (the lost precision/information isn't actually useful in 99% of cases, and this way looks nicer)
				const max_abs = Math.max(Math.abs(min), Math.abs(max));
				combinedData.minValues.push(-max_abs);
				combinedData.maxValues.push(max_abs);
			}

			const samplesPerRow = (newSamples_actualCount / rows).CeilingTo(1); // rounded up
			// split samples into rows
			const rowDatas_new = Range(0, rows).map(rowIndex=>{
				const rowData = new RowData();
				for (let i = 0; i < samplesPerRow; i++) {
					const sampleIndex = (rowIndex * samplesPerRow) + i;
					// if sampleIndex is out of bounds (eg. last row, and not enough samples to fill it), just skip it
					if (combinedData.maxValues[sampleIndex] == null || combinedData.minValues[sampleIndex] == null) continue;
					rowData.maxValues.push(combinedData.maxValues[sampleIndex]);
					rowData.minValues.push(combinedData.minValues[sampleIndex]);
				}
				return rowData;
			});

			// extra info
			const rowFractionOfFull = samplesPerRow / combinedData.maxValues.length;
			const secondsPerRow = wavesurfer.getDuration() * rowFractionOfFull;

			// update audio-file-meta, to store the audio's now-known duration
			if (selectedFile != null) {
				const audioMeta = opfsForMap.AudioMeta;
				const audioFileMeta = audioMeta?.fileMetas[selectedFile.name ?? ""];
				if (wavesurfer.getDuration() > 0 && wavesurfer.getDuration() != audioFileMeta?.duration) {
					ModifyAudioFileMeta(opfsForMap, audioMeta, selectedFile?.name, newAudioFileMeta=>newAudioFileMeta.duration = wavesurfer.getDuration());
				}
			}

			setParseData({
				audioData: {
					samplesPerRow,
					rowFractionOfFull,
					secondsPerRow,
					combinedData,
					rowDatas: rowDatas_new,
				},
			});
		};

		const opfsForMap = OPFS_Map.GetEntry(map.id);
		const files = opfsForMap.Files;
		const selectedFile = files.find(a=>a.name == uiState.selectedFile);
		LoadFileIntoWavesurfer_IfNotAlreadyAndValid(selectedFile); // todo: rework this to be less fragile (and to allow for "canceling" of one load, if another gets started afterward)

		const audioMeta = opfsForMap.AudioMeta;
		const audioFileMeta = audioMeta?.fileMetas[selectedFile?.name ?? ""];
		const stepClipsInAudioFile = audioFileMeta?.stepClips.Pairs() ?? [];

		return (
			<Column style={{flex: 1}}>
				<Row plr={5} style={{height: 30}}>
				<DropDown>
					<DropDownTrigger><Button text={`Files (${files.Any(a=>a.name == uiState.selectedFile) ? uiState.selectedFile : "none selected"})`} style={{height: "100%"}}/></DropDownTrigger>
					<DropDownContent style={{left: 0, width: 500, zIndex: zIndexes.subNavBar}}><Column>
						<Text>Files:</Text>
						<div style={{display: "flex", flexWrap: "wrap", gap: 5}}>
							{files.map((file, index)=>{
								return (
									<Button key={index} ml={5} text={file.name}
										style={E(
											selectedFile == file && {backgroundColor: "rgba(255,255,255,.5)"},
										)}
										onClick={async()=>{
											RunInAction_Set(this, ()=>uiState.selectedFile = file.name);
											/*await wavesurfer.loadBlob(file);
											ParseWavesurferData();*/
										}}/>
								);
							})}
						</div>
					</Column></DropDownContent>
				</DropDown>
					<Button ml={5} mdIcon="creation" title="Associate timeline-steps and audio-files whose names start with the same first 3 characters." onClick={async()=>{
						let modifiedAudioMeta = audioMeta;
						for (const step of timelineSteps) {
							const stepNameStart = step.id.slice(0, 3);
							for (const file of files.filter(a=>a.name.startsWith(stepNameStart))) {
								modifiedAudioMeta = await SetStepClipTimeInAudio(opfsForMap, modifiedAudioMeta, file.name, step.id, 0);
							}
						}
					}}/>
					<Button ml={5} mdIcon="upload" onClick={async()=>{
						const newFiles = await StartUpload(true);
						for (const file of newFiles) {
							opfsForMap.SaveFile(file);
						}
						RunInAction_Set(this, ()=>uiState.selectedFile = newFiles[0].name);
						/*await wavesurfer.loadBlob(newFiles[0]);
						ParseWavesurferData();*/
					}}/>

					<Text ml={15}>File:</Text>
					<Button ml={5} mdIcon="download" enabled={selectedFile != null} onClick={async()=>{
						const lastDotIndex = selectedFile!.name.lastIndexOf(".");
						const [fileName_noExt, ext] = lastDotIndex == -1 ? [selectedFile!.name, ""] : [selectedFile!.name.slice(0, lastDotIndex), selectedFile!.name.slice(lastDotIndex + 1)];
						StartDownload(await selectedFile!.text(), `Map(${map.id})_File(${fileName_noExt})_Export(${new Date().toLocaleString("sv").replace(/[ :]/g, "-")}).${ext}`);
					}}/>
					<Button ml={5} mdIcon="delete" enabled={selectedFile != null} onClick={()=>{
						ShowMessageBox({
							title: "Delete file", cancelButton: true,
							message: `Delete file "${selectedFile!.name}"?`,
							onOK: async()=>{
								await opfsForMap.DeleteFile(selectedFile!.name);
								RunInAction_Set(this, ()=>uiState.selectedFile = null);
							},
						});
					}}/>
					<Button ml={5} text="Reparse" onClick={()=>{
						ParseWavesurferData();
					}}/>

					{audioData != null && <>
						<Text ml={15}>Audio:</Text>
						<Button ml={5} mdIcon={wavesurfer.isPlaying() ? "pause" : "play"} onClick={()=>{
							if (wavesurfer.isPlaying()) {
								wavesurfer.pause();
							} else {
								//wavesurfer.seekTo(uiState.selection_start / wavesurfer.getDuration());
								wavesurfer.play();
							}
							RunInAction("AudioPanel.playPauseButton.onClick", ()=>uiState.wavesurferStateChangedAt = Date.now());
						}}/>
						<Button ml={5} mdIcon="stop" onClick={()=>{
							if (wavesurfer.isPlaying()) {
								wavesurfer.pause();
							}
							wavesurfer.seekTo(uiState.selection_start / wavesurfer.getDuration());
							RunInAction("AudioPanel.stopButton.onClick", ()=>uiState.wavesurferStateChangedAt = Date.now());
						}}/>
						<CheckBox ml={5} text="Play on click" value={uiState.playOnClick} onChange={val=>RunInAction_Set(this, ()=>uiState.playOnClick = val)}/>
						<Text ml={5}>Selection:</Text>
						<TimeSpanInput ml={5} largeUnit="minute" smallUnit="second" style={{width: 80}} value={uiState.selection_start} onChange={val=>{
							RunInAction_Set(this, ()=>uiState.selection_start = val);
						}}/>
						<TextPlus ml={5} info={`0 means as many rows as fits in the container.`}>Rows:</TextPlus>
						<Spinner ml={5} value={uiState.waveformRows} onChange={val=>RunInAction_Set(this, ()=>uiState.waveformRows = val)}/>
					</>}
				</Row>
				<div style={{position: "absolute", left: 0, top: 0, width: "100%", display: "none"}} ref={c=>{
					if (c) {
						this.wavesurferRoot = c;
						wavesurfer.setOptions({container: this.wavesurferRoot});
					}
				}}/>
				<div style={{position: "relative", flex: 1}} ref={c=>{
					if (c) {
						rowContainerRef(c);
					}
				}}>
					{audioData != null && <>
						{stepClipsInAudioFile.map((clip, index)=>{
							return (
								<TimeMarker key={index} audioData={audioData} timeGetter={()=>clip.value.timeInAudio} color="rgba(255,100,0,1)"/>
							);
						})}
						<TimeMarker audioData={audioData} timeGetter={()=>wavesurfer.getCurrentTime()} color="rgba(0,130,255,1)" updateInterval={1000 / 30}/>
						<TimeMarker audioData={audioData} timeGetter={()=>uiState.selection_start} color="rgba(0,255,0,1)"/>
						{Range(0, rows, 1, false).map(i=>{
							return <AudioRow key={i} rowIndex={i} audioData={audioData} rowContainerWidth={rowContainerWidth} wavesurfer={wavesurfer}/>;
						})}
					</>}
					{textData != null && <>
						<TextArea style={{height: "100%"}} value={textData.text ?? ""} onChange={val=>{
							opfsForMap.SaveFile_Text(val, uiState.selectedFile!);
						}}/>
					</>}
				</div>
			</Column>
		);
	}
}

@Observer
class TimeMarker extends BaseComponent<{audioData: ParseData_Audio, timeGetter: ()=>number, color: string, updateInterval?: number}, {}> {
	render() {
		const {audioData, timeGetter, color, updateInterval} = this.props;
		const {secondsPerRow} = audioData;

		useEffect(()=>{
			if (updateInterval == null) return;
			const timer = new Timer(updateInterval, ()=>{
				this.Update();
			}).Start();
			return ()=>timer.Stop();
		}, [updateInterval]);

		const currentRow = Math.floor(timeGetter() / secondsPerRow);

		return (
			<div style={{
				position: "absolute", zIndex: 1, pointerEvents: "none",
				left: ((timeGetter() % secondsPerRow) / secondsPerRow).ToPercentStr(),
				top: 100 * currentRow,
				width: 1,
				height: 100,
				background: color,
			}}/>
		);
	}
}

class AudioRow extends BaseComponent<{rowIndex: number, audioData: ParseData_Audio|undefined, rowContainerWidth: number, wavesurfer: WaveSurfer}, {}> {
	render() {
		const {rowIndex, audioData, rowContainerWidth, wavesurfer} = this.props;
		const uiState = store.main.timelines.audioPanel;

		return (
			<canvas
				// set canvas-width to match the number of samples in the row, for pixel-perfect/no-scaling rendering
				width={audioData?.samplesPerRow ?? rowContainerWidth} height={100}
				style={{
					position: "absolute", left: 0, top: rowIndex * 100,
					// but set the css-width to just whatever the container's width is, so it fills the visual area (canvas takes care of visual scaling)
					//width: "100%", height: 100,
				}}
				onClick={e=>{
					if (audioData == null) return;
					const timeAtStartOfRow = rowIndex * audioData.secondsPerRow;
					const timeAtEndOfRow = (rowIndex + 1) * audioData.secondsPerRow;
					const targetTimeInSeconds = Lerp(timeAtStartOfRow, timeAtEndOfRow, e.nativeEvent.offsetX / rowContainerWidth);
					wavesurfer.seekTo(targetTimeInSeconds / wavesurfer.getDuration());
					if (uiState.playOnClick) {
						wavesurfer.play();
					} else {
						wavesurfer.pause();
					}
					RunInAction("AudioRow.canvas.onClick", ()=>{
						uiState.selection_start = targetTimeInSeconds;
						uiState.wavesurferStateChangedAt = Date.now();
					});
				}}
				ref={c=>{
					if (c && audioData) {
						const {rowDatas} = audioData;
						const rowData = rowDatas[rowIndex];
						const ctx = c.getContext("2d")!;
						ctx.fillStyle = "rgb(0, 0, 0)";
						ctx.fillRect(0, 0, c.width, c.height);

						if (rowDatas[rowIndex] == null) return;

						ctx.fillStyle = "rgb(255, 255, 255)";
						//const halfHeight = 50;
						for (let x = 0; x < rowData.maxValues.length; x++) {
							/*const y1 = halfHeight + (rowData.maxValues[x] * halfHeight);
							const y2 = halfHeight + (rowData.minValues[x] * halfHeight);*/
							const y1 = Lerp(100, 0, GetPercentFromXToY(-1, 1, rowData.maxValues[x]));
							const y2 = Lerp(100, 0, GetPercentFromXToY(-1, 1, rowData.minValues[x]));
							ctx.fillRect(x, y1, 1, y2 - y1);
						}
					}
				}}/>
		);
	}
}