<script setup>
import { ref } from 'vue'
import pako from 'pako';
import { toByteArray, fromByteArray } from 'base64-js'
import { saveAs } from 'file-saver';
import JSZip from 'jszip'

const textdata = ref(undefined)
const decodeText = ref(undefined)

const fileInput = ref(undefined)

function gzipClick() {
  let value = textdata.value
  let result = pako.gzip(value)
  let strin = fromByteArray(result)
  decodeText.value = strin
}

function isJsonString(str) {
      try {
          if (typeof JSON.parse(str) == "object") {
              return true;
          }
      } catch(e) {
      }
      return false;
  }

function formatString() {
  var value = textdata.value
  value = value.replace(/\\t|\\n|\\v|\\r|\\f/g, '\\r\\n');
  decodeText.value = JSON.stringify(value)
}

function parseEncodeContent(input, mode) {
  var value = input
  if (typeof value !== 'string') {
    return "无效地图数据"
  } 
  value = value.replace(/\\\\r\\\\n/g, '')
  value = value.replace(/\\r\\n/g, '')
  value = value.replace(/\r\n/g, '')
  value = value.replace(/\\n/g, '')
  value = value.replace(/\n/g, '')
  const bytes = toByteArray(value);
  const gizpData = pako.ungzip(bytes, { to: 'string' });
  
  if (!isJsonString(gizpData)) {
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

function parseJSONContent(jsonObj, mode) {
  let data = jsonObj.data

  let realTime = parseEncodeContent(data.mapRealTime, mode)
  let beau = parseEncodeContent(data.mapModification, mode)
  let furn = parseEncodeContent(data.mapFurnitures, mode)
  let mat = parseEncodeContent(data.mapMaterial, mode)
  let stain = parseEncodeContent(data.mapStain, mode)
  let obs = parseEncodeContent(data.mapObstacles, mode)

  var zip = new JSZip();
  zip.file("临时地图.txt", realTime);
  zip.file("分区地图.txt", beau);
  zip.file("家具地图.txt", furn);
  zip.file("材质地图.txt", mat);
  zip.file("污渍地图.txt", stain);
  zip.file("障碍物地图.txt", obs);
  zip.file("原始数据.text", JSON.stringify(jsonObj));
  zip.generateAsync({type:"blob"}).then(function(content) {
      saveAs(content, "地图压缩包.zip");
  });
}

function ungzipAction(mode) {
  var value = textdata.value

  let isJson = isJsonString(value)
  if (isJson) {
    parseJSONContent(JSON.parse(value), mode)
  } else {
    let result = parseEncodeContent(value, mode)
    decodeText.value = result
  }
}
// 正序格式化
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
          for (var z = 0;z < remind; z++) {
            result += " "
          }
          result += ","
      }
      result += "\n\n\n"
    }
    return result
}
// 反序格式化
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
          for (var z = 0;z < remind; z++) {
            result += " "
          }
          result += ","
      }
      result += "\n\n\n"
    }
    return result
}

function mockData() {
  ungzipAction(1)
  let result = remainSingleBlankLine(decodeText.value)
  decodeText.value = result
}

function ungzipClick(mode) {
  ungzipAction(mode)
}

function reserveSingleBlankLine() {
  var value = textdata.value
  console.log(value)
  value = remainSingleBlankLine(value)
  decodeText.value = value
}

function replaceToSeperator() {
  var value = textdata.value
  value = value.replace(/       /g, ',')
  value = value.replace(/      /g, ',')
  value = value.replace(/     /g, ',')
  value = value.replace(/    /g, ',')
  value = value.replace(/   /g, ',')
  value = value.replace(/  /g, ',')
  value = value.replace(/ /g, ',')
  value = value.replace(/\t|\n|\r/g, ',')
  let array = value.split(',')
  decodeText.value = value
}

function remainSingleBlankLine(value) {
  let result = value.replace(/\n\n\n\n\n/g, '\n').replace(/\n\n\n\n/g, '\n').replace(/\n\n\n/g, '\n').replace(/\n\n/g, '\n')
  return result
}

function removeAllBlankLines(value) {
  let result = value.replace(/\n\n\n\n\n/g, '').replace(/\n\n\n\n/g, '').replace(/\n\n\n/g, '').replace(/\n\n/g, '').replace(/\n/g, '')
  return result
}

function ab2str(buf) {
   return String.fromCharCode.apply(null, new Uint16Array(buf));
}
 
