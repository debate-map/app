import React, {useEffect, useRef} from "react";
import {YoutubePlayer, PosChangeSource} from "../General/YoutubePlayer.js";
import {css2} from "../UI/Styles.js";

export const ParseYoutubeVideoID = (url: string)=>{
	return url?.match(/v=([A-Za-z0-9_-]{11})/)?.[1];
}

type Props = {
	videoID: string,
	startTime?: number,
	heightVSWidthPercent: number,
	autoplay?: boolean,
	initPlayer?: (player: YoutubePlayer)=>any,
	onPlayerInitialized?: (player: YoutubePlayer)=>any,
	onPosChanged?: (position: number, source: PosChangeSource)=>any,
	onPosChanged_callForStartTime?: boolean,
	style?,
};

export const YoutubePlayerUI = (props: Props)=>{
	const {videoID, onPosChanged, startTime, heightVSWidthPercent = .75, autoplay = false, onPosChanged_callForStartTime= true,
		style, initPlayer, onPlayerInitialized} = props;

	const containerRef = useRef<HTMLDivElement>(null);
	const playerRef = useRef<YoutubePlayer>(null);
	const readyRef = useRef(false);

	useEffect(()=>{
		const player = new YoutubePlayer();
		if (initPlayer) initPlayer(player);
		playerRef.current = player;

		player.containerUI = containerRef.current!;
		(async()=>{
			await player.EnsureReady();
			if (onPlayerInitialized) onPlayerInitialized(player);
			player.LoadVideo({videoID, startTime}, autoplay);

			if (onPosChanged) {
				player.onPositionChanged = onPosChanged;
				if (onPosChanged_callForStartTime && startTime != null) {
					onPosChanged(startTime, "playback"); // it's not really either source, but it's closer to playback
				}
			}
		})();
	}, []);

	const css = css2;
	return (
		<div ref={containerRef} style={css({position: "relative", paddingBottom: `${heightVSWidthPercent * 100}%`, height: 0}, style)}/>
	);
};
