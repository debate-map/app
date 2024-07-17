import {GetPlaybackCurrentStepIndex} from "Store/main/maps/mapStates/PlaybackAccessors/Basic";
import {GetTopAudioForStep} from "Utils/OPFS/Map/OPFS_Step";
import {OPFS_Map} from "Utils/OPFS/OPFS_Map";
import {GetTimelineStepTimesFromStart, Map, Timeline, TimelineStep} from "dm_common";
import {useEffect, useMemo, useState} from "react";
import {Row} from "react-vcomponents";
import {Observer} from "web-vcore";
import {Assert, GetPercentFromXToY, Lerp} from "js-vextensions";
import {BaseComponent} from "react-vextensions";

@Observer
export class TimelineAudioFilePlayer extends BaseComponent<{map: Map, timeline: Timeline, steps: TimelineStep[], audioFile: File, playSpeedGetter: ()=>number, isPlayingGetter: ()=>boolean, timeGetter: ()=>number}, {}> {
	audioEl: HTMLAudioElement|n;

	render() {
		const {map, timeline, steps, audioFile, playSpeedGetter, isPlayingGetter, timeGetter} = this.props;
		const stepTimes = GetTimelineStepTimesFromStart(steps);
		const currentStepIndex = GetPlaybackCurrentStepIndex() ?? 0;
		const currentStep = steps[currentStepIndex ?? -1];
		const currentStep_audio = currentStep != null ? GetTopAudioForStep(currentStep.id, map.id) : null;
		const currentStep_audio_meta = currentStep_audio?.meta;
		const currentStep_startTimeInTimeline = stepTimes[currentStepIndex];
		const currentStep_endTimeInTimeline = stepTimes[currentStepIndex + 1];

		const [blobURL, setBlobURL] = useState<string|n>();
		useEffect(()=>{
			if (audioFile == null) return void setBlobURL(null);
			const url = URL.createObjectURL(audioFile);
			setBlobURL(url);
			return ()=>URL.revokeObjectURL(url);
		}, [audioFile]);

		// ensure wavesurfer's playback-speed matches the ui setting
		if (this.audioEl && this.audioEl.playbackRate != playSpeedGetter()) {
			this.audioEl.playbackRate = playSpeedGetter();
		}

		// ensure wavesurfer's volume matches the setting for the current-step's clip
		const targetVolume = currentStep_audio_meta?.volume;
		if (targetVolume != null && this.audioEl && this.audioEl.volume != targetVolume) {
			this.audioEl.volume = targetVolume;
		}

		// retrieve current-time in root of render-func, so that render-func re-runs whenever the current-time changes
		const playbackTime = timeGetter();

		// ensure player's play-position matches the progression through the current-step
		if (isPlayingGetter() && currentStep_audio?.file == audioFile && this.audioEl && this.audioEl.duration != null && Number.isFinite(this.audioEl.duration)) {
			const targetAudioTime = playbackTime - currentStep_startTimeInTimeline;
			const playerTimeDiffFromTarget = this.audioEl.currentTime.Distance(targetAudioTime);

			// if wavesurfer's playback drifts X seconds from target-time, seek to the correct time
			const timeDiffTolerance = .3 * playSpeedGetter(); // todo: maybe reduce this tolerance range, and/or make it adjustable (whether manually or automatically based on perf stats)
			if (playerTimeDiffFromTarget > timeDiffTolerance) {
				this.audioEl.currentTime = targetAudioTime;
				if (this.audioEl.paused) this.audioEl.play();
			}
		} else if (this.audioEl && !this.audioEl.paused) {
			this.audioEl.pause();
		}

		return (
			<>
				{blobURL != null &&
				<audio
					ref={c=>{
						this.audioEl = c;
						//if (c) c.volume = volume ?? 1;
					}}
					src={blobURL}
					style={{display: "none"}} // in case browser displays non-`controls` audio-elements
				/>}
			</>
		);
	}
}