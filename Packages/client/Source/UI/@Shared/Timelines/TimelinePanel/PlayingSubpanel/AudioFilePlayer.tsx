import {GetPlayingTimelineAppliedStepIndex, GetPlayingTimelineStepIndex} from "Store/main/maps/mapStates/$mapState";
import {GetStepAudioClipEnhanced} from "Utils/OPFS/Map/AudioMeta";
import {OPFS_Map} from "Utils/OPFS/OPFS_Map";
import {GetTimelineStepTimesFromStart, Map, Timeline, TimelineStep} from "dm_common";
import {useMemo} from "react";
import {Row} from "react-vcomponents";
import WaveSurfer from "wavesurfer.js";
import {Observer} from "web-vcore";
import {GetPercentFromXToY, Lerp} from "web-vcore/nm/js-vextensions";
import {BaseComponent} from "web-vcore/nm/react-vextensions";

@Observer
export class AudioFilePlayer extends BaseComponent<{map: Map, timeline: Timeline, steps: TimelineStep[], audioFile: File, isPlayingGetter: ()=>boolean, timeGetter: ()=>number}, {}> {
	wavesurferRoot: HTMLDivElement|n;
	wavesurferReady = false;
	wavesurfer_onReady: (()=>any)|n;

	render() {
		const {map, timeline, steps, audioFile, isPlayingGetter, timeGetter} = this.props;
		const stepTimes = GetTimelineStepTimesFromStart(steps);
		const currentStepIndex = GetPlayingTimelineStepIndex(map.id) ?? 0;
		const currentStep = steps[currentStepIndex ?? -1];
		const currentStepAudioClipEnhanced = currentStepIndex != null && currentStep ? GetStepAudioClipEnhanced(currentStep, steps[currentStepIndex + 1], map.id) : null;
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

		// ensure wavesurfer's volume matches the setting for the current-step's clip
		if (currentStepAudioClipEnhanced?.volume != null && wavesurfer.getVolume() != currentStepAudioClipEnhanced.volume) {
			wavesurfer.setVolume(currentStepAudioClipEnhanced.volume);
		}

		// ensure wavesurfer's play-position matches the progression through the current-step
		if (isPlayingGetter() && currentStepAudioClipEnhanced?.audio.file == audioFile && currentStepAudioClipEnhanced.endTime != null) {
			const getTargetAudioTime = ()=>{
				const percentThroughStep = GetPercentFromXToY(currentStep_startTimeInTimeline, currentStep_endTimeInTimeline, timeGetter());
				//if (currentStepAudioSegment.endTime == null) return null; // end-time unknown, so we can't know the exact point in the audio that we're supposed to target/seek-to
				const targetAudioTime = Lerp(currentStepAudioClipEnhanced.startTime, currentStepAudioClipEnhanced.endTime!, percentThroughStep);
				return targetAudioTime;
			};

			// if different segment is active than last time, or precise target audio-time is *less* than that of last render (ie. user skipped back a bit within same step), then do audio-load (with seeking)
			const wavesurferTimeDiffFromTarget = wavesurfer.getCurrentTime().Distance(getTargetAudioTime());
			// if wavesurfer's playback drifts >=0.Xs from target-time, seek to the correct time
			//console.log(wavesurfer.getCurrentTime() - getTargetAudioTime());
			if (wavesurferTimeDiffFromTarget > .3) { // todo: maybe reduce this tolerance range, and/or make it adjustable (whether manually or automatically based on perf stats)
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