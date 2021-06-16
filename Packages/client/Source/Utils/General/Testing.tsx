export const testData = {};

/*G({DeclareDynamicTest}); declare global { function DeclareDynamicTest(id: number, steps: number); }
export function DeclareDynamicTest(testID: string, steps: number) {
	testData[testID] = {
		stepInfos: {},
	};
}*/

G({NotifyTestStepDone}); declare global { function NotifyTestStepDone(testID: string, stepNumber: number, stepInfo: string); }
export function NotifyTestStepDone(testID: string, stepNumber: number, stepInfo: string) {
	testData[testID] = testData[testID] || {stepInfos: {}};
	if (testData[testID].stepInfos.VKeys().length < stepNumber) {
		//LogWarning(`Step ${stepNumber} of test ${testID} completed; however, earlier step was not, so ignoring notification.`);
		return;
	}

	testData[testID].stepInfos[stepNumber] = stepInfo;
	Log(`Step ${stepNumber} of test ${testID} completed!`);
}

G({CheckTest}); declare global { function CheckTest(testID: string); }
export function CheckTest(testID: string) {
	console.dir(testData[testID]);
}