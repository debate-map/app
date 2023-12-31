import {Button, Column, Row} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import WaveSurfer from "wavesurfer.js";
import {StartUpload, Range} from "js-vextensions";
import {Observer, UseSize} from "web-vcore";
import {useMemo, useState} from "react";
import useResizeObserver from "use-resize-observer";
import {GetPercentFromXToY, Lerp} from "web-vcore/nm/js-vextensions";

class RowData {
	minValues = [] as number[];
	maxValues = [] as number[];
}

@Observer
export class AudioPanel extends BaseComponent<{}, {}> {
	wavesurferRoot: HTMLDivElement|n;
	render() {
		let {} = this.props;

		//const [rowContainerRef, {width: rowContainerWidth, height: rowContainerHeight}] = UseSize();
		const {ref: rowContainerRef, width: rowContainerWidth, height: rowContainerHeight} = useResizeObserver();
		const rows = ((rowContainerHeight ?? 0) / 100).FloorTo(1).KeepAtLeast(1);

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

		const [rowDatas, setRowDatas] = useState<RowData[]>([]);
		const ParseWavesurferData = ()=>{
			// export peaks with just enough max-length/precision that each pixel-column in the row-container will have 1 sample
			const newSamples_targetCount = (rowContainerWidth ?? 500) * rows;
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

			setRowDatas(rowDatas_new);
		};

		return (
			<Column style={{flex: 1}}>
				<Row>
					<Button text="Load audio file" onClick={async()=>{
						const file = await StartUpload();
						await wavesurfer.loadBlob(file);
						ParseWavesurferData();
					}}/>
					<Button text="Reparse" onClick={()=>ParseWavesurferData()}/>
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
					{Range(0, rows, 1, false).map(i=>{
						const samplesPerRow = rowDatas.map(a=>a.maxValues.length).Max();
						return (
							<canvas key={i}
								// set canvas-width to match the number of samples in the row, for easy rendering
								width={samplesPerRow ?? rowContainerWidth} height={100}
								style={{
									position: "absolute", left: 0, top: i * 100,
									// but set the css-width to just whatever the container's width is, so it fills the visual area (canvas takes care of visual scaling)
									//width: "100%", height: 100,
								}}
								ref={c=>{
									if (c) {
										const rowData = rowDatas[i];
										const ctx = c.getContext("2d")!;
										ctx.fillStyle = "rgb(0, 0, 0)";
										ctx.fillRect(0, 0, c.width, c.height);

										if (rowDatas[i] == null) return;

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
					})}
				</div>
			</Column>
		);
	}
}