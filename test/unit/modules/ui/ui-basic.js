object.use('ui/ui2.js', function(ui) {

module('basic');

test('sub property', function() {
	var TestComponent = new Class(ui.Component, function() {
		this.test = ui.define1('.test');
		this.test2 = ui.define1('.test');
	});
	TestComponent.set('test3', ui.define1('.test'));

	var div = document.createElement('div');
	div.innerHTML = '<div class="test">test</div>';

	var test = new TestComponent(div);
	var testComp = test.test;
	var testNode = test.test.getNode();

	// 初始化时会获取所有sub
	equals(test.test.getNode().className, 'test', 'define1 component right when init.');

	// 下环线形式获取节点
	equals(test._test, testNode, 'define1 component right when init.');

	// 两个引用相同，返回相同一个component引用
	equals(test.test2, testComp, 'using one same component when selector same.');
	equals(test.test3, testComp, 'component defined after class created.');

	// 直接获取节点方式
	equals(test._test2, testNode, 'using one same node when selector same.');
	equals(test._test3, testNode, 'component defined after class created.');
});

test('mutiple sub property', function() {
	var TestComponent = new Class(ui.Component, function() {
		this.test = ui.define('.test');
		this.test2 = ui.define('.test');
	});
	TestComponent.set('test3', ui.define('.test'));

	var div = document.createElement('div');
	div.innerHTML = '<div class="test">test1</div><div class="test">test2</div><div class="test">test3</div><div class="test">test4</div>';

	var test = new TestComponent(div);
	var testComp = test.test;
	var testNode = test.test.getNode();

	// 初始化时会获取所有sub
	equals(test.test.getNode().length, 4, 'define components node ok.');

	// 下环线形式获取节点
	equals(test._test, testNode, 'define components right when init.');
});

test('parent property', function() {

	var TestComponent = new Class(ui.Component, function() {
		this.parent = ui.parent(function() {
			return ParentComponent;
		});
	});

	var ParentComponent = new Class(ui.Component, function() {
		this.test = ui.define1('.test', TestComponent);
	});

	var div = document.createElement('div');
	div.innerHTML = '<div class="test"></div>';
	var test = new ParentComponent(div);

	ok(test.test.parent === test, 'parent component ok.');
});

test('async load component', function() {

	var script = document.createElement('script');
	script.setAttribute('data-src', 'async-module.js');
	script.setAttribute('data-module', 'test.test');
	document.body.appendChild(script);
	object._loader.buildFileLib();

	var TestComponent = new Class(ui.Component, function() {
		this.test = ui.define1('.test', 'test.test.TestComponent');
		this.test2 = ui.define1('.test2', 'test.test.TestComponent', function(self, make) {
			self._node.appendChild(make()._node);
		});

		this._init = function(self) {
			ok(self.test, 'init called after load.');
		};
	});

	var div = document.createElement('div');
	div.innerHTML = '<div class="test"></div>';

	var test = new TestComponent(div, {
		'test2.template': '<div class="test2"></div>'
	});
	test.render('test2');

	stop();
	// 这里应该改成在某个事件中验证，200毫秒并不准确
	setTimeout(function() {
		start();
		ok(test.test, 'async load component ok.');
		ok(test.test2, 'async render component ok.');
	}, 200);


	document.body.removeChild(script);
});

test('option property', function() {

	optionChangeFired = 0;

	var SubComponent = new Class(ui.Component, function() {
		this.test = ui.option(false);
	});

	var TestComponent = new Class(ui.Component, function() {

		this.sub = ui.define1('.test', SubComponent);

		this.sub2 = ui.define1('.test2', SubComponent, function(self) {
			var test2 = document.createElement('div');
			test2.className = 'test2';
			self._node.appendChild(test2);
		});

		this.test = ui.option(1);

		this.test2 = ui.option('string');

		this.test3 = ui.option(true);

		this.test4 = ui.option(false, function(self) {
			return self.getNode().getAttribute('custom-attr');
		});

		this.test_change = function(self, event) {
			equal(event.oldValue, 1, 'old value ok.');
			equal(event.value, 2, 'new value set.');
			optionChangeFired++;
		};

		this.test2_change = function(self, event) {
			event.preventDefault();
		};
	});

	var div = document.createElement('div');
	div.setAttribute('data-test3', '');
	div.setAttribute('custom-attr', 'custom-value');
	div.innerHTML = '<div class="test"></div>';

	var test = new TestComponent(div, {
		'sub.test': true
	});

	// 默认属性
	equals(test.test, 1, 'default option value ok.');

	// 普通设置
	test.set('test', 2);
	equals(test.test, 2, 'set option value ok.');

	// 设置会触发事件
	equals(optionChangeFired, 1, 'set option fired change event.');

	// 阻止option设置
	test.set('test2', 'xxx');
	equals(test.test2, 'string', 'set option prevented.');

	// 从属性获取option
	equals(test.test3, false, 'get option from node.');

	// 自定义属性getter取代从属性获取
	equals(test.test4, 'custom-value', 'get option from custom getter.');

	// option传递
	equals(test.sub.test, true, 'option pass to sub.');

	// setOption给未定义引用
	test.setOption('a.b.c', 1);
	equal(test.getOption('a.b.c'), 1, 'setOption to undefined sub ok.');

	// setOption给已存在引用
	test.setOption('sub.test', false);
	strictEqual(test.sub.get('test'), false, 'setOption to exist sub ok.');

	// setOption给未存在引用
	test.setOption('sub2.test', true);
	test.setOption('sub2.test2', true);
	test.render('sub2');
	// 已定义的option，getOption和get均能获取。
	strictEqual(test.sub2.get('test'), true, 'can get defined option.');
	strictEqual(test.sub2.getOption('test'), true, 'setOption to nonexistent defined sub ok.');
	// 未定义的option，只能通过getOption获取，无法通过get获取。
	strictEqual(test.sub2.get('test2'), undefined, 'can\'t get undefined option.');
	strictEqual(test.sub2.getOption('test2'), true, 'setOption to nonexistent undefined sub ok.');
});

test('handle method', function() {
	var methodCalled = 0;
	var eventFired = 0;
	var TestComponent = new Class(ui.Component, function() {
		this._test = function(self, arg) {
			ok(arg, 'test', 'arguments pass ok.');
			methodCalled = 1;
		};
		this._test2 = function(self) {
			ok(false, 'preventDefault bad when event fired.')
		};
	});
	TestComponent.set('_test3', function() {
		ok(true, 'handle defined after class created.');
	});

	var test = new TestComponent(document.createElement('div'));
	test.addEvent('test', function() {
		eventFired = 1;
	});
	test.addEvent('test2', function(event) {
		event.preventDefault();
	});
	test.test('test');
	test.test2();
	test.test3();
	equals(methodCalled, 1, 'method called.');
	equals(eventFired, 1, 'event fired.');
});

test('on event method', function() {

	var eventFired = 0;
	var onEventCalled = 0;

	var AddonComponent = new Class(ui.Component, function() {

		this.ontest = function(self, event) {
			// 不应该被执行，因为被下面覆盖掉了
			onEventCalled++;
			ok(false, 'on event override failed.');
		};

	});
	AddonComponent.set('ontest', function() {
		ok(true, 'on event override ok.');
		// 应该被执行
		onEventCalled++;
	});

	var TestComponent = new Class(ui.Component, function() {

		this.__mixins__ = [AddonComponent];

		this._test = function(self) {
			eventFired++;
		};

		this.ontest = function(self, event) {
			// 不应该执行，因为是自己身上的
			onEventCalled++;
			ok(false, 'on event runed by self.');
		};

	});

	var div = document.createElement('div');
	var test = new TestComponent(div);
	test.test();
	equal(eventFired, 1, 'event fired.');
	equal(onEventCalled, 1, 'on event called.');

});

test('on event method in extend', function() {
	var onEventCalled = 0;
	var AddonComponent = new Class(ui.Component, function() {
		this.ontest = function(self) {
			onEventCalled++;
		};
	});
	var TestComponent = new Class(ui.Component, function() {
		this.__mixins__ = [AddonComponent];
	});
	var TestComponent2 = new Class(TestComponent, function() {
		this._test = function(self) {
		}
	});

	var div = document.createElement('div');
	var test = new TestComponent2(div);
	test.test();

	equal(onEventCalled, 1, 'on event called in extend.');
});

test('sub event method', function() {

	var clickEventCalled = 0;
	var customEventCalled = 0;

	var Test2Component = new Class(ui.Component, function() {
		this._test = function(self, a) {
		}
	});

	var TestComponent = new Class(ui.Component, function() {

		this.test = ui.define1('.test', Test2Component);

		this.test_click = function(self, event) {
			// 传递的是正确的事件
			equals(event.type, 'click', 'arguments pass ok.');
			// 从event上能够找到触发此事件的component信息。
			equals(event.target.component, self.test, 'component arguments pass ok with click event.');

			clickEventCalled++;
		};

		this.test_test = function(self, event, a) {
			// 从event上能够找到触发此事件的component信息。
			equals(event.target.component, self.test, 'component arguments pass ok with custom event.');
			// 自定义事件传递的参数可以获取
			equals(a, 'test', 'custom arguments pass ok with custom event.');

			customEventCalled++;
		};

	});

	var div = document.createElement('div');
	div.innerHTML = '<div class="test">test</div>';

	var test = new TestComponent(div);

	test.test.getNode().click();
	equals(clickEventCalled, 1, 'sub click event called.');

	test.test.test('test');
	equals(customEventCalled, 1, 'sub custom event called.');
});

test('addons', function() {
	addonInitCalled = 0;
	initCalled = 0;
	var A = new Class(ui.Component, function() {
		this._init = function(self) {
			addonInitCalled++;
		};
	});

	var Test = new Class(ui.Component, function() {
		this.__mixins__ = [A];

		this._init = function(self) {
			initCalled++;
		};
	});

	var test = new Test(document.createElement('div'));

	equal(addonInitCalled, 1, 'addon init method called.');
	equal(initCalled, 1, 'init method called.');
});

test('render', function() {

	var renderedEventCalled = 0;

	var SubComponent = new Class(ui.Component, function() {
		this.test = ui.option(false);
	});

	var TestComponent = new Class(ui.Component, function() {

		this.test = ui.define1('.test', SubComponent, function(self, make) {
			var a = make();
			self._node.appendChild(a._node);
		});

		this.test_click = function(self) {
			renderedEventCalled++;
		}

	});

	var div = document.createElement('div');

	var test = new TestComponent(div, {
		'test.test': true,
		'test.hello': 'test',
		'test.template': '<div class="test">{{hello}}</div>'
	});

	// 渲染
	test.render('test');
	equal(test.getNode().innerHTML, '<div class="test">test</div>', 'template render ok.');

	// option传递
	equal(test.test.test, true, 'option pass to sub.');

	// 事件
	test.test.getNode().click();
	equal(renderedEventCalled, 1, 'rendered component event called.');

	// 删除
	test.test.dispose();
	ok(test.test === null, 'dispose ok.');

});

});
