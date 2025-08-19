import React, {useEffect, useReducer, useRef, useState} from "react";
import {Button, ButtonProps} from "react-vcomponents";
import {Timer} from "js-vextensions";

type Props = {
	file: File|n,
	volume?: number|n,
	buttonProps: ButtonProps
};

export const AudioFileMiniPlayer = (props: Props)=>{
	const {file, volume = 1, buttonProps} = props;

	const [_, reRender] = useReducer(x=>x+1, 0);
	const audioRef = useRef<HTMLAudioElement|n>(null);
	const [blobURL, setBlobURL] = useState<string|n>();

	const updateWhilePlayingTimer = useRef<Timer|n>(new Timer(100, ()=>{
		reRender();
		if (audioRef.current?.paused) {
			updateWhilePlayingTimer.current?.Stop();
		}
	}));

	useEffect(()=>{
		if (file == null) return void setBlobURL(null);
		const url = URL.createObjectURL(file);
		setBlobURL(url);
		return ()=>URL.revokeObjectURL(url);
	}, [file]);

	const handleAudioRef = (c: HTMLAudioElement|n)=>{
		audioRef.current = c;
		if (c) {
			c.volume = volume ?? 1;
		}
	}

	return (
		<>
			{blobURL != null &&
			<audio ref={handleAudioRef}
				src={blobURL}
				style={{display: "none"}} // in case browser displays non-`controls` audio-elements
			/>}
			<Button {...buttonProps} enabled={blobURL != null} mdIcon={(audioRef.current == null || audioRef.current.paused) ? "play" : "stop"} onClick={()=>{
				if (audioRef.current == null) return;

				if (audioRef.current.paused) {
					audioRef.current.play();
					updateWhilePlayingTimer.current?.Start();
				} else {
					if (!audioRef.current.paused) audioRef.current.pause();
					audioRef.current.currentTime = 0;
				}
			}}/>
		</>
	);
};
