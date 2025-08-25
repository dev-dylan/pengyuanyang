const pako = require('./node_modules/pako/index.js');

const { toByteArray, fromByteArray } = require("base64-js");
var FileSaver = require('file-saver');
const basekit = require("./basekit.js");
const AdmZip = require("adm-zip");
const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

function downloadsPath() {
    if (typeof module !== 'undefined' && module.exports) {
        // 在 Node.js 环境中
        const downloadDir = path.join(os.homedir(), 'Downloads');
        return downloadDir;
    } else {
        const utools = window.utools
        return utools.getPath("downloads");
    }
}

function showNotification(message) {
    if (typeof module !== 'undefined' && module.exports) {
        // 在 Node.js 环境中
        console.log(message);
    } else {
        const utools = window.utools
        utools.showNotification(message);
    }
}

function shellOpenPath(path) {
    if (typeof module !== 'undefined' && module.exports) {
        // 在 Node.js 环境中，macOS
        let command = `open "${path}"`;
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error('打开文件夹时出错：', error);
            }
        });
    } else {
        const utools = window.utools
        utools.shellOpenPath(res);
    }
}

// 返回截取后的 request body object
function sliceLogRequest(input) {
    return basekit.sliceLogRaw(input, "param:");
}

function sliceLogResponse(input) {
    return basekit.sliceLogRaw(input, "result:");
}

// 解析单个地图的压缩数据
function encodeMapData(input, mode) {
    let value = input;
    if (typeof value !== 'string') {
        return "无效地图数据，格式错误"
    }
    value = basekit.replaceLineBreak(value);
    value = basekit.replaceBlank(value);

    const bytes = toByteArray(value);
    const gizpData = pako.ungzip(bytes, { to: 'string' });
    if (!basekit.isJsonString(gizpData)) {
        return "无效地图数据，解压错误"
    }
    var obj = JSON.parse(gizpData)
    let width = obj.width
    let height = obj.height
    let data = obj.data
    var result = ""

    if (mode === 0) {
        result = gizpData
    } else if (mode === 1) {
        result = positiveSequence(width, height, data)
    } else if (mode === 2) {
        result = negativeSequence(width, height, data)
    }
    return result
}

// 左下为原点坐标系
function positiveSequence(width, height, data) {
    var result = ""
    result = "width: " + width + "\n" + "height:" + height + "\n"
    let maxX = width - 1
    let maxY = height - 1
    for (var y = 0; y < maxY; y++) {
        for (var x = 0; x < maxX; x++) {
            let index = y * (maxX + 1) + x
            let str = String(data[index])
            let remind = 4 - str.length
            result += str
            for (var z = 0; z < remind; z++) {
                result += " "
            }
            result += ","
        }
        result += "\n\n\n"
    }
    return result
}

// 左上为原点坐标系
function negativeSequence(width, height, data) {
    var result = ""
    result = "width: " + width + "\n" + "height:" + height + "\n"
    let maxX = width - 1
    let maxY = height - 1
    for (var y = maxY; y >= 0; y--) {
        for (var x = 0; x < maxX; x++) {
            let index = y * (maxX + 1) + x
            let str = String(data[index])
            let remind = 4 - str.length
            result += str
            for (var z = 0; z < remind; z++) {
                result += " "
            }
            result += ","
        }
        result += "\n\n\n"
    }
    return result
}

function isRawLog(input) {
    let content;
    if (basekit.isJsonString(input)) {
        content = JSON.parse(input);
    } else if (basekit.isObject(content)) {
        content = input;
    }
    let raw = content.__raw__;
    return raw !== undefined;
}

function isResponse(input) {
    if (basekit.isJsonString(input)) {
        content = JSON.parse(input);
    } else if (basekit.isObject(content)) {
        content = input;
    }
    let data = content.data;
    return data !== undefined;
}

/*
1. 解析日志内容，找到 response
2. 获取临时地图、分区地图、材质地图字段内容
3. 移除字段内容里的多余换行符或空格符
4. gzip 解压，获取解压后内容
5. 二维格式化地图原始数据
6. 输出为 txt 文本文件
*/
function handleDeviceMaps(input) {
    // 当输入源时日志时，通过截取获得报文，当是报文时，直接使用
    let response = isRawLog(input) ? sliceLogResponse(input) : input;
    let isJson = basekit.isJsonString(response)
    if (!isJson) {
        showNotification("解析日志内容时出错，请检查");
        return;
    }
    showNotification("2222222");
    let mapItem = JSON.parse(response).data;
    console.log("3333333333");
    handleAllMaps(mapItem, "地图数据", 2)
}

function handleMapLists(input) {
    // 当输入源时日志时，通过截取获得报文，当是报文时，直接使用
    let slice = isRawLog(input) ? sliceLogResponse(input) : input;
    if (!basekit.isJsonString(slice)) {
        showNotification("解析日志内容时出错，请检查");
        return
    }
    let obj = JSON.parse(slice);
    let dataArray = obj.data;
    if (!basekit.isArray(dataArray)) {
        showNotification("日志数据不是 MapList, 请检查");
        return
    }
    dataArray.forEach((mapItem, index) => {
        handleAllMaps(mapItem, "地图数据_" + mapItem.mapName, 2);
    });
}

