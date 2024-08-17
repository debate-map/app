import {SleepAsync} from "js-vextensions";
import {autorun, IAutorunOptions, IReactionDisposer, IReactionPublic} from "mobx";
import {CatchBail} from "mobx-graphlink";

export function AutoRun_HandleBail(view: (r: IReactionPublic)=>any, opts?: IAutorunOptions): IReactionDisposer {
	return autorun(()=>CatchBail(null, view), opts);
}
/*export async function AutoRun_HandleBail(view: (r: IReactionPublic)=>any, opts?: IAutorunOptions): Promise<IReactionDisposer> {
	for (let i = 0; i < 10; i++) {
		await SleepAsync(0); // wait a tick before starting; we want the scripts to parse/run, before we start mobx autoruns
	}
	return autorun(()=>CatchBail(null, view), opts);
}*/