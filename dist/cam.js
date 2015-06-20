"use strict";

function _slicedToArray(arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }

var illuminant = require("./illuminant");
var matrix = require("./matrix");
var merge = require("mout/object/merge");

var _require = require("./helpers");

var degree = _require.degree;
var radian = _require.radian;
var pow = Math.pow;
var sqrt = Math.sqrt;
var exp = Math.exp;
var abs = Math.abs;
var sign = Math.sign;
var floor = Math.floor;
var sin = Math.sin;
var cos = Math.cos;
var atan2 = Math.atan2;

var surrounds = {
	average: { F: 1, c: 0.69, N_c: 1 },
	dim: { F: 0.9, c: 0.59, N_c: 0.9 },
	dark: { F: 0.8, c: 0.535, N_c: 0.8 }
};

var M_CAT02 = [[0.7328, 0.4296, -0.1624], [-0.7036, 1.6975, 0.0061], [0.003, 0.0136, 0.9834]];

var M_HPE = [[0.38971, 0.68898, -0.07868], [-0.22981, 1.1834, 0.04641], [0, 0, 1]];

var XYZ_to_CAT02 = M_CAT02,
    CAT02_to_XYZ = matrix.inverse(M_CAT02),
    CAT02_to_HPE = matrix.product(M_HPE, matrix.inverse(M_CAT02)),
    HPE_to_CAT02 = matrix.product(M_CAT02, matrix.inverse(M_HPE));

// CIECAM02 and Its Recent Developments - Ming Ronnier Luo and Changjun Li
function Converter() {
	var viewingConditions = arguments[0] === undefined ? {} : arguments[0];

	viewingConditions = merge({
		whitePoint: illuminant.D65,
		adaptingLuminance: 40,
		backgroundLuminance: 20,
		surroundType: "average",
		discounting: false
	}, viewingConditions);

	var XYZ_w = viewingConditions.whitePoint;
	var L_A = viewingConditions.adaptingLuminance;
	var Y_b = viewingConditions.backgroundLuminance;
	var _surrounds$viewingConditions$surroundType = surrounds[viewingConditions.surroundType];
	var F = _surrounds$viewingConditions$surroundType.F;
	var c = _surrounds$viewingConditions$surroundType.c;
	var N_c = _surrounds$viewingConditions$surroundType.N_c;
	var Y_w = XYZ_w[1];

	var k = 1 / (5 * L_A + 1),
	    F_L = 0.2 * pow(k, 4) * 5 * L_A + 0.1 * pow(1 - pow(k, 4), 2) * pow(5 * L_A, 1 / 3),
	    n = Y_b / Y_w,
	    N_bb = 0.725 * pow(1 / n, 0.2),
	    N_cb = N_bb,
	    z = 1.48 + sqrt(n),
	    D = viewingConditions.discounting ? 1 : F * (1 - 1 / 3.6 * exp(-(L_A + 42) / 92));

	var RGB_w = matrix.multiply(M_CAT02, XYZ_w);

	var _RGB_w$map = RGB_w.map(function (v) {
		return D * Y_w / v + 1 - D;
	});

	var _RGB_w$map2 = _slicedToArray(_RGB_w$map, 3);

	var D_R = _RGB_w$map2[0];
	var D_G = _RGB_w$map2[1];
	var D_B = _RGB_w$map2[2];
	var RGB_cw = correspondingColors(XYZ_w);
	var RGB_aw = adaptedResponses(RGB_cw);
	var A_w = achromaticResponse(RGB_aw);

	function correspondingColors(XYZ) {
		var _matrix$multiply = matrix.multiply(XYZ_to_CAT02, XYZ);

		var _matrix$multiply2 = _slicedToArray(_matrix$multiply, 3);

		var R = _matrix$multiply2[0];
		var G = _matrix$multiply2[1];
		var B = _matrix$multiply2[2];

		return [D_R * R, D_G * G, D_B * B];
	}

	function reverseCorrespondingColors(RGB_c) {
		var _RGB_c = _slicedToArray(RGB_c, 3);

		var R_c = _RGB_c[0];
		var G_c = _RGB_c[1];
		var B_c = _RGB_c[2];

		return matrix.multiply(CAT02_to_XYZ, [R_c / D_R, G_c / D_G, B_c / D_B]);
	}

	function adaptedResponses(RGB_c) {
		return matrix.multiply(CAT02_to_HPE, RGB_c).map(function (v) {
			var x = pow(F_L * abs(v) / 100, 0.42);
			return sign(v) * 400 * x / (27.13 + x) + 0.1;
		});
	}

	function reverseAdaptedResponses(RGB_a) {
		return matrix.multiply(HPE_to_CAT02, RGB_a.map(function (v) {
			var x = v - 0.1;
			return sign(x) * 100 / F_L * pow(27.13 * abs(x) / (400 - abs(x)), 1 / 0.42);
		}));
	}

	function achromaticResponse(RGB_a) {
		var _RGB_a = _slicedToArray(RGB_a, 3);

		var R_a = _RGB_a[0];
		var G_a = _RGB_a[1];
		var B_a = _RGB_a[2];

		return (R_a * 2 + G_a + B_a / 20 - 0.305) * N_bb;
	}

	function forwardModel(XYZ) {
		var RGB_c = correspondingColors(XYZ);
		var RGB_a = adaptedResponses(RGB_c);

		var _RGB_a2 = _slicedToArray(RGB_a, 3);

		var R_a = _RGB_a2[0];
		var G_a = _RGB_a2[1];
		var B_a = _RGB_a2[2];

		var a = R_a - G_a * 12 / 11 + B_a / 11,
		    b = (R_a + G_a - 2 * B_a) / 9,
		    h_rad = atan2(b, a),
		    h = degree(h_rad),
		    H = hueQuadrature(h),
		    e_t = 1 / 4 * (cos(h_rad + 2) + 3.8),
		    A = achromaticResponse(RGB_a),
		    J = 100 * pow(A / A_w, c * z),
		    t = 50000 / 13 * N_c * N_cb * e_t * sqrt(a * a + b * b) / (R_a + G_a + 21 / 20 * B_a),
		    C = pow(t, 0.9) * sqrt(J / 100) * pow(1.64 - pow(0.29, n), 0.73),
		    Q = 4 / c * sqrt(J / 100) * (A_w + 4) * pow(F_L, 0.25),
		    M = C * pow(F_L, 0.25),
		    s = 100 * sqrt(M / Q);

		return { Q: Q, J: J, M: M, C: C, s: s, h: h, H: H };
	}

	function reverseModel(correlates) {
		var Q = correlates.Q;
		var J = correlates.J;
		var M = correlates.M;
		var C = correlates.C;
		var s = correlates.s;
		var h = correlates.h;
		var H = correlates.H;
		var h_rad = radian(h);

		J = isNaN(J) ? 6.25 * pow(c * Q / ((A_w + 4) * pow(F_L, 0.25)), 2) : J;
		Q = isNaN(Q) ? 4 / c * sqrt(J / 100) * (A_w + 4) * pow(F_L, 0.25) : Q;
		C = isNaN(C) ? isNaN(M) ? pow(s / 100, 2) * Q / pow(F_L, 0.25) : M / pow(F_L, 0.25) : C;
		M = isNaN(M) ? C * pow(F_L, 0.25) : M;
		s = isNaN(s) ? 100 * sqrt(M / Q) : s;
		h = isNaN(h) ? reverseHueQuadrature(H) : h;
		H = isNaN(H) ? hueQuadrature(h) : H;

		var t = pow(C / (sqrt(J / 100) * pow(1.64 - pow(0.29, n), 0.73)), 10 / 9),
		    e_t = 1 / 4 * (cos(h_rad + 2) + 3.8),
		    A = A_w * pow(J / 100, 1 / c / z);

		var p_1 = 50000 / 13 * N_c * N_cb * e_t / t,
		    p_2 = A / N_bb + 0.305,
		    q_1 = p_2 * 61 / 20 * 460 / 1403,
		    q_2 = 61 / 20 * 220 / 1403,
		    q_3 = 21 / 20 * 6300 / 1403 - 27 / 1403;

		var sin_h = sin(h_rad),
		    cos_h = cos(h_rad);

		var a, b;

		if (t === 0) {
			a = b = 0;
		} else if (abs(sin_h) >= abs(cos_h)) {
			b = q_1 / (p_1 / sin_h + q_2 * cos_h / sin_h + q_3);
			a = b * cos_h / sin_h;
		} else {
			a = q_1 / (p_1 / cos_h + q_2 + q_3 * sin_h / cos_h);
			b = a * sin_h / cos_h;
		}

		var RGB_a = [20 / 61 * p_2 + 451 / 1403 * a + 288 / 1403 * b, 20 / 61 * p_2 - 891 / 1403 * a - 261 / 1403 * b, 20 / 61 * p_2 - 220 / 1403 * a - 6300 / 1403 * b];

		var RGB_c = reverseAdaptedResponses(RGB_a),
		    XYZ = reverseCorrespondingColors(RGB_c);

		return XYZ;
	}

	return {
		forwardModel: forwardModel,
		reverseModel: reverseModel
	};
}

