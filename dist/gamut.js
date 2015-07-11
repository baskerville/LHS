"use strict";

function _defineProperty(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); }

var merge = require("mout/object/merge");
var abs = Math.abs;

function Gamut(xyz, cam) {
	function contains(CAM) {
		var RGB = xyz.toRgb(cam.toXyz(CAM));
		return RGB[0] >= 0 && RGB[0] <= 1 && RGB[1] >= 0 && RGB[1] <= 1 && RGB[2] >= 0 && RGB[2] <= 1;
	}

	function limit(inCam, outCam) {
		var cor = arguments[2] === undefined ? "C" : arguments[2];
		var prec = arguments[3] === undefined ? 0.001 : arguments[3];

		var bot = inCam[cor],
		    top = outCam[cor];
		while (abs(top - bot) > prec) {
			var mid = (bot + top) / 2;
			if (contains(merge(inCam, _defineProperty({}, cor, mid)))) {
				bot = mid;
			} else {
				top = mid;
			}
		}
		return merge(inCam, _defineProperty({}, cor, bot));
	}

	return {
		contains: contains,
		limit: limit
	};
}

module.exports = Gamut;