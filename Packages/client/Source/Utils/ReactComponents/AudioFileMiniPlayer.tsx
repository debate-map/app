import React, {useEffect, useState} from "react";
import {Button, ButtonProps} from "react-vcomponents";
import {BaseComponent} from "react-vextensions";
import {Timer} from "web-vcore/nm/js-vextensions";

export class AudioFileMiniPlayer extends BaseComponent<{file: File|n, volume?: number|n, buttonProps: ButtonProps}, {}> {
	static defaultProps = {volume: 1};

	audioEl: HTMLAudioElement|n;

	updateWhilePlayingTimer = new Timer(100, ()=>{
		this.Update();
		if (this.audioEl?.paused) {
			this.updateWhilePlayingTimer.Stop();
		}
	});

	render() {
		const {file, volume, buttonProps} = this.props;

		const [blobURL, setBlobURL] = useState<string|n>();
		useEffect(()=>{
			if (file == null) return void setBlobURL(null);
			const url = URL.createObjectURL(file);
			setBlobURL(url);
			return ()=>URL.revokeObjectURL(url);
		}, [file]);

		return (
			<>
				{blobURL != null &&
				<audio
					ref={c=>{
						this.audioEl = c;
						if (c) c.volume = volume ?? 1;
					}}
					src={blobURL}/>}
				<Button {...buttonProps} enabled={blobURL != null} mdIcon={(this.audioEl == null || this.audioEl.paused) ? "play" : "stop"} onClick={()=>{
					if (this.audioEl == null) return;
					if (this.audioEl.paused) {
						this.audioEl.play();
						this.updateWhilePlayingTimer.Start();
					} else {
						if (!this.audioEl.paused) this.audioEl.pause();
						this.audioEl.currentTime = 0;
					}
				}}/>
			</>
		);
	}
}