const basekit = require('./basekit.js');
const homebot = require('./homebot.js');

function parseLog(action) {
	let string = action.payload;
	homebot.parseDeviceMaps(string);
}

window.exports = {
	"parse_log": { // 注意：键对应的是 plugin.json 中的 features.code
		mode: "list",  // 列表模式
		args: {
			// 进入插件应用时调用（可选）
			enter: (action, callbackSetList) => {
				// 如果进入插件应用就要显示列表数据
				callbackSetList([
					{
						title: 'getfull',
						description: '获取 getfull 接口的地图数据',
						icon: '', // 图标(可选)
						url: 'homebot://getfull'
					}, {
						title: 'divice-merge',
						description: '获取分割合并提交的的地图数据',
						icon: '', // 图标(可选)
						url: 'homebot://diviceMerge'
					}, {
						title: 'request param',
						description: '获取请求的请求体',
						icon: '', // 图标(可选)
						url: 'homebot://requestParam'
					}, {
						title: 'getMapList',
						description: '获取地图列表的地图数据',
						icon: '', // 图标(可选)
						url: 'homebot://getMapList'
					}
				])
			},
			// 子输入框内容变化时被调用 可选 (未设置则无搜索)
			search: (action, searchWord, callbackSetList) => {
				// 获取一些数据
				// 执行 callbackSetList 显示出来
				callbackSetList([
					{
						title: '这是标题1',
						description: '这是描述',
						icon: '', // 图标
						url: 'https://yuanliao.info'
					}
				])
			},
			// 用户选择列表中某个条目时被调用
			select: (action, itemData, callbackSetList) => {
				window.utools.hideMainWindow()
				const url = itemData.url
				if (url === "homebot://getfull") {
					parseLog(action);
				} else if (url === "homebot://diviceMerge") {

				} else if (url === "homebot://diviceMerge") {

				} else if (url === "homebot://requestParam") {

				} else if (url === "homebot://getMapList") {

				}
				// parseLog(action)
				// window.utools.outPlugin()
			},
			// 子输入框为空时的占位符，默认为字符串"搜索"
			placeholder: "搜索"
		}
	}
}