/**
 * Loader
 */
;(function(object) {

// 找不到模块Error
function NoModuleError(name) {
	this.message = 'no module named ' + name;
};
NoModuleError.prototype = new Error();

function ModuleRequiredError(name) {
	this.message = 'module ' + name + ' required';
};
ModuleRequiredError.prototype = new Error();

// 模块
function Module(name) {
	this.__name__ = name;
}
Module.prototype.toString = function() {
	return '<module \'' + this.__name__ + '\'>';
};

/**
 * 普通Package
 */
function Package(id, deps, factory) {
	this.id = id.replace(/\./g, '/');
	this.dependencies = deps;
	this.factory = factory;
}

/**
 * @param id 依赖此dep的module的名字，用于生成作用域信息
 * @param ownerId
 */
Package.Dep = function(id, ownerId) {
	this.id = id;
	this.ownerId = ownerId;
};

Package.Dep.prototype = {
	/**
	 * 处理当前模块
	 * @param callback 异步方法，模块获取完毕后通过callback的唯一参数传回
	 */
	load: function(callback) {
		var runtime = this.runtime;
		var loader = this.loader;
		var id = this.id;
		var ownerId = this.ownerId;

		var isRelative = false;
		// Relative
		if (id.indexOf('.\/') == 0) {
			id = id.slice(2);
			// 去除root
			var context = runtime.getName(ownerId);
			// 说明确实去除了root，是一个相对引用，在获取fullId时需要加上root
			isRelative = (context != ownerId);
		}

		id = loader.parseId(id);

		var fullId = isRelative? runtime.getId(id) : id;
		var depModule = runtime.getModule(id);

		// 使用缓存中的
		if (depModule) {
			callback(depModule);

		} else {
			loader.load(loader.getPackage(fullId), id, runtime, callback);
		}
	}
};

Package.createRequire = function(loader, module, name, runtime) {
	function require(id) {
		if (id.indexOf('./') == 0) {
			id = runtime.getName(name) + '.' + loader.parseId(id.slice(2));
		} else {
			id = loader.parseId(id);
		}
		var exports = runtime.getModule(id);
		if (!exports) {
			// 有依赖却没有获取到，说明是由于循环依赖
			if (module.dependencies.indexOf(id) != -1) {
				throw new Error('循环依赖');
			}
			// 说明没有声明依赖此模块
			else {
				throw new ModuleRequiredError(id);
			}
		}
		return exports;
	}

	require.async = function(deps, callback) {
		deps = loader.parseDeps(deps);
		loader.load(new Package(name, deps, function(require) {
			var args = [];
			deps.forEach(function(dep) {
				args.push(require(dep));
			});
			callback.apply(null, args);
		}), name, runtime);
	};

	return require;
};

function ObjectPackage() {
};

ObjectPackage.Dep = function(id, ownerId) {
	this.id = id;
	this.ownerId = ownerId;
};

ObjectPackage.Dep.prototype = {
	load: function(callback) {
		var runtime = this.runtime;
		var loader = this.loader;
		var id = this.id;

		var parts; // depId所有部分的数组
		var context = null; // 当前dep是被某个模块通过相对路径调用的
		var moduleId = ''; // 当前模块在运行时保存在modules中的名字，为context+parts的第一部分
		var isRelative = false; // 当前dep是否属于execute的模块的子模块，如果是，生成的名称应不包含其前缀
		var pId, part, partId, currentPart = -1;

		/**
		 * 依次获取当前模块的每个部分
		 * 如a.b.c，依次获取a、a.b、a.b.c
		 * @param pExprorts 上一部分的模块实例，如果是初次调用，为空
		 * @param id 截止到当前部分的包含context前缀的名字
		 */
		function nextPart(pExports, id) {

			var fullId, depModule;

			if (pExports) {
				runtime.setModule(id, pExports);
				// 生成对象链
				runtime.setMemberTo(pId, part, pExports);
			}

			pId = id;

			currentPart++;

			if (currentPart == parts.length) {
				callback(runtime.getModule(moduleId));

			} else {
				part = parts[currentPart];
				partId = (pId? pId + '.' : '') + part;
				fullId = isRelative? runtime.getId(partId) : partId;
				depModule = runtime.getModule(partId);

				// 使用缓存中的
				if (depModule) {
					nextPart(depModule);

				} else {
					loader.load(loader.getPackage(fullId), partId, runtime, nextPart);
				}
			};
		}

		// Relative
		if (id.indexOf('.\/') == 0) {
			id = id.slice(2);
			// 去除root
			context = runtime.getName(ownerId);
			// 说明确实去除了root，是一个相对引用，在获取fullId时需要加上root
			isRelative = (context != ownerId);
		}

		parts = id.split('.');
		moduleId = (context? context + '.' : '') + parts[0];

		nextPart(null, context);
	}
};

/**
 * Loader运行时，每一个use、execute产生一个
 */
function LoaderRuntime(root) {

	/**
	 * 此次use运行过程中用到的所有module
	 */
	this.modules = {};

	/**
	 * 模块的依赖路径的栈，检测循环依赖
	 */
	this.stack = [];

	/**
	 * 当使用相对依赖时，子模块被处理完毕时，其父模块可能还未处理完毕
	 * 导致无法立刻将此子模块的引用赋予其父模块
	 * 此变量用于存储父模块与其子模块的映射关系，在父模块初始化完毕后再将自模块赋予自己。
	 */
	this.members = {};
	
	/**
	 * 运行入口模块的名字
	 */
	this.root = root;
}

LoaderRuntime.prototype = {
	/**
	 * 加入一个module
	 */
	addModule: function(name, exports) {
		exports = exports || new Module(name);
		this.modules[name] = exports;
		return exports;
	},

	/**
	 * 设置一个已存在的module
	 */
	setModule: function(name, exports) {
		this.modules[name] = exports;
	},

	/*
	 * 获取一个module
	 */
	getModule: function(name) {
		return this.modules[name];
	},

	/**
	 * 加上root前缀的完整id
	 */
	getId: function(name) {
		return this.root + '.' + name;
	},

	/**
	 * 去掉root前缀的模块名
	 */
	getName: function(id) {
		var root = this.root;
		if (id == root || id.indexOf(root + '.') == 0) {
			id = id.slice(root.length + 1);
		}
		return id;
	},

	/**
	 * 为名为host的module设置member成员为value
	 */
	setMemberTo: function(host, member, value) {

		// 向host添加member成员
		if (host) {
		    // 已存在host
		    if (this.modules[host]) {
		  	  this.modules[host][member] = value;
		    }
		    // host不存在，记录在members对象中
		    else {
		  	  if (!this.members[host]) this.members[host] = [];
		  	  this.members[host].push({
		  		  id: member,
		  		  value: value
		  	  });
		    }
		}

		/*
		 * 将记录的成员添加到自己
		 */
		// 全名
		var id = (host? host + '.' : '') + member;

		// 已获取到了此host的引用，将其子模块都注册上去。
		var members = this.members[id];
		if (members) {
		    members.forEach(function(member) {
		  	  this.modules[id][member.id] = member.value;
		    }, this);
		}
	}
};

// 计算当前引用objectjs的页面文件的目录路径
function calculatePageDir() {
	var loc = window['location'];
	var pageUrl = loc.protocol + '//' + loc.host + (loc.pathname.charAt(0) !== '/' ? '/' : '') + loc.pathname; 
	// IE 下文件系统是以\为分隔符，统一改为/
	if (pageUrl.indexOf('\\') != -1) {
		pageUrl = pageUrl.replace(/\\/g, '/');
	}
	var pageDir = './';
	if (pageUrl.indexOf('/') != -1) {
		// 去除文件，留下目录path
		pageDir = pageUrl.substring(0, pageUrl.lastIndexOf('/') + 1);
	}
	return pageDir;
}


var pageDir = calculatePageDir();

/**
 * object的包管理器
 * 这个class依赖于object._lib ，且会修改它
 */
var Loader = new Class(function() {

	// 用于保存url与script节点的键值对
	this._urlNodeMap = {};

	this.scripts = document.getElementsByTagName('script');

	this.initialize = function(self) {
		self.useCache = true;
		self.lib = {
			'sys': {
				id: 'sys',
				dependencies: [],
				factory: function(exports) {}
			}
		};
		self.fileLib = {};
		self.anonymousModuleCount = 0;
	};

	/**
	 * 将路径形式的id转换成.形式
	 */
	this.parseId = function(self, id) {
		return id.replace(/\//g, '.');
	};

	this.getDep = function(self, depId, ownerId, runtime) {
		var dep;
		if (depId.indexOf('.') != -1) {
			dep = new ObjectPackage.Dep(depId, ownerId);
		} else {
			dep = new Package.Dep(depId, ownerId);
		}
		dep.loader = self;
		dep.runtime = runtime;
		return dep;
	};

	/**
	 * 加载一个module
	 *
	 * @param pkg 被执行的module
	 * @param name 执行时的name
	 * @param {LoaderRuntime} runtime
	 * @param callback 异步方法，执行完毕后调用，传入模块实例及名字
	 */
	this.load = function(self, pkg, name, runtime, callback) {

		var currentUse = -1; 
		var module;

		/**
		 * 顺序执行module中的dependencies
		 * @param pExports 上一个nextDep返回的模块实例
		 */
		function nextDep(pExports) {
			var depId;
			var deps = module.dependencies;
			var factory = module.factory;

			if (pExports) {
				// 模块获取完毕，去除循环依赖检测
				runtime.stack.pop();
			}

			currentUse++;

			// 模块获取完毕，执行factory，将exports通过callback传回去。
			// 已经处理到最后一个
			if (currentUse == deps.length) {
				doneDep();

			} else {
				depId = deps[currentUse];

				// 记录开始获取当前模块
				runtime.stack.push(depId);

				// 刚刚push过，应该在最后一个，如果不在，说明循环依赖了
				// 但并不立刻报错，而是当作此模块没有获取到，继续获取下一个
				if (runtime.stack.indexOf(depId) != runtime.stack.length - 1) {
					nextDep();

				} else {
					self.getDep(depId, module.id, runtime).load(nextDep);
				}
			}
		}

		/**
		 * 已执行完毕最后一个dependency
		 */
		function doneDep() {
			if (!name) name = module.id; //  没有指定name，则使用全名

			var exports = new Module(name);
			var returnExports = module.factory.call(exports, Package.createRequire(self, module, name, runtime), exports, module);
			if (returnExports) {
				returnExports.__name__ = exports.__name__;
				exports = returnExports;
			}

			runtime.addModule(name, exports);

			// sys.modules
			if (exports.__name__ === 'sys') exports.modules = runtime.modules;

			if (callback) callback(exports, name);
		}


		// No module
		if (!pkg) {
			throw new NoModuleError(name);
		}

		// file
		else if (pkg.file) {
			// TODO 加入预处理过程，跑出所有需要加载的文件并行加载，在此执行useScript而不是loadScript
			self.loadScript(pkg.file, function() {
				// 重新读取pkg，之前的pkg只是个fileLib中的占位
				module = self.lib[pkg.id];

				// 加载进来的脚本没有替换掉相应的模块，文件有问题。
				if (!module) {
					throw new Error(pkg.file + ' do not add ' + pkg.id);
				}
				nextDep();
			}, true);

		// Already define
		} else {
			module = pkg;
			nextDep();
		}
	};

	/**
	 * 查找页面中的标记script标签，更新 self.fileLib
	 */
	this.buildFileLib = function(self) {

		var scripts = self.scripts;

		for (var i = 0, script, ids, src, l = scripts.length; i < l; i++) {
			script = scripts[i];
			src = script.getAttribute('data-src');
			ids = script.getAttribute('data-module');
			if (!ids || !src) continue;
			ids.split('\s+').forEach(function(id) {
				self.defineFile(id, src);
			});
		}
	};

	/**
	 * 通过一个src，获取对应文件的绝对路径
	 * 例如：http://hg.xnimg.cn/a.js -> http://hg.xnimg.cn/a.js
	 *       file:///dir/a.js -> file:///dir/a.js
	 *       in http://host/b/c/d/e/f.html, load ../g.js -> http://host/a/b/d/g.js
	 *       in file:///dir/b/c/d/e/f.html, load ../g.js -> file:///dir/a/b/d/g.js
	 *
	 * @param src 地址
	 */
	this._getAbsolutePath = staticmethod(function(src) {

		/**
		 * 清理路径url，去除相对寻址符号
		 */
		function cleanPath(path) {
			// 去除多余的/
			path = path.replace(/([^:\/])\/+/g, '$1\/');
			// 如果没有相对寻址，直接返回path
			if (path.indexOf('.') === -1) {
				return path;
			}

			var parts = path.split('/');
			// 把所有的普通var变量都写在一行，便于压缩
			var result = [];

			for (var i = 0, part, len = parts.length; i < len; i++) {
				part = parts[i];
				if (part === '..') {
					if (result.length === 0) {
						throw new Error('invalid path: ' + path);
					}
					result.pop();
				} else if (part !== '.') {
					result.push(part);
				}
			}

			// 去除尾部的#号
			return result.join('/').replace(/#$/, '');
		}

		// 如果本身是绝对路径，则返回src的清理版本
		if (src.indexOf('://') != -1 || src.indexOf('//') === 0) {
			return cleanPath(src);
		}

		return cleanPath(pageDir + src);
	});

	/**
	 * TODO
	 */
	this.useScript = function(self, src, callback) {
	};

	/**
	 * 加载一个script, 执行callback
	 * 有冲突检测，如果连续调用两次loadScript同一src的话，则第二个调用会等第一个完毕后直接执行callback，不会加载两次。
	 *
	 * @param src 地址
	 * @param callback callback函数
	 */
	this.loadScript = classmethod(function(cls, src, callback, useCache) {
		if (!src || typeof src != 'string') {
			throw new Error('src should be string');
		}
		src = src.trim();
		var absPath = cls._getAbsolutePath(src);
		if (useCache) {
			var urlNodeMap = cls.get('_urlNodeMap'), scriptNode = urlNodeMap[absPath];
			if (scriptNode) {
				if (scriptNode.loading) {
					// 增加一个回调即可
					scriptNode.callbacks.push(callback);
				} else {
					callback(scriptNode);
				}
				return;
			}
		}

		var ele = document.createElement('script');
		ele.type = "text/javascript";
		ele.src = src;
		ele.async = true;
		ele.loading = true;
		ele.callbacks = [];

		var doCallback = function() {
			ele.loading = null;
			ele.callbacks.forEach(function(callback) {
				callback(ele);
			});
			for (var i = 0, l = ele.callbacks.length; i < l; i++) {
				ele.callbacks[i] = null;
			}
			ele.callbacks = null;
		};

		ele.callbacks.push(callback);

		if (window.ActiveXObject) { // IE
			ele.onreadystatechange = function() {
				var rs = this.readyState;
				if ('loaded' === rs || 'complete' === rs) {
					ele.onreadystatechange = null;
					doCallback();
				}
			};

		} else if (ele.addEventListener) { // Standard
			ele.addEventListener('load', doCallback, false);
			ele.addEventListener('error', doCallback, false);

		} else { // Old browser
			ele.onload = ele.onerror = doCallback;
		}

		document.getElementsByTagName('head')[0].insertBefore(ele, null);

		if (useCache) { 
			// 利用绝对路径来存键值对，key为绝对路径，value为script节点
			urlNodeMap[absPath] = ele;
		}
	});

	/**
	 * 根据src属性，删除一个script标签，并且清除对应的键值对缓存记录
	 * 目前只供单元测试还原测试环境使用
	 * @param src 路径
	 */
	this.removeScript = classmethod(function(cls, src) {
		if (!src || typeof src != 'string') {
			throw new Error('src should be string');
		}
		src = src.trim();
		// 转换为绝对路径
		var absPath = cls._getAbsolutePath(src);
		// 获取节点
		var urlNodeMap = cls.get('_urlNodeMap'), scriptNode = urlNodeMap[absPath];
		// 如果节点存在，则删除script，并从缓存中清空
		if (scriptNode) {
			delete urlNodeMap[absPath];
			scriptNode.parentNode.removeChild(scriptNode);
			scriptNode = null;
		}
	});

	/**
	 * 处理传入的deps参数
	 * 在parseDeps阶段不需要根据名称判断去重（比如自己use自己），因为并不能避免所有冲突，还有循环引用的问题（比如 core use dom, dom use core）
	 * @param {String} deps 输入
	 */
	this.parseDeps = function(self, deps) {
		if (!deps || typeof deps != 'string') {
			return [];
		}

		deps = deps.trim();
		if (/^\.[^\/]|\.$/.test(deps)) {
			throw new Error('deps should not startWith/endWith \'.\', except startWith \'./\'');
		}
		deps = deps.replace(/^,*|,*$/g, '');
		deps = deps.split(/\s*,\s*/ig);

		return deps;
	};

	/**
	 * 建立一个runtime
	 */
	this.createRuntime = function(self, id) {
		return new LoaderRuntime(id);
	};

	/**
	 * 定义一个file，供异步加载
	 */
	this.defineFile = function(self, id, src) {
		if (!id || typeof id != 'string') return;
		if (arguments.length < 2) return;
		id = self.parseId(id);

		if (self.fileLib[id]) return;

		self.fileLib[id] = {
			id: id,
			file: src
		};
	};

	/**
	 * @param id
	 * @param deps
	 * @param factory
	 */
	this.define = function(self, id, deps, factory) {
		if (!id || typeof id != 'string') return;
		if (arguments.length < 3) return;

		// deps 参数是可选的
		if (arguments.length == 3) {
			factory = deps;
			deps = [];
		} else {
			deps = self.parseDeps(deps);
		}

		if (!factory || typeof factory != 'function') return;

		id = self.parseId(id);

		// 不允许重复添加。
		if (self.lib[id]) return;

		// 文件已加载
		if (self.fileLib[id]) delete self.fileLib[id];

		self.lib[id] = new Package(id, deps, factory);
	};

	this.getPackage = function(self, id) {
		return self.lib[id] || self.fileLib[id];
	};

	/**
	 * 移除模块的定义
	 * @param id 需要移除模块的id
	 * @param all 是否移除其所有子模块
	 */
	this.remove = function(self, id, all) {
		delete self.lib[id];
		if (all) {
			Object.keys(self.lib).forEach(function(key) {
				if (key.indexOf(id + '.') == 0) delete self.lib[key];
			});
		}
	};

	/**
	 * execute
	 * @param id 执行的入口模块名称
	 */ 
	this.execute = function(self, id) {
		if (!id || typeof id != 'string') {
			return;
		}
		self.buildFileLib();

		self.load(self.lib[id], '__main__', self.createRuntime(id));
	};

	/**
	 * use
	 * @param deps 用逗号分隔开的模块名称列表
	 * @param factory deps加载后调用，将module通过参数传入factory，第一个参数为exports，后面的参数为每个module的不重复引用，顺序排列
	 */
	this.use = function(self, deps, factory) {
		if (!factory || typeof factory != 'function') {
			return;
		}
		self.buildFileLib();

		var id = '__anonymous_' + self.anonymousModuleCount + '__';
		self.anonymousModuleCount++;

		object.define(id, deps, function(require, exports, module) {
			var args = [];
			module.dependencies.forEach(function(dep) {
				args.push(require(dep));
			});
			factory.apply(null, args);
		});

		self.load(self.lib[id], '__main__', self.createRuntime(id), function() {});
	};

});

object.Loader = Loader;
object.NoModuleError = NoModuleError;
object.ModuleRequiredError = ModuleRequiredError;

})(object);
