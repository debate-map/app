use std::collections::HashMap;

use once_cell::sync::Lazy;
use rust_shared::itertools::Itertools;
use rust_shared::rust_macros::wrap_slow_macros;
use rust_shared::async_graphql;
use rust_shared::async_graphql::{Enum};
use rust_shared::utils::general::average;
use serde::{Serialize, Deserialize};

wrap_slow_macros!{

#[derive(Enum, Copy, Clone, Eq, PartialEq, Serialize, Deserialize, Hash)]
pub enum NodeRatingType {
    #[graphql(name = "significance")] significance,
    #[graphql(name = "neutrality")] neutrality,
    #[graphql(name = "truth")] truth,
    #[graphql(name = "relevance")] relevance,
    #[graphql(name = "impact")] impact,
}

}

//#[derive(Clone)]
pub struct ValueRange {
	pub min: f64,
	pub max: f64,
	pub center: f64, // if range is not even, round toward the global mid-point (ie. 50)
	pub label: String,
}
pub fn rating_value_is_in_range(value: f64, range: &ValueRange) -> bool {
	// mid-point is intentionally part of both leftSide and rightSide; this causes its range to be shrunk on both sides (achieving target behavior)
	let left_side = range.min < 50f64;
	let right_side = range.max > 50f64;

	let mut min_adjusted = range.min;
	let mut max_adjusted = range.max;
	// we use different logic on left and right sides; when value is exactly between two ranges, categorize it as being in the range farther from 50 (the mid-point)
	if left_side && min_adjusted != 0f64 { min_adjusted += 0.001; }
	if right_side && max_adjusted != 100f64 { max_adjusted -= 0.001; }
	
	return value >= min_adjusted && value <= max_adjusted;
}

//#[derive(Clone)]
pub struct RatingType_Info {
	pub displayText: String,
	/*description: string | ((..._)=>JSX_Element);
	labels: number[];
	values: number[];
	tickInterval: number;*/
	pub valueRanges: Vec<ValueRange>,
}
// sync:js
pub static BASE_RATING_TYPE_INFO: Lazy<HashMap<NodeRatingType, RatingType_Info>> = Lazy::new(|| {
    HashMap::from([
        (NodeRatingType::significance, RatingType_Info {
            displayText: "Significance".to_owned(),
            valueRanges: generate_val_ranges_from_labels(&["Pointless", "Unimportant", "Somewhat Important", "Important", "Extremely Important"]),
        }),
        (NodeRatingType::neutrality, RatingType_Info {
            displayText: "Neutrality".to_owned(),
            valueRanges: generate_val_ranges_from_labels(&["Unbiased", "Slightly Biased", "Moderately Biased", "Highly Biased", "Extremely Biased"]),
        }),
        (NodeRatingType::truth, RatingType_Info {
            displayText: "Agreement".to_owned(),
            //valueLabels: {0: "Thoroughly false", 25: "Mostly false", 50: "Somewhat true", 75: "Mostly true", 100: "Thoroughly true"},
            //valueLabels: {0: "Strongly disagree", 20: "Disagree", 35: "Somewhat disagree", 50: "Neutral", 65: "Somewhat agree", 80: "Agree", 100: "Strongly agree"},
            valueRanges: generate_val_ranges_from_labels(&["Strongly Disagree", "Disagree", "Somewhat Disagree", "Neutral", "Somewhat Agree", "Agree", "Strongly Agree"]),
            //valueLabels: {0: "Disagree (strongly)", 20: "Disagree", 35: "Disagree (somewhat)", 50: "Neutral", 65: "Agree (somewhat)", 80: "Agree", 100: "Agree (strongly)"},
        }),
        (NodeRatingType::relevance, RatingType_Info {
            displayText: "Relevance".to_owned(),
            //valueRanges: generate_val_ranges_from_labels(["Completely Irrelevant", "Slightly Relevant", "Moderately Relevant", "Highly Relevant", "Extremely Relevant"]),
            valueRanges: generate_val_ranges_from_labels(&["Not Relevant", "Slightly Relevant", "Somewhat Relevant", "Relevant", "Substantially Relevant", "Highly Relevant", "Extremely Relevant"]),
        }),
        (NodeRatingType::impact, RatingType_Info {
            displayText: "Impact".to_owned(),
            //valueRanges: generate_val_ranges_from_labels(["Thoroughly False", "Mostly False", "Somewhat True", "Mostly True", "Game-Changer"]),
            valueRanges: generate_val_ranges_from_labels(&["[unnamed range]"]), // must have one range entry, so UpdateNodeRatingSummaries() can store the impact-rating count, with consistent code
        }),
    ])
});

pub fn get_rating_type_info(rating_type: NodeRatingType) -> &'static RatingType_Info {
	//return BASE_RATING_TYPE_INFO[&rating_type].clone();
	return &BASE_RATING_TYPE_INFO[&rating_type];
}

// sync:js
pub fn generate_val_ranges_from_labels(labels: &[&str]) -> Vec<ValueRange> {
	let ranges: Vec<(f64, f64)> = match labels.len() {
        1 => vec![
            (0, 100)	// center: 50
        ].into_iter().map(|(a, b)| (a as f64, b as f64)).collect_vec(),
        // range covered by each entry: 20 [100/5 = 20]
        5 => vec![
            (0, 20),	// center: 10
            (20, 40),	// center: 30
            (40, 60),	// center: 50
            (60, 80),	// center: 70
            (80, 100)	// center: 90
        ].into_iter().map(|(a, b)| (a as f64, b as f64)).collect_vec(),
        // range covered by each entry: 14 (other than first and last, which each cover 15) [100/5 = 14.2857142857]
        7 => vec![
            (0, 15),	// center: 8 (rounded up, since 50 is anchor)
            (15, 30),	// center: 22
            (30, 45),	// center: 36
            (45, 55),	// center: 50
            (55, 70),	// center: 64
            (70, 85),	// center: 78
            (85, 100)	// center: 92 (rounded down, since 50 is anchor)
        ].into_iter().map(|(a, b)| (a as f64, b as f64)).collect_vec(),
        _ => panic!("Label-count ({}) doesn't match any of the implemented values (1,5,7).", labels.len()),
    };
	ranges.into_iter().enumerate().map(|(index, range)| {
		let label = labels[index];
		//const rangeDist = range[1] - range[0];
		let center_fractional = average(&[range.0, range.1]);
		return ValueRange {
			min: range.0,
			max: range.1,
			center:
                if center_fractional.fract() == 0.0 { center_fractional } // if average is int, use that
                else if range.0 < 50f64 { center_fractional.floor() + 1f64 } // else, if below 50 (anchor), round up toward it
				else { center_fractional.floor() }, // else, must be above 50 (anchor), so round down toward it
			label: label.to_owned(),
		};
	}).collect_vec()
}