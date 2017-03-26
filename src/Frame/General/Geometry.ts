interface Rect {
	x: number;
	y: number;
	//width: number;
	readonly Right;
	//height: number;
	readonly Bottom;
}
interface Circle {
	x: number;
	y: number;
	radius: number;
}
export function GetDistanceBetweenRectAndCircle(rect: Rect, circle: Circle) {
	// find the closest point to the circle within the rectangle
	let closestX = circle.x.KeepBetween(rect.x, rect.Right);
	let closestY = circle.y.KeepBetween(rect.y, rect.Bottom);

	// calculate the distance between the circle's center and this closest point
	let distanceX = circle.x - closestX;
	let distanceY = circle.y - closestY;

	// if the distance is less than the circle's radius, an intersection occurs
	let distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);
	//return distanceSquared < (circle.radius * circle.radius);
	return distanceSquared.ToPower(1/2);
}
interface Vector2i {
	x: number;
	y: number;
}
export function GetDistanceBetweenRectAndPoint(rect: Rect, point: Vector2i) {
	return GetDistanceBetweenRectAndCircle(rect, {x: point.x, y: point.y, radius: 0});
}