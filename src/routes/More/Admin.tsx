import {BaseComponent} from "../../Frame/UI/ReactGlobals";
import {firebaseConnect} from "react-redux-firebase";
import Button from "../../Frame/ReactComponents/Button";
import VMessageBox from "../../Frame/UI/VMessageBox";

@firebaseConnect()
export default class AdminUI extends BaseComponent<{}, {}> {
	render() {
		return (
			<div>
				<Button text="Reset database" onClick={()=> {
					VMessageBox.ShowConfirmationBox({
						title: "Reset database?", message: "This will clear all existing data.",
						onOK: ()=> {
							alert("Resetting database...");
						}
					});
				}}/>
			</div>
		);
	}
}