function handleDivideMergeMap(input) {
    // 当输入源时日志时，通过截取获得报文，当是报文时，直接使用
    let fileContent = isRawLog(input) ? sliceLogRequest(input) : input;
    if (fileContent.length < 0) {
        showNotification('解析日志内容时出错，请检查');
        return
    }
    let json = JSON.parse(fileContent);
    let data = json[1].mapData;
    let map = encodeMapData(data, 2);

    let dirPath = downloadsPath() + '/地图数据_分割合并';
    // 检查文件夹是否存在
    if (fs.existsSync(dirPath)) {
        // 存在则删除文件夹中的内容
        fs.readdirSync(dirPath).forEach((file) => {
            const filePath = path.join(dirPath, file);
            fs.unlinkSync(filePath);
        });
    } else {
        // 不存在则创建文件夹
        fs.mkdirSync(dirPath);
    }
    const bodyPath = dirPath + '/原始数据.txt';
    const filePath = dirPath + '/地图.txt';

    fs.writeFileSync(bodyPath, fileContent);
    fs.writeFileSync(filePath, map);
    shellOpenPath(dirPath);

}

// 解析日志的请求体内容，如果存在则返回解析后的文件路径，反之为空
function handleLogRequestBody(input) {
    if (!isRawLog(input)) {
        showNotification('输入内容不是原始日志，请检查');
        return
    }
    let fileContent = sliceLogRequest(input);
    if (fileContent.length < 0) {
        showNotification('解析日志内容时出错，请检查');
        return
    }
    const filePath = downloadsPath() + '/result.txt';
    fs.writeFile(filePath, fileContent, (err) => {
        if (err) {
            showNotification('保存文件时出错：', err);
        } else {
            console.log(filePath);
            shellOpenPath(filePath);
        }
    });
}

function handleAllMaps(mapItem, folderName, mode) {
    let data = mapItem;;
    if (data === undefined || data === null) {
        showNotification("数据中不存在 data 字段，无法解析地图数据");
        return
    }
    let realTime = encodeMapData(data.mapRealTime, mode)
    let beau = encodeMapData(data.mapModification, mode)
    let furn = encodeMapData(data.mapFurnitures, mode)
    let mat = encodeMapData(data.mapMaterial, mode)
    let stain = encodeMapData(data.mapStain, mode)
    let obs = encodeMapData(data.mapObstacles, mode)
    let carpet = encodeMapData(data.mapCarpet, mode)
    let dirPath = downloadsPath() + "/" + folderName

    // 检查文件夹是否存在
    if (fs.existsSync(dirPath)) {
        // 存在则删除文件夹中的内容
        fs.readdirSync(dirPath).forEach((file) => {
            const filePath = path.join(dirPath, file);
            fs.unlinkSync(filePath);
        });
    } else {
        // 不存在则创建文件夹
        fs.mkdirSync(dirPath);
    }

    let originData = {"code": 2000, "desc": "success", "data": data }
    let origin = JSON.stringify(originData)
    let maps = [realTime, beau, furn, mat, stain, obs, carpet, origin]
    let names = ["临时地图", "分区地图", "家具地图", "材质地图", "障碍物地图", "污渍地图", "地毯数据", "原始数据"]
    maps.forEach((mapContent, index) => {
        const fileName = `${names[index]}.txt`;
        const filePath = `${dirPath}/${fileName}`;
        fs.writeFileSync(filePath, mapContent);
    });
    shellOpenPath(dirPath);
}

  
// 解析单个地图的压缩数据
function decodeGZIPData(input) {
    let data = input;;
    if (data === undefined || data === null) {
        showNotification("数据中不存在 data 字段，无法解析地图数据");
        return
    }

    let res = basekit.removeEscapeCharacters(input);
    let realTime = encodeMapData(res, 2)
    let dirPath = downloadsPath() + "/" + "解压缩数据"

    // 检查文件夹是否存在
    if (fs.existsSync(dirPath)) {
        // 存在则删除文件夹中的内容
        fs.readdirSync(dirPath).forEach((file) => {
            const filePath = path.join(dirPath, file);
            fs.unlinkSync(filePath);
        });
    } else {
        // 不存在则创建文件夹
        fs.mkdirSync(dirPath);
    }

    let originData = {"code": 2000, "desc": "success", "data": data }
    let origin = JSON.stringify(originData)
    let maps = [realTime]
    let names = ["临时地图"]
    maps.forEach((mapContent, index) => {
        const fileName = `${names[index]}.txt`;
        const filePath = `${dirPath}/${fileName}`;
        fs.writeFileSync(filePath, mapContent);
    });
    shellOpenPath(dirPath);
}

module.exports = {
    handleDeviceMaps,
    handleLogRequestBody,
    handleMapLists,
    handleDivideMergeMap,
    decodeGZIPData
};