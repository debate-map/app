import {store} from "Store";
import {GetMapState, GetSelectedTimeline, GetTimelineInEditMode, GetTimelinePanelOpen} from "Store/main/maps/mapStates/$mapState.js";
import {liveSkin} from "Utils/Styles/SkinManager.js";
import {RunWithRenderingBatchedAndBailsCaught} from "Utils/UI/General.js";
import {GenerateSafeID, GetTimelineStepTimeFromStart, GetTimelineSteps, DMap, MeID, Timeline, TimelineStep, PERMISSIONS} from "dm_common";
import React, {useCallback, useEffect, useMemo, useReducer, useRef} from "react";
import ReactList from "react-list";
import {ES, GetViewportRect, HSLA, Icon, O, PosChangeSource, RunInAction, RunInAction_Set, TextPlus, UseSize, YoutubePlayer, YoutubePlayerUI} from "web-vcore";
import {GetPercentFromXToY, Lerp, Timer, Vector2, WaitXThenRun, ea} from "js-vextensions";
import {computed, makeObservable, observable} from "mobx";
import {Button, CheckBox, Column, Row, Spinner, TimeSpanInput} from "react-vcomponents";
import {GetDOM} from "react-vextensions";
import {ScrollSource, ScrollView} from "react-vscrollview";
import {GetOpenMapID} from "Store/main.js";
import {DroppableInfo} from "Utils/UI/DNDStructures.js";
import {Droppable, DroppableProvided, DroppableStateSnapshot} from "@hello-pangea/dnd";
import {GetPlaybackCurrentStepIndex} from "Store/main/maps/mapStates/PlaybackAccessors/Basic.js";
import {IsTimelineStepActive} from "Store/main/maps/mapStates/PlaybackAccessors/ForSteps.js";
import {GetAudioFilesActiveForTimeline} from "Utils/OPFS/Map/OPFS_Step.js";
import {TimelineAudioFilePlayer} from "./StepList/TimelineAudioFilePlayer.js";
import {StepUI} from "./StepList/StepUI.js";
import {RecordDropdown} from "./StepList/RecordDropdown.js";
import {AddTimelineStep_Simple} from "./StepList/Editing/StepEditorUI.js";
import {observer_mgl} from "mobx-graphlink";

// for use by hello-pangea-dnd (using text-replacement/node-modules-patching)
G({LockMapEdgeScrolling});
function LockMapEdgeScrolling() {
	const mapID = GetOpenMapID();
	if (mapID == null) return;
	return store.main.maps.lockMapScrolling && GetTimelinePanelOpen(mapID) && GetTimelineInEditMode(mapID);
}

class NoVideoPlayer {
	constructor(comp: StepListElem) {
		this.comp = comp;
	}

	comp: StepListElem;

	@O accessor speed = 1;
	SetSpeed(speed: number) {
		this.speed = speed;
		this.timer.intervalInMS = (1000 / 30) / speed;
		if (this.playing) {
			this.timer.Start();
		}
	}

	@O accessor playing = false;
	SetPlaying(playing: boolean) {
		RunInAction("NoVideoPlayer.SetPlaying", ()=>this.playing = playing);
		this.timer.Enabled = playing;
		if (playing) this.timer_ticksSinceStart = 0;
	}

	timer_ticksSinceStart = 0;
	timer = new Timer(1000 / 30, ()=>{
		this.timer_ticksSinceStart++;
		let framesToProgress = 2; // 2 frames = 1/30th of a second

		// if parent component gets unmounted, stop the timer (parent *should* call `SetPlaying(false)` itself, but this is a reasonable safety hatch)
		if (!this.comp.isMounted) return void this.timer.Stop();

		// Apparently, Timer/setInterval can easily "fall behind" on the number of ticks that end up running!
		// To fix this, detect whenever our fall-behind amount is enough to warrant another half-tick (equating to 1 frame), and execute that half-tick synthetically.
		const timeSinceStart = Date.now() - this.timer.startTime;
		const ticksExpectedSinceStart = timeSinceStart / this.timer.intervalInMS;
		const ticksLost = ()=>ticksExpectedSinceStart - this.timer_ticksSinceStart;
		while (ticksLost() >= .5) {
			this.timer_ticksSinceStart += .5;
			framesToProgress += 1;
		}
		this.comp.adjustTargetTimeByFrames(framesToProgress);
	});
}

