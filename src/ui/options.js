object.define('ui/options.js', './optionsbase, events', function(require, exports) {

var optionsmod = require('./optionsbase');
var events = require('events');

this.OptionsClass = new Class(optionsmod.OptionsClass, function() {

	this.customGetter = function(cls, self, name) {
		var meta = self.getMeta(name);
		if (!meta) {
			return undefined;
		}

		// 默认getter是从结构中通过data-前缀获取
		var getter = meta.getter || function(self) {
			if (!self._node) {
				return undefined;
			}
			var value = self._node.getData(name.toLowerCase());
			if (value != undefined) {
				return meta.ensureTypedValue(value);
			}
		};

		var getterValue = getter(self, name);
		return getterValue;
	};

	/**
	 * @param name 要获取的option的name
	 * @param seted 保存在_options上的value
	 */
	this.getter1 = function(cls, self, name, seted) {
		// 获取自己身上的option
		// 三个获取级别，优先级：结构(getter)>用户设置(setter)>默认(default)
		var meta = self.getMeta(name);
		var from, value;

		// meta不存在表示在获取一个没有注册的option
		if (!meta) {
			from = null;
			value = seted;
		}
		// 优先从结构中获取
		else if ((getterValue = cls.get('customGetter')(self, name)) !== undefined) {
			from = 'getter';
			value = getterValue;
		}
		// 其次是用户设置值
		else if (seted !== undefined) {
			from = 'setter';
			value = seted;
		}
		// 最后是defaultValue
		else {
			from = 'default';
			value = meta.defaultValue;
		}

		// 确保获取到的value得到更新
		self._set(name, value);

		return [from, value];
	};

	this.setter1 = function(cls, self, name, value, seted) {
		var valueInfo = cls.get('getter1')(self, name, seted);
		var from = valueInfo[0];
		var oldValue = valueInfo[1];

		// 未定义的option
		if (from == null) {
			return false;
		}
		// 从node获取，阻止普通option的修改
		else if (from == 'getter') {
			return true;
		}

		// 重复设置相同的value，阻止fireEvent，同时阻止设置到_options
		if (oldValue === value) {
			return true;
		}

		// 假设会prevent，阻止更新
		// 若没有prevent，fireevent的default会置prevented为false
		var prevented = true;
		(events.fireevent('__option_change_' + name, ['oldValue', 'value'])(function(self) {
			prevented = false;
			// 重新更新对象上的直接引用值
			self._set(name, value);
		}))(self, oldValue, value);
		return prevented;
	};

	this.setter = function(cls, self, prefix, surfix, value) {
		var sub = self[prefix];
		// 子引用已经存在
		if (sub && sub.setOption) {
			sub.setOption(surfix, value);
		}
		else if (prefix == '_node' || prefix == 'node') {
			self._node.set(surfix, value);
		}
	};

});

this.Options = new exports.OptionsClass(function() {
});

});
