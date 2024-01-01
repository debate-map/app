import {Button, CheckBox, Column, Row, Text, TimeSpanInput} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import WaveSurfer from "wavesurfer.js";
import {StartUpload, Range} from "js-vextensions";
import {Observer, RunInAction, RunInAction_Set, UseSize} from "web-vcore";
import {useEffect, useMemo, useState} from "react";
import useResizeObserver from "use-resize-observer";
import {GetPercentFromXToY, Lerp, Timer} from "web-vcore/nm/js-vextensions";
import {store} from "Store";

class ParseData {
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

@Observer
export class AudioPanel extends BaseComponent<{}, {}> {
	wavesurferRoot: HTMLDivElement|n;
	render() {
		let {} = this.props;
		const uiState = store.main.timelines.audioPanel;
		const tracker1 = uiState.wavesurferStateChangedAt;

		//const [rowContainerRef, {width: rowContainerWidth, height: rowContainerHeight}] = UseSize();
		const {ref: rowContainerRef, width: rowContainerWidth_raw, height: rowContainerHeight_raw} = useResizeObserver();
		const rowContainerWidth = rowContainerWidth_raw ?? 500;
		const rowContainerHeight = rowContainerHeight_raw ?? 0;
		const rows = (rowContainerHeight / 100).FloorTo(1).KeepAtLeast(1);

		const wavesurfer = useMemo(()=>{
			const val = WaveSurfer.create({
				container: document.createElement("div"), // placeholder (real container is set in ref callback of div below)
				waveColor: "rgb(200, 0, 200)",
				progressColor: "rgb(100, 0, 100)",
				//url: "/examples/audio/audio.wav",
			});
			val.on("click", ()=>{
				wavesurfer.play();
			});
			return val;
		}, []);

		const [parseData, setParseData] = useState<ParseData|null>(null);
		const rowDatas = parseData?.rowDatas ?? [];
		const ParseWavesurferData = ()=>{
			// export peaks with just enough max-length/precision that each pixel-column in the row-container will have 1 sample
			const newSamples_targetCount = rowContainerWidth * rows;
			/*const allChannelPeaks = wavesurfer.exportPeaks({maxLength: targetSampleCount});
			const combinedData = new RowData();
			const sampleCount = allChannelPeaks.map(channelPeaks=>channelPeaks.length / 2).Max();
			for (let i = 0; i < sampleCount; i++) {
				const sampleMaxValues_channelAvg = allChannelPeaks.map(channelPeaks=>channelPeaks[i * 2]).Average();
				const sampleMinValues_channelAvg = allChannelPeaks.map(channelPeaks=>channelPeaks[(i * 2) + 1]).Average();
				combinedData.maxValues.push(sampleMaxValues_channelAvg);
				combinedData.minValues.push(sampleMinValues_channelAvg);
			}*/

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

			setParseData({
				samplesPerRow,
				rowFractionOfFull,
				secondsPerRow,
				combinedData,
				rowDatas: rowDatas_new,
			});
		};

		return (
			<Column style={{flex: 1}}>
				<Row style={{height: 30}}>
					<Button text="Load audio file" onClick={async()=>{
						const file = await StartUpload();
						await wavesurfer.loadBlob(file);
						ParseWavesurferData();
					}}/>
					<Button ml={5} text="Reparse" onClick={()=>ParseWavesurferData()}/>
					<Button ml={5} enabled={parseData != null} text={wavesurfer.isPlaying() ? "⏸" : "▶"} onClick={()=>{
						if (wavesurfer.isPlaying()) {
							wavesurfer.pause();
						} else {
							//wavesurfer.seekTo(uiState.selection_start / wavesurfer.getDuration());
							wavesurfer.play();
						}
						RunInAction("AudioPanel.playPauseButton.onClick", ()=>uiState.wavesurferStateChangedAt = Date.now());
					}}/>
					<Button ml={5} enabled={parseData != null} text={"■"} onClick={()=>{
						if (wavesurfer.isPlaying()) {
							wavesurfer.pause();
						}
						wavesurfer.seekTo(uiState.selection_start / wavesurfer.getDuration());
						RunInAction("AudioPanel.stopButton.onClick", ()=>uiState.wavesurferStateChangedAt = Date.now());
					}}/>
					<CheckBox ml={5} text="Play on click" value={uiState.playOnClick} onChange={val=>RunInAction_Set(this, ()=>uiState.playOnClick = val)}/>
					<Text ml={5}>Selection:</Text>
					<TimeSpanInput ml={5} largeUnit="minute" smallUnit="second" style={{width: 80}} enabled={parseData != null} value={uiState.selection_start} onChange={val=>{
						RunInAction_Set(this, ()=>uiState.selection_start = val);
					}}/>
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
					{parseData != null && <TimeMarker wavesurfer={wavesurfer} parseData={parseData}/>}
					{parseData != null && <SelectionMarker wavesurfer={wavesurfer} parseData={parseData}/>}
					{Range(0, rows, 1, false).map(i=>{
						return <AudioRow key={i} rowIndex={i} parseData={parseData} rowContainerWidth={rowContainerWidth} wavesurfer={wavesurfer}/>;
					})}
				</div>
			</Column>
		);
	}
}

@Observer
class SelectionMarker extends BaseComponent<{wavesurfer: WaveSurfer, parseData: ParseData}, {}> {
	render() {
		const {parseData} = this.props;
		const {secondsPerRow} = parseData;
		const uiState = store.main.timelines.audioPanel;

		const selectionStart_row = Math.floor(uiState.selection_start / secondsPerRow);

		return (
			<div style={{
				position: "absolute", zIndex: 1, pointerEvents: "none",
				left: ((uiState.selection_start % secondsPerRow) / secondsPerRow).ToPercentStr(),
				top: 100 * selectionStart_row,
				width: 1,
				height: 100,
				background: "rgba(0,255,0,1)",
			}}/>
		);
	}
}

@Observer
class TimeMarker extends BaseComponent<{wavesurfer: WaveSurfer, parseData: ParseData}, {}> {
	render() {
		const {wavesurfer, parseData} = this.props;
		const {secondsPerRow} = parseData;

		useEffect(()=>{
			const timer = new Timer(1000 / 30, ()=>{
				this.Update();
			}).Start();
			return ()=>timer.Stop();
		});

		const currentRow = Math.floor(wavesurfer.getCurrentTime() / secondsPerRow);

		return (
			<div style={{
				position: "absolute", zIndex: 1, pointerEvents: "none",
				left: ((wavesurfer.getCurrentTime() % secondsPerRow) / secondsPerRow).ToPercentStr(),
				top: 100 * currentRow,
				width: 1,
				height: 100,
				background: "rgba(0,130,255,1)",
			}}/>
		);
	}
}

class AudioRow extends BaseComponent<{rowIndex: number, parseData: ParseData|null, rowContainerWidth: number, wavesurfer: WaveSurfer}, {}> {
	render() {
		const {rowIndex, parseData, rowContainerWidth, wavesurfer} = this.props;
		const uiState = store.main.timelines.audioPanel;

		return (
			<canvas
				// set canvas-width to match the number of samples in the row, for pixel-perfect/no-scaling rendering
				width={parseData?.samplesPerRow ?? rowContainerWidth} height={100}
				style={{
					position: "absolute", left: 0, top: rowIndex * 100,
					// but set the css-width to just whatever the container's width is, so it fills the visual area (canvas takes care of visual scaling)
					//width: "100%", height: 100,
				}}
				onClick={e=>{
					if (parseData == null) return;
					const timeAtStartOfRow = rowIndex * parseData.secondsPerRow;
					const timeAtEndOfRow = (rowIndex + 1) * parseData.secondsPerRow;
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
					if (c && parseData) {
						const {rowDatas} = parseData;
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