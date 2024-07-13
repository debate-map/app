import {apolloClient} from "Utils/LibIntegrations/Apollo";
import {gql} from "@apollo/client";
import {NodeL1} from "dm_common";
import {AddChildNodeInput} from "./Command.js";

type UpdateNodeInput = {id: string, updates: Partial<NodeL1>};
export type CommandEntry = {addChildNode?: AddChildNodeInput, updateNode?: UpdateNodeInput, setParentNodeToResultOfCommandAtIndex?: number};
export type RunCommandBatchResult = {results: Object[], committed: boolean};

export function RunCommandBatch(commands: CommandEntry[], onProgress?: (subcommandsCompleted: number)=>void) {
	const fetchResult_subscription = apolloClient.subscribe<{runCommandBatch: RunCommandBatchResult}>({
		query: gql`
			subscription($input: RunCommandBatchInput!) {
				runCommandBatch(input: $input) { results committed }
			}
		`,
		variables: {input: {commands}},
	});
	return new Promise<RunCommandBatchResult>((resolve, reject)=>{
		const subscription = fetchResult_subscription.subscribe(data=>{
			if ((data.errors?.length ?? 0) > 0) {
				subscription.unsubscribe(); // unsubscribe if error occurs
				return void reject(new Error(`Error during RunCommandBatch: ${JSON.stringify(data.errors)}`));
			}
			if (data.data == null) {
				subscription.unsubscribe(); // unsubscribe if error occurs
				return void reject(new Error(`No data returned from RunCommandBatch.`));
			}

			const latestResult = data.data.runCommandBatch;
			onProgress?.(latestResult.results.length);
			if (latestResult.committed) {
				subscription.unsubscribe(); // unsubscribe if done
				resolve(latestResult);
			}
		});
	});
}