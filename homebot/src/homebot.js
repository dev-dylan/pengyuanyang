import pako from 'pako';
import { toByteArray, fromByteArray } from 'base64-js';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import basekit from './basekit';


function sliceLogRequest(input) {
    return sliceLogRaw(input, "param:");
}

function sliceLogResponse(input) {
    return sliceLogRaw(input, "result:");
}

function sliceLogRaw(input, start) {
    let isJson = basekit.isJsonString(input)
    if (!isJson) {
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
    let isJson = basekit.isJsonString(response)
    if (!isJson) {
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

    var zip = new JSZip();
    zip.file("临时地图.txt", realTime);
    zip.file("分区地图.txt", beau);
    zip.file("家具地图.txt", furn);
    zip.file("材质地图.txt", mat);
    zip.file("污渍地图.txt", stain);
    zip.file("障碍物地图.txt", obs);
    zip.file("原始数据.text", JSON.stringify(jsonObj));
    zip.generateAsync({ type: "blob" }).then(function (content) {
        saveAs(content, "地图压缩包.zip");
    });
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

export default {
    sliceLogRequest,
    sliceLogResponse,
    parseDeviceMaps
};
