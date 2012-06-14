object.define('ui/metas/request.js', function(require, exports) {

/**
 * 声明一个request，可为其注册事件
 * @param url
 * @param [method='get']
 */
this.request = function(url, method) {
	var meta = new RequestMeta(url, method || 'get');
	var prop = property(function(self) {
		var name = prop.__name__;
		return self.getRequest(name);
	});
	prop.meta = meta;
	return prop;
};

function RequestMeta(url, method) {
	this.defaultOptions = {
		url: url,
		method: method
	};
}

RequestMeta.prototype.addTo = function() {
};

RequestMeta.prototype.bindEvents = function(self, name, comp) {

	if (!comp) {
		return;
	}

	// comp可能会注册来自多个引用了它的其他的comp的事件注册
	// 通过在__bounds中保存已经注册过的其他组件，避免重复注册
	if (self.__bounds.indexOf(comp) != -1) {
		return;
	} else {
		self.__bounds.push(comp);
	}

	;(self.__subMethodsMap[name] || []).forEach(function(meta) {
		var fullname = meta.fullname;
		var type = meta.sub2;
		self.addEventTo(comp, type, function(event) {
			event.targetComponent = comp;
			var args;
			// 将event._args pass 到函数后面
			if (event._args) {
				args = [event].concat(event._args);
				self[fullname].apply(self, args);
			} else {
				self[fullname](event);
			}
		});
	});

};

});
