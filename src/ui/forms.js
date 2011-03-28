object.add('ui.forms', 'ui, ui.decorators, ua', function(exports, ui, ua) {

var fireevent = ui.decorators.fireevent;

this.SelectionInputValues = new Class(Array, function() {

	this.initialize = function(self, input) {
		self._input = input;
	};

	this.push = function(self, value) {
		this.parent(self, value);

		self._input.setValues(self);
	};

	this.pop = function(self) {
		var value = this.parent(self);

		self._input.setValues(self);
		return value;
	};

	this.splice = function(self, index, length) {
		var value = this.parent(self, index, length);

		self._input.setValues(self);
		return value;
	};

});

this.SelectionInput = new Class(ui.Component, function() {

	this.initialize = function(self, node, options) {
		this.parent(self, node, options);

		self.name = self._node.name;
		self.values = new exports.SelectionInputValues(self);

		// 去掉输入框的value避免提交空白value上去
		self._node.removeAttribute('name');
		self._node.addEvent('keydown', function(event) {
			if (event.keyCode === 8) {
				if (!self._node.get('value').trim()) {
					event.preventDefault();
					self.values.pop();
				}
			} else if (event.keyCode === 188/*,*/ || event.keyCode === 59 /*;*/ || event.keyCode === 13 /*return*/ || event.keyCode === 32/*space*/) {
				event.preventDefault();
				self.inputValue();
			}
		});

		self._node.addEvent('blur', function(event) {
			self.inputValue();
		});
	};

	this.inputValue = function(self, value) {
		var value = self._node.get('value').trim();
		if (value && self._node.checkValidity()) {
			self.values.push(value);
		} else {
			self._node.set('value', '');
		}
	};

	this.addValue = fireevent(function(self, value) {
		self.values.push(value);
	});

	//this.addValue_dataPasser = function(self, value) {
		//return {value: value};
	//};

	this.makeWrapper = function(self) {
		if (self.selectionWrapper) return;

		var style = window.getComputedStyle? getComputedStyle(self._node, null) : self._node.currentStyle;

		self.paddingTop = parseInt(style.paddingTop);
		self.paddingLeft = parseInt(style.paddingLeft);
		self.paddingBottom = parseInt(style.paddingBottom);
		self.paddingRight = parseInt(style.paddingRight);
		self.top = parseInt(style.borderTopWidth) + self.paddingTop;
		self.left = parseInt(style.borderLeftWidth) + self.paddingLeft;
		self.bottom = parseInt(style.borderBottomWidth) + self.paddingBottom;
		self.right = parseInt(style.borderRightWidth) + self.paddingRight;

		// css 必须设置line-height，否则在webkit中取到的是 normal
		self.oneLineHeight = parseInt(style.lineHeight);
		console.log('line height', self.oneLineHeight);

		// 包装
		var selectionWrapper = document.createElement('div');
		selectionWrapper.className = 'selectioninputwrapper';
		selectionWrapper.style.width = (self._node.offsetWidth - self.left - self.right) + 'px';
		selectionWrapper.style.marginTop = self.top + 'px';
		selectionWrapper.style.marginLeft = self.left + 'px';
		var inner = document.createElement('span');
		selectionWrapper.appendChild(inner);
		self._node.parentNode.insertBefore(selectionWrapper, self._node);
		self.selectionWrapper = inner;
	};

	/**
	 * 生成一个
	 */
	this.makeSelection = function(self, value) {
		var input = document.createElement('input');
		input.name = self.name;
		input.type = 'hidden';
		input.value = value;
		var selection = document.createElement('span');
		selection.className = 'selectioninputselection';
		var deleteButton = document.createElement('span');
		deleteButton.innerHTML = '×';
		deleteButton.className = 'selectioninputdelete';
		deleteButton.onclick = function() {
			self.values.splice(parseInt(this.parentNode.getAttribute('data-index')), 1);
		};
		selection.innerHTML = value;
		selection.appendChild(deleteButton);
		selection.appendChild(input);
		return selection;
	};

	this.setValues = function(self, values) {

		self.makeWrapper();
		while (self.selectionWrapper.firstChild) self.selectionWrapper.removeChild(self.selectionWrapper.firstChild);

		values.forEach(function(value, i) {
			var selection = self.makeSelection(value);
			selection.setAttribute('data-index', i);
			self.selectionWrapper.appendChild(selection);
			var style = window.getComputedStyle? getComputedStyle(selection, null) : selection.currentStyle;
			var topWidth = parseInt(style.marginTop) + parseInt(style.borderTopWidth) + parseInt(style.paddingTop);
			var bottomWidth = parseInt(style.marginBottom) + parseInt(style.borderBottomWidth) + parseInt(style.paddingBottom);
			var leftWidth = parseInt(style.marginLeft) + parseInt(style.borderLeftWidth) + parseInt(style.paddingLeft);
			var rightWidth = parseInt(style.marginRight) + parseInt(style.borderRightWidth) + parseInt(style.paddingRight);
			var height = (self.oneLineHeight - topWidth - bottomWidth);
			selection.style.height = height + 'px';
		});

		var rects = self.selectionWrapper.getClientRects();
		var lineCount, lastLine, lastLineWidth;
		// IE下不能通过getClientRects获取行数，只能逐个便利，通过top坐标的变化判断行数
		if (ua.ua.ie) {
			lineCount = 0;
			var last = 0, lastLineFirstRect;
			for (var i = 0; i < rects.length; i++) {
				var rect = rects[i];
				if (rect.top != last) { // 新行的第一个元素
					lastLineFirstRect = rect;
					lineCount++;
				}
				last = rect.top;
			}
			lastLineWidth = rect.right - lastLineFirstRect.left;
		} else {
			lineCount = rects.length;
			// 最后一行的宽度
			lastLine = rects[rects.length - 1];
			lastLineWidth = parseInt(lastLine.right - lastLine.left);
		}

		var wrapperWidth = parseInt(self.selectionWrapper.parentNode.style.width);

		if (lastLineWidth >= wrapperWidth/* * 0.8*/) { // 本行溢出了
			self.width = (self._node.offsetWidth - self.left - self.right);
			self._node.style.width = self.width + 'px';
			self._node.style.paddingLeft = self.paddingLeft + 'px';
			self._node.style.paddingTop = (self.oneLineHeight * lineCount + self.paddingTop) + 'px';
		} else {
			self.width = (self._node.offsetWidth - lastLineWidth - self.left - self.right);
			self._node.style.width = self.width + 'px';
			self._node.style.paddingLeft = lastLineWidth + self.paddingLeft + 'px';
			self._node.style.paddingTop = (self.oneLineHeight * (lineCount - 1) + self.paddingTop) + 'px';
		}

		if (values.length) {
			self.placeholder = self._node.getAttribute('placeholder');
			self._node.removeAttribute('placeholder');
			self._node.set('value', '');
		}
	};

});

});