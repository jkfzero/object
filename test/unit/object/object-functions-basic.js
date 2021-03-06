module("object-functions-basic");

test('extend', function() {
	var values = $UNIT_TEST_CONFIG.testEdges;

	var a = {a:1,b:2};
	var b = {a:3,c:4};
	var d = object.extend(a,b,false);
	ok(d === a, 'return value of object.extend, is completely equals to first parameter');
	var a = object.extend({}, {0:1});
	equal(a['0'], 1, 'a[\'0\'] should be considered');
	var a = object.extend({}, {'':1});
	equal(a[''], 1, 'a[\'\'] should be considered');

	var a = object.extend({}, Array.prototype);
	if (a.indexOf) {
		ok(a.indexOf != undefined, 'extend from Array.prototype is ok in chrome');
	} else {
		ok(a.indexOf == undefined, 'extend from Array.prototype is not ok in this browser');
	}
	var a = object.extend({}, {'call':1});
	equal(a['call'], 1, 'a.call should be considered');

	var a = {prop: 1};
	var b = object.extend({}, {a:a});
	var c = object.extend({}, {a:a});
	b.a.prop = 2;
	equal(c.a.prop, 2, 'reference to the same object, should be considered');
});

test('clone', function() {
	QUnit.reset();
	var values = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in values) {
		try {
			var result = object.clone(values[prop]);
			var type = typeof values[prop];
		} catch (e) {
			if (values[prop] === undefined || values[prop] == null || values[prop] == RegExp) {
			} else {
				ok(false, 'object.clone(' + prop + ') should be considered : ' + e);
			}
		};
	};
});

test('bind', function() {
});

test('use', function() {
	QUnit.reset();
	var values = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in values) {
		try {
			object.use(values[prop]);
			ok(true, 'object.use(' + prop + ') should be considered');
		} catch (e) {
			ok(false, 'object.use(' + prop + ') should be considered : ' + e);
		};
	};
	try {
		object.use(function(exports) {});
		ok(ok, 'module uses should not be null');
	} catch (e) {
		ok(false, 'module uses should not be null');
	}
});

test('add', function() {
	QUnit.reset();
	var values = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in values) {
		try {
			object.add(values[prop]);
			ok(true, 'object.add(' + prop + ') should be considered');
		} catch (e) {
			ok(false, 'object.add(' + prop + ') should be considered : ' + e);
		};
	};
	try {
		object.add(function(exports) {});
		ok(ok, 'module name should not be null');
	} catch (e) {
		ok(false, 'module name should not be null');
	}
});

test('execute', function() {
	QUnit.reset();
	var values = $UNIT_TEST_CONFIG.testEdges;
	for(var prop in values) {
		try {
			object.execute(values[prop]);
			ok(true, 'object.execute(' + prop + ') should be considered');
		} catch (e) {
			if ( prop != '1') {
				ok(false, 'object.execute(' + prop + ') should be considered : ' + e);
			}
		};
	};
	try {
		object.execute(function(exports) {});
		ok(ok, 'module name should not be null');
	} catch (e) {
		ok(false, 'module name should not be null');
	}
});