var uniqueHues = [{ s: "R", h: 20.14, e: 0.8, H: 0 }, { s: "Y", h: 90, e: 0.7, H: 100 }, { s: "G", h: 164.25, e: 1, H: 200 }, { s: "B", h: 237.53, e: 1.2, H: 300 }, { s: "R", h: 380.14, e: 0.8, H: 400 }];

function hueQuadrature(h) {
	if (h < uniqueHues[0].h) {
		h += 360;
	}
	var j = 0;
	while (uniqueHues[j + 1].h < h) {
		j++;
	}
	var d_j = (h - uniqueHues[j].h) / uniqueHues[j].e,
	    d_k = (uniqueHues[j + 1].h - h) / uniqueHues[j + 1].e,
	    H_j = uniqueHues[j].H;
	return H_j + 100 * d_j / (d_j + d_k);
}

function reverseHueQuadrature(H) {
	var j = floor(H / 100);
	var amt = H % 100;

	var _uniqueHues$slice = uniqueHues.slice(j, j + 2);

	var _uniqueHues$slice2 = _slicedToArray(_uniqueHues$slice, 2);

	var _uniqueHues$slice2$0 = _uniqueHues$slice2[0];
	var e_j = _uniqueHues$slice2$0.e;
	var h_j = _uniqueHues$slice2$0.h;
	var _uniqueHues$slice2$1 = _uniqueHues$slice2[1];
	var e_k = _uniqueHues$slice2$1.e;
	var h_k = _uniqueHues$slice2$1.h;
	var h = (amt * (e_k * h_j - e_j * h_k) - 100 * h_j * e_k) / (amt * (e_k - e_j) - 100 * e_k);
	return h;
}

module.exports = Converter;