type StepListElem = {
	get isMounted(): boolean
	adjustTargetTimeByFrames(frameDelta: number): void
	setTargetTime(newTargetTime: number, source: PosChangeSource): void
};

let _instance: StepListElem|n;
export const getStepListInstance = (): StepListElem | null=>{
	return (_instance && _instance.isMounted)
		? _instance
		: null;
};

type StepList_Props = {
	map: DMap,
	timeline: Timeline
};

export const StepList = observer_mgl((props: StepList_Props)=>{
	const {map} = props;

	const [_, reRender] = useReducer(a=>a+1, 0);
	const playerRef = useRef<YoutubePlayer>(null);
	const instanceRef = useRef<StepListElem>({
		get isMounted(): boolean {
			return isMountedRef.current
		},
		adjustTargetTimeByFrames(frameDelta: number) {
			adjustTargetTimeByFrames(frameDelta)
		},
		setTargetTime(newTargetTime: number, source: PosChangeSource) {
			setTargetTime(newTargetTime, source)
		}
	});
	const noVideoPlayerRef = useRef<NoVideoPlayer>(new NoVideoPlayer(instanceRef.current));
	const listRootElRef = useRef<HTMLDivElement>(null);
	const sideBarElRef = useRef<HTMLDivElement>(null);
	const stepElementsRef = useRef<HTMLDivElement[]>([]);
	const stepElements_updateTimesRef = useRef<{}>({});
	const lastPosChangeSourceRef = useRef<PosChangeSource>(null);
	const stepsRef = useRef<TimelineStep[]>([]);
	const creatorOrModRef = useRef(false);
	const listRef = useRef<ReactList>(null);
	const stepListRef = useRef<ReactList>(null);

	const isMountedRef = useRef(false);
	useEffect(()=>{
		isMountedRef.current = true;
		return ()=>{
			isMountedRef.current = false;
		}
	}, []);

	const self = useMemo(()=>{
	    return makeObservable(
	        {
	            listY: null as number|n,
	            messageAreaHeight: 0,
	            targetTime: null as number|n,
				get targetTime_yInMessageArea(){
					return self.sharedInfo.targetTime_yInMessageArea;
				},
				get targetTimeDirection(): "down" | "up" | "right" {
					return self.sharedInfo.targetTimeDirection || "down";
				},
				get sharedInfo() {
					const timeline = GetSelectedTimeline(map.id);

					let targetStepIndex: number|n;
					let targetTime_yInMessageArea: number|n;
					if (timeline) {
						const steps = GetTimelineSteps(timeline.id);
						const firstNormalStep = steps[1];
						const targetStep = steps.Skip(1).LastOrX(a=>a && IsTimelineStepActive(a, self.targetTime)) ?? firstNormalStep!;
						if (targetStep) {
							targetStepIndex = steps.indexOf(targetStep);
							const postTargetStepIndex = (targetStepIndex + 1).KeepAtMost(steps.length - 1); // if on last step, we want arrow to stop there, so consider last-step both the current-step and next-step (for arrow positioning)
							const postTargetStep: TimelineStep|n = steps[postTargetStepIndex];

							const targetStepTimeFromStart = GetTimelineStepTimeFromStart(targetStep);
							const postTargetStepTimeFromStart = GetTimelineStepTimeFromStart(postTargetStep);

							const targetStep_el = stepElementsRef.current[targetStepIndex];
							if (postTargetStep && targetStep_el && document.body.contains(targetStep_el)) {
								const listRoot = targetStep_el.parentElement!.parentElement!.parentElement!;
								const listRect = GetViewportRect(listRoot);
								const targetStep_rect = GetViewportRect(targetStep_el);
								targetStep_rect.Position = targetStep_rect.Position.Minus(listRect.Position);

								const percentThroughStep = GetPercentFromXToY(targetStepTimeFromStart ?? 0, postTargetStepTimeFromStart ?? 0, self.targetTime!);
								const targetTime_yInList = Lerp(targetStep_rect.Top, targetStep_rect.Bottom, percentThroughStep);
								const messageAreaY = GetViewportRect(sideBarElRef.current!).y;
								const messageAreaYDiffFromListY = messageAreaY - self.listY!;
								targetTime_yInMessageArea = targetTime_yInList - messageAreaYDiffFromListY;

								if (isNaN(targetTime_yInMessageArea)) {
									targetTime_yInMessageArea = 0;
								}
							}
						}
					}

					let targetTimeDirection;
					if (targetTime_yInMessageArea != null) {
						if (targetTime_yInMessageArea < 0) targetTimeDirection = "up";
						else if (targetTime_yInMessageArea >= self.messageAreaHeight - 20) targetTimeDirection = "down";
						else targetTimeDirection = "right";
					} else if (listRef.current) {
						const [firstVisibleIndex, lastVisibleIndex] = listRef.current.getVisibleRange();
						targetTimeDirection = (targetStepIndex ?? 0) <= firstVisibleIndex ? "up" : "down";
						targetTime_yInMessageArea = targetTimeDirection == "up" ? 0 : this.messageAreaHeight - 20;
					}

					return {targetTime_yInMessageArea, targetTimeDirection};
				}
	        },
	        {
	            listY: observable,
	            messageAreaHeight: observable,
	            targetTime: observable,
				sharedInfo: computed,
				targetTime_yInMessageArea: computed,
				targetTimeDirection: computed,
	        }
	    );
	}, [map.id]);

	const timerRef = useRef<Timer>(new Timer(100, ()=>RunWithRenderingBatchedAndBailsCaught(()=>{
		if (listRootElRef.current == null) return; // if something goes wrong with rendering, we don't want to keep spewing new errors

		const newListY = GetViewportRect(listRootElRef.current).y;
		if (self.listY != newListY) {
			RunInAction("StepList_timer.setListY", ()=>self.listY = newListY);
		}

		const mapState = GetMapState(map.id);
		if (mapState == null) return void console.warn("Map-state not found for map:", map.id);

		const timeline = GetSelectedTimeline(map.id);
		const oldCurrentStepIndex = GetPlaybackCurrentStepIndex() ?? 0;
		if (timeline && self.targetTime != null) {
			const steps = GetTimelineSteps(timeline.id);
			const firstStep = steps[0];

			const targetStep = steps.LastOrX(a=>a && IsTimelineStepActive(a, self.targetTime)) ?? firstStep;
			if (targetStep) {
				const newCurrentStepIndex = steps.indexOf(targetStep);
				//const newAppliedStepIndex = newCurrentStepIndex; // commented; for now, have applied-step always match the current-step
				if (newCurrentStepIndex != oldCurrentStepIndex) {
					RunInAction("StepList_timer.setStepAndAppliedStep", ()=>{
						mapState.playingTimeline_step = newCurrentStepIndex;
						// commented; see TimelineNodeFocuser.ts instead
						/*if (newAppliedStepIndex > oldAppliedStepIndex) {
							for (let i = oldAppliedStepIndex + 1; i <= newAppliedStepIndex; i++) {
								const step = steps[i];
								for (const nodeReveal of step.nodeReveals) {
									ACTNodeExpandedSet({mapID: map.id, path: nodeReveal.path, expanded: nodeReveal.show, expandAncestors: true}});
								}
							}
						}*/
					});

					if (store.main.timelines.autoScroll && lastPosChangeSourceRef.current == "playback") {
						// jump one further down, so that the target point *within* the target step is visible (and with enough space for the arrow button itself)
						// this.list.scrollAround(newTargetStepIndex + 1);
						// jump X further down, so that we see some of the upcoming text (also for if video-time data is off some)
						listRef.current!.scrollAround(newCurrentStepIndex + 3);
						WaitXThenRun(0, ()=>listRef.current!.scrollAround(newCurrentStepIndex)); // make sure target box itself is still visible, however
					}
				}
			}
		}
	})));

	const setTargetTime = (newTargetTime: number, source: PosChangeSource)=>{
		const mapState = GetMapState(map.id);
		if (mapState == null) return;
		RunInAction("StepList.SetTargetTime", ()=>{
			self.targetTime = newTargetTime;

			// commented; for node/line animation to work, the global timeline-time field must be updated
			/*if (newTargetTime.FloorTo(1) != mapState.playingTimeline_time) {
				mapState.playingTimeline_time = newTargetTime.FloorTo(1);
			}*/
			mapState.playingTimeline_time = newTargetTime;
			lastPosChangeSourceRef.current = source;
		});
	};

	const adjustTargetTimeByFrames = (frameDelta: number)=>{
		const newTargetTime = (self.targetTime ?? 0) + (frameDelta * (1 / 60));
		setTargetTime(newTargetTime.KeepAtLeast(0), "setPosition");
	};

	const estimateStepHeight = (index: number, cache: any)=>{
		return 100;
	};

	const renderStep = (index: number, key: any)=>{
		const {timeline} = props;
		const steps = stepsRef.current;
		if (steps == null) return <div key={key}/>;
		const step = steps[index];

		return <StepUI key={step.id} index={index} last={index == steps.length - 1}
				map={map} timeline={timeline} steps={steps} step={step}
				player={playerRef.current!}
				ref={c=>{
					if (c == null) return;
					stepElementsRef.current[index] = c as any;
					stepElements_updateTimesRef.current[index] = Date.now();
				}}
		/>;
	};

	const onScroll = (e: React.UIEvent<HTMLDivElement>, source: ScrollSource, pos: any)=>{
		// we only change auto-scroll status if the user initiated the scroll
		if (source == ScrollSource.Code) return;

		// this processing is here rather than in timer, because only this OnScroll function is told whether the scroll was user-initiated
		if (self.targetTimeDirection != "right") {
			RunInAction("StepList.OnScroll", ()=>store.main.timelines.autoScroll = false);
		}
	};

	const mapState = GetMapState(map.id);
	if (mapState == null) return null;
	const steps = props.timeline ? GetTimelineSteps(props.timeline.id) : ea;
	const targetStepIndex = GetPlaybackCurrentStepIndex();
	const audioFiles = props.timeline ? GetAudioFilesActiveForTimeline(map.id, props.timeline.id) : [];
	const creatorOrMod = PERMISSIONS.Timeline.Modify(MeID(), props.timeline);

	stepsRef.current = steps;
	creatorOrModRef.current = creatorOrMod;

	const [messageAreaRef, {height: messageAreaHeight}] = UseSize(); // todo: maybe switch this to use `useResizeObserver()`, so reacts to [css/window]-only height changes
	// todo: make sure this is correct
	useEffect(()=>{
		RunInAction("StepList.render.useEffect", ()=>self.messageAreaHeight = messageAreaHeight ?? 0); // set for other observers
	});

	useEffect(()=>{
		_instance = instanceRef.current;
		return ()=>{
			if (_instance === instanceRef.current) _instance = null;
		}
	},[]);

	// update some stuff based on timer (since user may have scrolled)
	useEffect(()=>{
		timerRef.current.Start();
		return ()=>{
			timerRef.current.Stop();
			// when component is unmounted...
			// stop the non-component-based timers/players
			noVideoPlayerRef.current.SetPlaying(false);
			// store the exact timeline playing-time (so it can be restored exactly to StepList.targetTime when component is re-mounted)
			RunInAction("StepList.onUnmount", ()=>mapState!.playingTimeline_time = self.targetTime);
		};
	}, ["depToEnsureEffectRunsOnFirstNonBailedRender"]); // eslint-disable-line

	const droppableInfo = new DroppableInfo({type: "TimelineStepList", timelineID: props.timeline ? props.timeline.id : null});

	const reactList = ()=>{
		return <ReactList type='variable' length={steps?.length ?? 0}
			ref={useCallback(c=>{
				listRef.current = c
				if (c) {
					// TODO: figure out another way coz GetDOM(c) doesn't work in react 19
					listRootElRef.current = GetDOM(c) as any;
				}
			}, [])}
			initialIndex={targetStepIndex ?? 0}
			itemSizeEstimator={estimateStepHeight}
			itemRenderer={renderStep}/>;
	};

	// todo: make-so the UseCallbacks below can't break from this early-return changing the hook-count
	// (atm, not triggering since timeline is always ready when this comp renders)
	if (props.timeline == null) return null;
	return (
		<Column style={{flex: 1, minHeight: 0}}>
			{props.timeline.videoID == null && <div ref={c=>{
				// if no video is attached, use this empty div as an alternative route to setting the targetTime field
				if (c && self.targetTime == null) {
					RunInAction("StepList.targetTimeInitializer.onAttach", ()=>self.targetTime = mapState.playingTimeline_time ?? 0);
				}
			}}/>}
			{props.timeline.videoID &&
			<YoutubePlayerUI /* ref={videoRef} */ videoID={props.timeline.videoID} startTime={mapState.playingTimeline_time || (props.timeline.videoStartTime ?? undefined)} heightVSWidthPercent={props.timeline.videoHeightVSWidthPercent ?? .56}
				onPlayerInitialized={player=>{
					playerRef.current = player;
					player.GetPlayerUI().style.position = "absolute";
					reRender();
				}}
				onPosChanged={(pos, source)=>{
					if (pos == 0) return; // ignore "pos 0" event; this just happens when the video first loads (even if seek-to time set otherwise)
					setTargetTime(pos, source);
				}}/>}
			{audioFiles.map((audioFile, index)=>{
				// ensure that each audio File object has a unique ID, and thus a unique TimelineAudioFilePlayer associated with it (the comp is not resilient to audio file/blob switchouts atm)
				if (audioFile["vID"] == null) audioFile["vID"] = GenerateSafeID();
				//const key = `${index}_${audioFile.name}`;
				const key = audioFile["vID"];

				return <TimelineAudioFilePlayer key={key} map={map} timeline={props.timeline} steps={steps} audioFile={audioFile}
					playSpeedGetter={()=>noVideoPlayerRef.current.speed} isPlayingGetter={()=>noVideoPlayerRef.current.playing} timeGetter={()=>self.targetTime!}/>;
			})}
			<Row style={{height: 30, background: liveSkin.BasePanelBackgroundColor().css()}}>
				<CheckBox text="Playback:" value={mapState.timelinePlayback} onChange={val=>RunInAction_Set(()=>mapState.timelinePlayback = val)}/>
				<Button ml={5} mdIcon={noVideoPlayerRef.current.playing ? "pause" : "play"} size={30} onClick={()=>noVideoPlayerRef.current?.SetPlaying(!noVideoPlayerRef.current.playing)}/>
				<Spinner style={{width: 45}} instant={true} min={0} max={10} step={.1} value={noVideoPlayerRef.current.speed} onChange={val=>noVideoPlayerRef.current.SetSpeed(val)}/>
				<TimeSpanInput largeUnit="minute" smallUnit="second" style={{width: 60}} value={self.targetTime ?? 0} onChange={val=>{
					setTargetTime(val, "setPosition");
				}}/>
				<TextPlus ml={3} info="With mouse over button, mouse scroll-wheel moves forward/backward by X frames.">Seek:</TextPlus>
				<Button text="±1" ml={3} p={5} onClick={()=>adjustTargetTimeByFrames(1)} onWheel={e=>adjustTargetTimeByFrames(Math.sign(e.deltaY) * 1)}/>
				<Button text="±5" ml={3} p={5} onClick={()=>adjustTargetTimeByFrames(5)} onWheel={e=>adjustTargetTimeByFrames(Math.sign(e.deltaY) * 5)}/>
				<Button text="±20" ml={3} p={5} onClick={()=>adjustTargetTimeByFrames(20)} onWheel={e=>adjustTargetTimeByFrames(Math.sign(e.deltaY) * 20)}/>
				<Button text="±60" ml={3} p={5} onClick={()=>adjustTargetTimeByFrames(60)} onWheel={e=>adjustTargetTimeByFrames(Math.sign(e.deltaY) * 60)}/>
				<Button text="±600" ml={3} p={5} onClick={()=>adjustTargetTimeByFrames(600)} onWheel={e=>adjustTargetTimeByFrames(Math.sign(e.deltaY) * 600)}/>

				<Row ml="auto" style={{position: "relative"}}>
					<RecordDropdown/>
				</Row>
			</Row>
			<Row ref={c=>c && c.DOM && messageAreaRef(c.DOM)} style={{flex: 1, minHeight: 0}}>
				<Column ref={c=>sideBarElRef.current = c ? c.root as any : null} style={{position: "relative", width: 20, background: HSLA(0, 0, 0, 1)}}>
					<Button text={<Icon icon={`arrow-${self.targetTimeDirection}`} size={20}/>}
						style={{
							background: "none", padding: 0, position: "absolute",
							top: self.targetTime_yInMessageArea ? self.targetTime_yInMessageArea.KeepBetween(0, (messageAreaHeight ?? 0) - 20) : 0,
							filter: store.main.timelines.autoScroll ? "sepia(1) saturate(15) hue-rotate(55deg)" : null,
						}}
						onClick={useCallback(()=>{
							if (listRef.current == null || targetStepIndex == null) return;
							const targetOffScreen = self.targetTimeDirection != "right";
							if (targetOffScreen) {
								if (self.targetTimeDirection == "down") {
									listRef.current.scrollAround(targetStepIndex + 1); // jump one further down, so that the target point *within* the target step is visible (and with enough space for the arrow button itself)
								} else {
									listRef.current.scrollAround(targetStepIndex);
								}
							}

							const newAutoScroll = !store.main.timelines.autoScroll;
							RunInAction("StepList.targetArrow.onClick", ()=>store.main.timelines.autoScroll = newAutoScroll);
						}, [targetStepIndex, self.targetTimeDirection])}/>
				</Column>
				<ScrollView className="brightScrollBars" style={ES({flex: 1})}
					contentStyle={ES({
						flex: 1, position: "relative", padding: 7,
						//filter: "drop-shadow(rgb(0, 0, 0) 0px 0px 10px)",
						background: "rgba(0,0,0,1)",
						minHeight: "100%", // since we're setting a background, make sure it fills the whole scroll-view area
					})}
					scrollVBarStyle={{width: 7}} // width:7 to match with container padding
					onScroll={onScroll}
				>
					{!mapState.timelineEditMode && reactList()}
					{mapState.timelineEditMode &&
					<Droppable type="TimelineStep" droppableId={JSON.stringify(droppableInfo.VSet({timelineID: props.timeline.id}))} isDropDisabled={!creatorOrMod}>
						{(provided: DroppableProvided, snapshot: DroppableStateSnapshot)=>{
							return (
								<Column ref={c=>provided.innerRef(c?.root as any)} {...provided.droppableProps}>
									{reactList()}
									{steps.length == 0 && !mapState.timelineEditMode && <Row>Switch to edit-mode to add steps.</Row>}
									{mapState.timelineEditMode &&
									<Row style={{justifyContent: "center"}}>
										<Button text="Add timeline step" mt={5} mb={5} enabled={creatorOrMod} onClick={()=>{
											AddTimelineStep_Simple(props.timeline.id, steps, steps.length);
										}}/>
									</Row>}
								</Column>
							);
						}}
					</Droppable>}
				</ScrollView>
			</Row>
		</Column>
	);
})