// 字符串转为ArrayBuffer对象，参数为字符串
function str2ab(str) {
    var buf = new ArrayBuffer(str.length*2); // 每个字符占用2个字节
    var bufView = new Uint16Array(buf);
    for (var i=0, strLen=str.length; i<strLen; i++) {
         bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

function saveTxt() {
  let str = decodeText.value
  if (str.length <= 0) {
    alert
  }
  // let strData = new Blob([str], { type: 'text/plain;charset=utf-8' });
  // saveAs(strData, "测试文件下载.txt");

  const zip = new JSZip()
  zip.file('临时地图.txt', str2ab(str), { binary: true }) // 逐个添加文件
  
  zip.generateAsync({type:"blob"}).then(content => { // 生成二进制流
   FileSaver.saveAs(content, "地图打包数据.zip") // 利用file-saver保存文件
  })
}

function handleFileInput() {
    const file = fileInput.value.files[0]
    const reader = new FileReader()
    reader.onload = (e) => {
      console.log(e.target.result)
      let value = e.target.result
      textdata.value = value
    }
    reader.readAsText(file)
  }
  
function selectFile() {

  fileInput.dispatchEvent(new MouseEvent('click'))
}
</script>

<template>
  <div class="greetings">
    将当前输入框内数据进行 Gzip 压缩和 Base64 处理、
    <textarea v-model="textdata" id="textArea" rows="15" cols="100" placeholder="请输入要压缩/解压数据"></textarea>
    <d-popover content="1. 保存当前返回值到本地 txt 文件中" trigger="hover" style="background-color: #7693f5; color: #fff">
      <d-button id="click" @click="saveTxt">保存 text 到本地</d-button>
    </d-popover>
    <input v-show=false type="file" ref="fileInput" @change="handleFileInput" />
    <d-popover content="1. 读取本地文件并将内容写入输入框" trigger="hover" style="background-color: #7693f5; color: #fff">
      <d-button id="click" @click="selectFile">读取本地文件</d-button>
    </d-popover>
    <d-popover content="1. GZip压缩, 2. base64 编码" trigger="hover" style="background-color: #7693f5; color: #fff">
      <d-button id="click" @click="gzipClick">压缩数据</d-button>
    </d-popover>
    <d-popover content="1. base64解码, 2. GZip 解压缩" trigger="hover" style="background-color: #7693f5; color: #fff">
      <d-button id="click" @click="ungzipClick(0)">解压缩数据(原始数据)</d-button>
    </d-popover>
    <d-popover content="1. base64解码, 2. GZip 解压缩, 3. 左上坐标系格式输出" trigger="hover" style="background-color: #7693f5; color: #fff">
      <d-button id="click" @click="ungzipClick(1)">解压缩数据(正序格式化)</d-button>
    </d-popover>
    <d-popover content="1. base64解码, 2. GZip 解压缩, 3. 左下坐标系格式输出" trigger="hover" style="background-color: #7693f5; color: #fff">
      <d-button id="click" @click="ungzipClick(2)">解压缩数据(反序格式化)</d-button>
    </d-popover>
    <d-popover content="1. base64 编码文本添加 \r\n 换行符" trigger="hover" style="background-color: #7693f5; color: #fff">
      <d-button id="click" @click="formatString">添加 "\r\n" 换行符</d-button>
    </d-popover>
    <d-popover content="1. 只保留一个换行符" trigger="hover" style="background-color: #7693f5; color: #fff">
      <d-button id="click" @click="reserveSingleBlankLine">移除多余空行</d-button>
    </d-popover>
    <d-popover content="1. 将空格和换行符替换为 , 分隔" trigger="hover" style="background-color: #7693f5; color: #fff">
      <d-button id="click" @click="replaceToSeperator">替换空格为逗号</d-button>
    </d-popover>
    <d-popover content="1. 组合动作" trigger="hover" style="background-color: #7693f5; color: #fff">
      <d-button id="click" @click="mockData">组合动作：解压缩->正序格式化->去除多余空行</d-button>
    </d-popover>
    <h3>返回值</h3>
    <textarea v-model="decodeText" style="width:100%;height:400px"></textarea>
  </div>
</template>

<style scoped>
h1 {
  font-weight: 500;
  font-size: 2.6rem;
  top: -10px;
}

h3 {
  font-size: 1.2rem;
}

.greetings h1,
.greetings h3 {
  text-align: center;
}

@media (min-width: 1024px) {

  .greetings h1,
  .greetings h3 {
    text-align: left;
  }
}
</style>
