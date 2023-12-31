import {Button, Column, Row} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import WaveSurfer from "wavesurfer.js";
import {StartUpload} from "js-vextensions";

export class AudioPanel extends BaseComponent<{}, {}> {
	wavesurferRoot: HTMLDivElement|n;
	render() {
		let {} = this.props;

		const wavesurfer = WaveSurfer.create({
			container: document.createElement("div"), // placeholder (real container is set in ref callback of div below)
			waveColor: "rgb(200, 0, 200)",
			progressColor: "rgb(100, 0, 100)",
			//url: "/examples/audio/audio.wav",
		});
		wavesurfer.on("click", ()=>{
			wavesurfer.play();
		});

		return (
			<Column>
				<Row>
					<Button text="Load audio file" onClick={async()=>{
						const file = await StartUpload();
						wavesurfer.loadBlob(file);
					}}/>
				</Row>
				<div ref={c=>{
					if (c) {
						this.wavesurferRoot = c;
						wavesurfer.setOptions({container: this.wavesurferRoot});
					}
				}}>
				</div>
			</Column>
		);
	}
}