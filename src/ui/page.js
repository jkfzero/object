object.define('ui/page.js', 'ui, window', function(require, exports) {

var ui = require('ui');

/**
 * 一组Component的在页面上的集合，用于初始化页面
 */
this.Page = new Class(ui.Component, function() {

	/**
	 * @param {HTMLElement} [node=document.body] 页面的起始查询节点
	 * @param {Object} options 配置页面组件的选项
	 */
	this.initialize = function(self, node, options) {

		var window = require('window');

		// node 参数可选
		if (node.ownerDocument !== window.document) {
			options = node;
			node = window.document.body;
		}

		if (!options) {
			options = {};
		}

		// 会自动进入virtual mode
		this.parent(self, node, options);
	};

});

});
