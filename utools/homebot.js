const pako = require('pako');

const { toByteArray, fromByteArray } = require("base64-js");
const saveAs = require("file-saver");
const basekit = require("./basekit.js");
const AdmZip = require("adm-zip");

function sliceLogRequest(input) {
    return sliceLogRaw(input, "param:");
}

function sliceLogResponse(input) {
    return sliceLogRaw(input, "result:");
}

function sliceLogRaw(input, start) {
    let isJson = basekit.isJsonString(input)
    let rts = JSON.parse(input);
    console.log(rts);
    if (!isJson) {
        console.log("分割字符串时传入的内容不是 JSON String");
        return ""
    }
    let content = JSON.parse(input);
    let startStr = start.length > 0 ? start : 'result:';
    let raw = content.__raw__;

    let startIndex = raw.indexOf(startStr) + startStr.length;
    let stack = [];
    let brackets = ['{', '}', '[', ']', '(', ')'];
    let res = '';

    for (let i = startIndex; i < raw.length; i++) {
        const char = raw[i];
        if (i > startIndex && stack.length === 0) {
            res = raw.substring(startIndex, i);
            break;
        } else {
            if (brackets.includes(char)) {
                stack.push(char);
                if (stack.length > 1) {
                    if (brackets.indexOf(stack[stack.length - 1]) % 2 === 1) {
                        const endIndex = brackets.indexOf(stack[stack.length - 1]);
                        if (stack[stack.length - 2] === brackets[endIndex - 1]) {
                            stack.pop();
                            stack.pop();
                        }
                    }

                    if (i === raw.length - 1 && stack.length === 0) {
                        res = raw.substring(startIndex, i + 1);
                    }
                }
            }
        }
    }
    return res;
}

/*
1. 解析日志内容，找到 response
2. 获取临时地图、分区地图、材质地图字段内容
3. 移除字段内容里的多余换行符或空格符
4. gzip 解压，获取解压后内容
5. 二维格式化地图原始数据
6. 输出为 txt 文本文件
*/
function parseDeviceMaps(input) {
    let response = sliceLogResponse(input)
    console.log(response);
    let isJson = basekit.isJsonString(response)
    if (!isJson) {
        console.log("输入的内容不是 JSON String");
        return
    }
    parseAllMaps(JSON.parse(response), 2)
}

function parseAllMaps(jsonObj, mode) {
    let data = jsonObj.data
    let realTime = encodeMapData(data.mapRealTime, mode)
    let beau = encodeMapData(data.mapModification, mode)
    let furn = encodeMapData(data.mapFurnitures, mode)
    let mat = encodeMapData(data.mapMaterial, mode)
    let stain = encodeMapData(data.mapStain, mode)
    let obs = encodeMapData(data.mapObstacles, mode)

    var zip = new AdmZip();
    zip.addFile("临时地图.txt", Buffer.from(realTime, "utf8"));
    zip.addFile("分区地图.txt", Buffer.from(beau, "utf8"));
    zip.addFile("家具地图.txt", Buffer.from(furn, "utf8"));
    zip.addFile("材质地图.txt", Buffer.from(mat, "utf8"));
    zip.addFile("障碍物地图.txt", Buffer.from(stain, "utf8"));
    zip.addFile("污渍地图.txt", Buffer.from(obs, "utf8"));
    zip.addFile("原始数据.txt", Buffer.from(JSON.stringify(jsonObj), "utf8"));
    zip.writeZip("/Users/admin/Downloads/地图压缩包.zip");
}

function encodeMapData(input, mode) {
    let value = input;
    if (typeof value !== 'string') {
        return "无效地图数据"
    }
    value = basekit.replaceLineBreak(value);
    value = basekit.replaceBlank(value);

    const bytes = toByteArray(value);
    const gizpData = pako.ungzip(bytes, { to: 'string' });
    if (!basekit.isJsonString(gizpData)) {
        return "无效地图数据"
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

    console.log(result);

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

function parseDivideMergeMap(input) {

}

module.exports = {
    sliceLogRequest,
    sliceLogResponse,
    parseDeviceMaps,
};