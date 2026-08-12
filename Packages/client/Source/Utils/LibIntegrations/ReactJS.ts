import React from "react";

export function InitReactJS() {
	// patch React.createElement to do early prop validation
	const createElement_old = React.createElement;
	React.createElement = function(this: any, componentClass, props, ...rest) {
		if (componentClass.ValidateProps) {
			componentClass.ValidateProps(props);
		}
		return createElement_old(componentClass, props, ...rest) as any;
	};

	// You know what? It's better to just disable this until you specifically want to use it... (causes too many seemingly-false-positives otherwise)
	/* if (devEnv) {
		// this logs warning if a component doesn't have any props or state change, yet is re-rendered
		const {whyDidYouUpdate} = require("why-did-you-update");
		whyDidYouUpdate(React, {
			exclude: new RegExp(
				`connect|Connect|Link`
				+ `|Animate|Animation|Dot|ComposedDataDecorator|Chart|Curve|Route|ReferenceLine|Text` // from recharts
				+ `|Div` // from ScrollView (probably temp)
				//+ `|Button` // from react-social-button>react-bootstrap
				+ `|VReactMarkdown`
			),
		});
	} */
}