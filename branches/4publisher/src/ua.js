object.add('ua', function($) {

var o = this.ua = {};
var ua = navigator.userAgent,
	EMPTY = '', MOBILE = 'mobile',
	core = EMPTY, shell = EMPTY, m,
	//o = {
		// browser core type
		//webkit: 0,
		//trident: 0,
		//gecko: 0,
		//presto: 0,

		// browser type
		//chrome: 0,
		//safari: 0,
		//firefox: 0,
		//ie: 0,
		//opera: 0

		//mobile: '',
		//core: '',
		//shell: ''
	//},
	numberify = function(s) {
		var c = 0;
		// convert '1.2.3.4' to 1.234
		return parseFloat(s.replace(/\./g, function() {
			return (c++ === 0) ? '.' : '';
		}));
	};

// WebKit
if ((m = ua.match(/AppleWebKit\/([\d.]*)/)) && m[1]) {
	o[core = 'webkit'] = numberify(m[1]);

	// Chrome
	if ((m = ua.match(/Chrome\/([\d.]*)/)) && m[1]) {
		o[shell = 'chrome'] = numberify(m[1]);
	}
	// Safari
	else if ((m = ua.match(/\/([\d.]*) Safari/)) && m[1]) {
		o[shell = 'safari'] = numberify(m[1]);
	}

	// Apple Mobile
	if (/ Mobile\//.test(ua)) {
		o[MOBILE] = 'apple'; // iPad, iPhone or iPod Touch
	}
	// Other WebKit Mobile Browsers
	else if ((m = ua.match(/NokiaN[^\/]*|Android \d\.\d|webOS\/\d\.\d/))) {
		o[MOBILE] = m[0].toLowerCase(); // Nokia N-series, Android, webOS, ex: NokiaN95
	}
}
// NOT WebKit
else {
	// Presto
	// ref: http://www.useragentstring.com/pages/useragentstring.php
	if ((m = ua.match(/Presto\/([\d.]*)/)) && m[1]) {
		o[core = 'presto'] = numberify(m[1]);
		
		// Opera
		if ((m = ua.match(/Opera\/([\d.]*)/)) && m[1]) {
			o[shell = 'opera'] = numberify(m[1]); // Opera detected, look for revision

			if ((m = ua.match(/Opera\/.* Version\/([\d.]*)/)) && m[1]) {
				o[shell] = numberify(m[1]);
			}

			// Opera Mini
			if ((m = ua.match(/Opera Mini[^;]*/)) && m) {
				o[MOBILE] = m[0].toLowerCase(); // ex: Opera Mini/2.0.4509/1316
			}
			// Opera Mobile
			// ex: Opera/9.80 (Windows NT 6.1; Opera Mobi/49; U; en) Presto/2.4.18 Version/10.00
			// issue: 由于 Opera Mobile 有 Version/ 字段，可能会与 Opera 混淆，同时对于 Opera Mobile 的版本号也比较混乱
			else if ((m = ua.match(/Opera Mobi[^;]*/)) && m){
				o[MOBILE] = m[0];
			}
		}
		
	// NOT WebKit or Presto
	} else {
		// MSIE
		if ((m = ua.match(/MSIE\s([^;]*)/)) && m[1]) {
			o[core = 'trident'] = 0.1; // Trident detected, look for revision
			// 注意：
			// o.shell = ie, 表示外壳是 ie
			// 但 o.ie = 7, 并不代表外壳是 ie7, 还有可能是 ie8 的兼容模式
			// 对于 ie8 的兼容模式，还要通过 documentMode 去判断。但此处不能让 o.ie = 8, 否则
			// 很多脚本判断会失误。因为 ie8 的兼容模式表现行为和 ie7 相同，而不是和 ie8 相同
			o[shell = 'ie'] = numberify(m[1]);

			// Get the Trident's accurate version
			if ((m = ua.match(/Trident\/([\d.]*)/)) && m[1]) {
				o[core] = numberify(m[1]);
			}

		// NOT WebKit, Presto or IE
		} else {
			// Gecko
			if ((m = ua.match(/Gecko/))) {
				o[core = 'gecko'] = 0.1; // Gecko detected, look for revision
				if ((m = ua.match(/rv:([\d.]*)/)) && m[1]) {
					o[core] = numberify(m[1]);
				}

				// Firefox
				if ((m = ua.match(/Firefox\/([\d.]*)/)) && m[1]) {
					o[shell = 'firefox'] = numberify(m[1]);
				}
			}
		}
	}
}

o.core = core;
o.shell = shell;
o._numberify = numberify;

});

