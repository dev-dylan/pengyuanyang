const basekit = require('./basekit.js');
const homebot = require('./homebot.js');

window.exports = {
	"getfull": { // 注意：键对应的是 plugin.json 中的 features.code
		mode: "none",  // 用于无需 UI 显示，执行一些简单的代码
		args: {
			// 进入插件应用时调用
			enter: (action) => {
				// action = { code, type, payload }
				// window.utools.hideMainWindow()
				window.utools.showNotification("解析完成");

				homebot.handleDeviceMaps(action.payload);
				// const utools = window.utools
			}
		}
	}, "dividmerge": { // 注意：键对应的是 plugin.json 中的 features.code
		mode: "none",  // 用于无需 UI 显示，执行一些简单的代码
		args: {
			// 进入插件应用时调用
			enter: (action) => {
				// action = { code, type, payload }
				window.utools.hideMainWindow()
				// do some thing
				homebot.handleDivideMergeMap(action.payload);
				window.utools.outPlugin()
			}
		}
	}, "requestparam": { // 注意：键对应的是 plugin.json 中的 features.code
		mode: "none",  // 用于无需 UI 显示，执行一些简单的代码
		args: {
			// 进入插件应用时调用
			enter: (action) => {
				// action = { code, type, payload }
				window.utools.hideMainWindow()
				// do some thing
				homebot.handleLogRequestBody(action.payload);
				window.utools.outPlugin()
			}
		}
	}, "getmaplist": { // 注意：键对应的是 plugin.json 中的 features.code
		mode: "none",  // 用于无需 UI 显示，执行一些简单的代码
		args: {
			// 进入插件应用时调用
			enter: (action) => {
				// action = { code, type, payload }
				window.utools.hideMainWindow()
				// do some thing
				homebot.handleMapLists(action.payload);
				window.utools.outPlugin()
			}
		}
	}, "decodegzip": { // 注意：键对应的是 plugin.json 中的 features.code
		mode: "none",  // 用于无需 UI 显示，执行一些简单的代码
		args: {
			// 进入插件应用时调用
			enter: (action) => {
				// action = { code, type, payload }
				window.utools.hideMainWindow()
				// do some thing
				homebot.decodeGZIPData(action.payload);
				window.utools.outPlugin()
			}
		}
	}
}