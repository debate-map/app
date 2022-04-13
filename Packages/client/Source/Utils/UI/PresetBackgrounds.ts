import {BackgroundConfig} from "Store/db_ext/users/$user";

// To test out backgrounds, run this in console: S = a=>document.querySelector(".background").style.backgroundImage = `url(${a.split("?")[0]})`;
// Then run: S("IMAGE_URL")

export const defaultPresetBackground = "n60KYTsHSZqUuyEQxSn000";
export const presetBackgrounds = {
	n60KYTsHSZqUuyEQxSn000: {
		/*color: "#eee",
		url_max: "none",
		position: "0 0",*/
		url_max: "background: repeat 0/5px 5px linear-gradient(90deg,rgba(0,0,0,.05) 1px,transparent 0), repeat 0/5px 5px linear-gradient(180deg,rgba(0,0,0,.05) 1px,transparent 0), #eee",
	},
	n60KYTsHSZqUuyEQxSn001: {
		color: "#E5E8EC",
	},
	irZEimSpTpu_TCCiejBAfA: {
		url_1920: "https://firebasestorage.googleapis.com/v0/b/canonical-debate-prod.appspot.com/o/backgrounds%2FirZEimSpTpu_TCCiejBAfA_x1920.jpg?alt=media&token=ab42212d-48c5-4e2f-9ef8-072d85c252a2",
		url_3840: "https://firebasestorage.googleapis.com/v0/b/canonical-debate-prod.appspot.com/o/backgrounds%2FirZEimSpTpu_TCCiejBAfA_x2560.jpg?alt=media&token=de53c9f5-3f29-4a71-983e-5758e1c7121b",
	},
	CIhC7K5qRAyjj7uxoEf3sA: {
		url_1920: "https://firebasestorage.googleapis.com/v0/b/canonical-debate-prod.appspot.com/o/backgrounds%2FCIhC7K5qRAyjj7uxoEf3sA_x1920.jpg?alt=media&token=1071fee9-2615-4e47-9d63-5776884dcf19",
		url_3840: "https://firebasestorage.googleapis.com/v0/b/canonical-debate-prod.appspot.com/o/backgrounds%2FCIhC7K5qRAyjj7uxoEf3sA_x3840.jpg?alt=media&token=79e2e9b6-b5ae-47a8-8e8e-b1eabee65238",
		position: "center bottom",
	},
	// the entries without fields provided are filled-in by the code at the bottom of this file
	"3dUKlcMOSN6ENstC_YIN8g": {},
	tspvGTFhR9uSXoIErUwnSQ: {
		position: "center bottom",
	},
	bfF7Wk6ZSzub9ixpQxZZog: {},
	Ofe2PazuRtS98X3jOVCxSQ: {},
	"O-OgyYQLTbe5saP_7UPYuQ": {},
	"H-lm4J81Q8iWSvCaqcHaLQ": {},
	"BhWQnMLRS0a_7J-pRGS5ig": {},
	ou5iDV8zRNai7xF7i8ZW4A: {},
	"kjmG-vk-TFKeojwOj-Bb8A": {},
	Ty5P_GksSKmoZtBtqWOUXw: {},
	Ny0_QfOzSuuVbyU6WmZORw: {},
	iIkucA5xTRqPBfAhugOEdA: {},
	"6OVu0_4dTLKm6fbe0WZmcg": {},
	"28KFofeUQq63fkzPO5Cohg": {},
	tAnHVBReS4eDNd4VXU34Kw: {},
	sWdX9QlWSpGhOFhO5XUT4w: {},
	I27EF3R5QRioAmAsbGADyw: {},
	NQQN7MxcTBKr1nksGXeF4A: {},
	C7EP77nYQ3W8Q8Fc4YVCuA: {},
	y_hKwWDzT9ODmPj0RN9ntQ: {},
	pgTAexRjTxWn4d70VRoVKw: {},
	"48MaIu80RxK1wYVLsb0CuQ": {},
	t8SLpAETQx2R4V7PqOdcAw: {},
	"3V3SNtmiT6imic1Xq7tPJw": {},
	GPVrwOtkSFad05UvKz5AGA: {},
	"8EJecJ_5TkG1lte3q-5ogQ": {},
	kYagvKa1TjWyG_oY8n8Hug: {},
	uORK7YkBTlqbKfb5o6ORhw: {},
	zUS_kxHBRm2YSg_l25wDxQ: {},
	AQLYx7jJSLaIOwni0TrYiw: {},
	cQDoYrwxSsGPRn_gBaGpCA: {},
	qrRZmogsSZOqankmjlJF1g: {},
	"X7ohzIH8Tx-nsq213-pJig": {},
	"woIqnY9LQEOXjFACKG-Xvg": {},
	FWRbluH9RPqttZGSioqT0A: {},
	"hLbEKpC7QK-Ubv6JTBJW9w": {},
	"90CaqhTIQzuhVokC4zfW5Q": {},
	tgAvB9yLRXG7Ip3zyD5ykQ: {},
	"Bh1XzmiRT-2h-DlY3ocMXA": {},
	"iqIiGV-pS-e9r1sp8L9ZAw": {},
	"S-thz4oZRc6t2C9J096GzQ": {},
	a2PcJvDbQR2yVqMA6uy2qQ: {},
	"9IKtTHhOSeCBYugeZns13g": {},
	"s7Us3NNzS6GmCdE-9LuDSQ": {},
	"8SEkRv6QT1eBXcGT0eIhGA": {},
	elevPB8jTb2TtyRYnG1C2w: {},
	C_RcylpdQjCl9uuiJ1utrQ: {},
	"-RD8s_wFRh6f--bO6wkUZA": {},
	Kdwu8UubSm6tdiQt8ABHCA: {},
	W9_1tWOzQ6W7yMSF3jDWOg: {
		size: "30%",
	},
	"-HxNv0cQSoO8QtyrePe0tw": {},
	"htxcrACjR16z3fl5TM-RAQ": {},
	"hLny2GjLR4GIV-wKMa0Mcw": {},
	"2k8-TMkxSFy9KRYN3Gwqdw": {},
	wQjPTK3_Soaz3ByEAccygg: {},
	g7xIKFB_QrOfjbooOynXmA: {},
} as any as {[key: string]: BackgroundConfig};

// infer the urls
for (const [key, background] of Object.entries(presetBackgrounds)) {
	const isImage = background.color == null;
	if (!isImage) continue;

	if (background.url_max == null) {
		background.url_max = `https://firebasestorage.googleapis.com/v0/b/canonical-debate-prod.appspot.com/o/backgrounds%2Foriginal%2F${key}.${background.extension || "jpg"}?alt=media`;
	}
	if (background.url_256 == null) {
		const fileName = background.url_max.match(/%2F([A-Za-z0-9_-]{22}(_x[0-9]+)?\.[a-z]+)/)?.[1];
		background.url_256 = `https://firebasestorage.googleapis.com/v0/b/canonical-debate-prod.appspot.com/o/backgrounds%2Fx256%2F${fileName}?alt=media`;
	}
}