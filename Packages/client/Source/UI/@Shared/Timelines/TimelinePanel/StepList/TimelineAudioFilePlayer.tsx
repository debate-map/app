import {GetPlaybackCurrentStepIndex} from "Store/main/maps/mapStates/PlaybackAccessors/Basic";
import {GetTopAudioForStep} from "Utils/OPFS/Map/OPFS_Step";
import {GetTimelineStepTimesFromStart, DMap, Timeline, TimelineStep} from "dm_common";
import {useEffect, useRef, useState} from "react";
import {observer_mgl} from "mobx-graphlink";
import React from "react";

type TimelineAudioFilePlayer_Props = {
	map: DMap,
	timeline: Timeline,
	steps: TimelineStep[],
	audioFile: File,
	playSpeedGetter: ()=>number,
	isPlayingGetter: ()=>boolean,
	timeGetter: ()=>number
};

export const TimelineAudioFilePlayer = observer_mgl((props: TimelineAudioFilePlayer_Props)=>{
	const {map, steps, audioFile, playSpeedGetter, isPlayingGetter, timeGetter} = props;
	const audioElLRef = useRef<HTMLAudioElement>(null);

	const stepTimes = GetTimelineStepTimesFromStart(steps);
	const currentStepIndex = GetPlaybackCurrentStepIndex() ?? 0;
	const currentStep = steps[currentStepIndex ?? -1];
	const currentStep_audio = currentStep != null ? GetTopAudioForStep(currentStep.id, map.id) : null;
	const currentStep_audio_meta = currentStep_audio?.meta;
	const currentStep_startTimeInTimeline = stepTimes[currentStepIndex];

	const [blobURL, setBlobURL] = useState<string|n>();
	useEffect(()=>{
		if (audioFile == null) return void setBlobURL(null);
		const url = URL.createObjectURL(audioFile);
		setBlobURL(url);
		return ()=>URL.revokeObjectURL(url);
	}, [audioFile]);

	// ensure wavesurfer's playback-speed matches the ui setting
	if (audioElLRef.current && audioElLRef.current.playbackRate != playSpeedGetter()) {
		audioElLRef.current.playbackRate = playSpeedGetter();
	}

	// ensure wavesurfer's volume matches the setting for the current-step's clip
	const targetVolume = currentStep_audio_meta?.volume;
	if (targetVolume != null && audioElLRef.current && audioElLRef.current.volume != targetVolume) {
		audioElLRef.current.volume = targetVolume;
	}

	// retrieve current-time in root of render-func, so that render-func re-runs whenever the current-time changes
	const playbackTime = timeGetter();

	// ensure player's play-position matches the progression through the current-step
	if (isPlayingGetter() && currentStep_audio?.file == audioFile && audioElLRef.current && audioElLRef.current.duration != null && Number.isFinite(audioElLRef.current.duration)) {
		const targetAudioTime = playbackTime - currentStep_startTimeInTimeline;
		const playerTimeDiffFromTarget = audioElLRef.current.currentTime.Distance(targetAudioTime);

		// if wavesurfer's playback drifts X seconds from target-time, seek to the correct time
		const timeDiffTolerance = .3 * playSpeedGetter(); // todo: maybe reduce this tolerance range, and/or make it adjustable (whether manually or automatically based on perf stats)
		if (playerTimeDiffFromTarget > timeDiffTolerance) {
			audioElLRef.current.currentTime = targetAudioTime;
			if (audioElLRef.current.paused) audioElLRef.current.play();
		}
	} else if (audioElLRef.current && !audioElLRef.current.paused) {
		audioElLRef.current.pause();
	}

	return (
		<>
			{blobURL != null &&
			<audio
				ref={audioElLRef}
				src={blobURL}
				style={{display: "none"}} // in case browser displays non-`controls` audio-elements
			/>}
		</>
	);
});
