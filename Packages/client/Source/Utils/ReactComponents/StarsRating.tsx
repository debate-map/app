import {BaseComponent} from "react-vextensions";
import {Row, Button, RowProps} from "react-vcomponents";
import {Icon} from "web-vcore";
import {Range, E} from "js-vextensions";

export type StarsRating_Props = {
	value: number, onChange: (value: number)=>any, titleFunc?: (starValue: number)=>string,
	rightClickAction?: "clear" | ((e: React.MouseEvent)=>any),
} & RowProps;

export class StarsRating extends BaseComponent<StarsRating_Props, {}> {
	static defaultProps = {titleFunc: starValue=>`Rate ${starValue} stars (right-click to clear)`, rightClickAction: "clear"};
	render() {
		const {value, onChange, rightClickAction, titleFunc, style, ...rest} = this.props;
		return (
			<Row {...rest} style={E({alignItems: "center"}, style)}>
				{Range(1, 5).map(starValue=>{
					return (
						<Button key={starValue} size={20} mdIcon={value >= starValue ? "star" : "star-outline"}
							title={titleFunc ? titleFunc(starValue) : `Set rating to ${starValue} stars`}
							onClick={()=>{
								onChange(starValue);
							}}
							onContextMenu={e=>{
								if (rightClickAction == "clear") {
									e.preventDefault();
									onChange(0);
									return;
								}
								if (rightClickAction instanceof Function) {
									return rightClickAction(e);
								}
							}}/>
					);
				})}
			</Row>
		);
	}
}