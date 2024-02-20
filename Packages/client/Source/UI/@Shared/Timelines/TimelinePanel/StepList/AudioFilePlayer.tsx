import {GetPlaybackCurrentStepIndex} from "Store/main/maps/mapStates/PlaybackAccessors/Basic";
import {GetTopAudioForStep} from "Utils/OPFS/Map/OPFS_Step";
import {OPFS_Map} from "Utils/OPFS/OPFS_Map";
import {GetTimelineStepTimesFromStart, Map, Timeline, TimelineStep} from "dm_common";
import {useMemo} from "react";
import {Row} from "react-vcomponents";
import WaveSurfer from "wavesurfer.js";
import {Observer} from "web-vcore";
import {GetPercentFromXToY, Lerp} from "web-vcore/nm/js-vextensions";
import {BaseComponent} from "web-vcore/nm/react-vextensions";

@Observer
export class AudioFilePlayer extends BaseComponent<{map: Map, timeline: Timeline, steps: TimelineStep[], audioFile: File, playSpeedGetter: ()=>number, isPlayingGetter: ()=>boolean, timeGetter: ()=>number}, {}> {
	wavesurferRoot: HTMLDivElement|n;
	wavesurferReady = false;
	wavesurfer_onReady: (()=>any)|n;

	render() {
		const {map, timeline, steps, audioFile, playSpeedGetter, isPlayingGetter, timeGetter} = this.props;
		const stepTimes = GetTimelineStepTimesFromStart(steps);
		const currentStepIndex = GetPlaybackCurrentStepIndex() ?? 0;
		const currentStep = steps[currentStepIndex ?? -1];
		const currentStep_audio = currentStep != null ? GetTopAudioForStep(currentStep.id, map.id) : null;
		const currentStep_audio_meta = currentStep_audio?.meta?.value;
		const currentStep_startTimeInTimeline = stepTimes[currentStepIndex];
		const currentStep_endTimeInTimeline = stepTimes[currentStepIndex + 1];

		const wavesurfer = useMemo(()=>{
			const val = WaveSurfer.create({
				container: document.createElement("div"), // placeholder (real container is set in ref callback of div below)
				waveColor: "rgb(200, 0, 200)",
				progressColor: "rgb(100, 0, 100)",
			});
			//val.on("click", ()=>wavesurfer.play());
			val.on("ready", ()=>{
				this.wavesurferReady = true;
				this.wavesurfer_onReady?.();
				this.wavesurfer_onReady = null;
			});
			return val;
		}, []);
		async function LoadFileIntoWavesurfer_IfNotAlreadyAndValid(file: File) {
			if (wavesurfer["lastFileLoaded"] == file) return;
			wavesurfer["lastFileLoaded"] = file;

			await wavesurfer.loadBlob(file);
		}
		LoadFileIntoWavesurfer_IfNotAlreadyAndValid(audioFile); // todo: rework this to be less fragile (and to allow for "canceling" of one load, if another gets started afterward)

		// ensure wavesurfer's playback-speed matches the ui setting
		if (wavesurfer.getPlaybackRate() != playSpeedGetter()) {
			wavesurfer.setPlaybackRate(playSpeedGetter());
		}

		// ensure wavesurfer's volume matches the setting for the current-step's clip
		if (currentStep_audio_meta?.volume != null && wavesurfer.getVolume() != currentStep_audio_meta?.volume) {
			wavesurfer.setVolume(currentStep_audio_meta?.volume);
		}

		// ensure wavesurfer's play-position matches the progression through the current-step
		if (isPlayingGetter() && currentStep_audio?.file == audioFile) {
			const getTargetAudioTime = ()=>{
				/*const percentThroughStep = GetPercentFromXToY(currentStep_startTimeInTimeline, currentStep_endTimeInTimeline, timeGetter());
				//if (currentStepAudioSegment.endTime == null) return null; // end-time unknown, so we can't know the exact point in the audio that we're supposed to target/seek-to
				const targetAudioTime = Lerp(currentStepAudioClipEnhanced.startTime, currentStepAudioClipEnhanced.endTime!, percentThroughStep);
				return targetAudioTime;*/
				const timeSinceStepStart = timeGetter() - currentStep_startTimeInTimeline;
				return timeSinceStepStart; // for now, time-in-step is same as time-in-audio-take
			};

			// if different segment is active than last time, or precise target audio-time is *less* than that of last render (ie. user skipped back a bit within same step), then do audio-load (with seeking)
			const wavesurferTimeDiffFromTarget = wavesurfer.getCurrentTime().Distance(getTargetAudioTime());
			// if wavesurfer's playback drifts >=0.Xs from target-time, seek to the correct time
			//console.log(wavesurfer.getCurrentTime() - getTargetAudioTime());
			const timeDiffTolerance = .3 * playSpeedGetter(); // todo: maybe reduce this tolerance range, and/or make it adjustable (whether manually or automatically based on perf stats)
			if (wavesurferTimeDiffFromTarget > timeDiffTolerance) {
				const doLoad = ()=>{
					const targetAudioTime = getTargetAudioTime();
					wavesurfer.seekTo(targetAudioTime / wavesurfer.getDuration());
					if (!wavesurfer.isPlaying()) wavesurfer.play();
				};

				if (this.wavesurferReady) {
					doLoad();
				} else {
					this.wavesurfer_onReady = ()=>doLoad();
				}
			}
		} else {
			wavesurfer.pause();
		}

		return (
			<div style={{position: "absolute", left: 0, top: 0, width: "100%", display: "none"}} ref={c=>{
				if (c) {
					this.wavesurferRoot = c;
					wavesurfer.setOptions({container: this.wavesurferRoot});
				}
			}}/>
		);
	}
}