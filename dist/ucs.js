"use strict";

var _require = require("./helpers");

var degree = _require.degree;
var radian = _require.radian;
var sqrt = Math.sqrt;
var pow = Math.pow;
var exp = Math.exp;
var log = Math.log;
var cos = Math.cos;
var sin = Math.sin;
var atan2 = Math.atan2;

var uniformSpaces = {
	LCD: { K_L: 0.77, c_1: 0.007, c_2: 0.0053 },
	SCD: { K_L: 1.24, c_1: 0.007, c_2: 0.0363 },
	UCS: { K_L: 1.00, c_1: 0.007, c_2: 0.0228 }
};

function Converter() {
	var name = arguments[0] === undefined ? "UCS" : arguments[0];
	var _uniformSpaces$name = uniformSpaces[name];
	var K_L = _uniformSpaces$name.K_L;
	var c_1 = _uniformSpaces$name.c_1;
	var c_2 = _uniformSpaces$name.c_2;

	function fromCam(CAM) {
		var J = CAM.J;
		var M = CAM.M;
		var h = CAM.h;
		var h_rad = radian(h);
		var J_p = (1 + 100 * c_1) * J / (1 + c_1 * J);
		var M_p = 1 / c_2 * log(1 + c_2 * M);
		var a_p = M_p * cos(h_rad);
		var b_p = M_p * sin(h_rad);
		return { J_p: J_p, a_p: a_p, b_p: b_p };
	}

	function toCam(UCS) {
		var J_p = UCS.J_p;
		var a_p = UCS.a_p;
		var b_p = UCS.b_p;
		var J = -J_p / (c_1 * J_p - 100 * c_1 - 1);
		var M_p = sqrt(pow(a_p, 2) + pow(b_p, 2));
		var M = (exp(c_2 * M_p) - 1) / c_2;
		var h_rad = atan2(b_p, a_p);
		var h = degree(h_rad);
		return { J: J, M: M, h: h };
	}

	function distance(UCS1, UCS2) {
		return sqrt(pow((UCS1.J_p - UCS2.J_p) / K_L, 2) + pow(UCS1.a_p - UCS2.a_p, 2) + pow(UCS1.b_p - UCS2.b_p, 2));
	}

	function lerp(UCS1, UCS2, t) {
		var UCS = {};
		for (var cor in UCS1) {
			UCS[cor] = (1 - t) * UCS1[cor] + t * UCS2[cor];
		}
		return UCS;
	}

	return {
		fromCam: fromCam,
		toCam: toCam,
		distance: distance,
		lerp: lerp
	};
}

module.exports = Converter;