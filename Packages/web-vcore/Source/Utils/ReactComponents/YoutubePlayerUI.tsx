import React, {Ref} from "react";
import {BaseComponent, BaseComponentPlus} from "react-vextensions";
import {Row} from "react-vcomponents";
import {E} from "js-vextensions";
import {YoutubePlayer, PosChangeSource} from "../General/YoutubePlayer.js";
import {cssHelper} from "react-vextensions";;

export function ParseYoutubeVideoID(url: string) {
	return url?.match(/v=([A-Za-z0-9_-]{11})/)?.[1];
}

export class YoutubePlayerUI extends BaseComponentPlus(
	{heightVSWidthPercent: .75, autoplay: false, onPosChanged_callForStartTime: true} as {
		videoID: string, startTime?: number, heightVSWidthPercent: number, autoplay?: boolean,
		initPlayer?: (player: YoutubePlayer)=>any,
		onPlayerInitialized?: (player: YoutubePlayer)=>any,
		onPosChanged?: (position: number, source: PosChangeSource)=>any,
		onPosChanged_callForStartTime?: boolean,
		style?,
	},
) {
	player: YoutubePlayer;
	root: HTMLDivElement|null;
	render() {
		const {heightVSWidthPercent, style} = this.props;
		const {css} = cssHelper(this);
		return (
			<div ref={c=>void(this.root = c)} style={css({position: "relative", paddingBottom: `${heightVSWidthPercent * 100}%`, height: 0}, style)}/>
		);
	}

	async ComponentDidMount() {
		const {videoID, startTime, autoplay, initPlayer, onPlayerInitialized, onPosChanged, onPosChanged_callForStartTime} = this.props;
		const player = new YoutubePlayer();
		if (initPlayer) initPlayer(player);
		this.player = player;

		player.containerUI = this.root!;
		await player.EnsureReady();
		if (!this.mounted) return;

		if (onPlayerInitialized) onPlayerInitialized(player);
		player.LoadVideo({videoID, startTime}, autoplay);
		/*await player.LoadVideo({videoID, startTime});
		if (autoplay) player.Play();*/

		if (onPosChanged) {
			player.onPositionChanged = onPosChanged;
			if (onPosChanged_callForStartTime && startTime != null) {
				onPosChanged(startTime, "playback"); // it's not really either source, but it's closer to playback
			}
		}
	}
}