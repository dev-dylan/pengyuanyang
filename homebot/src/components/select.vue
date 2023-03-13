<script setup>
import { ref } from 'vue'
import pako from 'pako';
import { toByteArray, fromByteArray } from 'base64-js'
import { saveAs } from 'file-saver';
import JSZip from 'jszip'
import { read, writeFileXLSX, utils } from 'xlsx'

const excelContent = ref(undefined)
const fileInput = ref(undefined)

function parseExcel() {
  let content = excelContent.value
  if (typeof content !== 'string' || content.isEmpty) {
    excelContent.value = "请先选择可用的 Excel 文件"
    return
  }

  if (!isJsonString(content)) {
    excelContent.value = "请先选择可用的 Excel 文件"
    return
  }

  let array = JSON.parse(content)
  parseJSONContent(array, 2)
}

function isJsonString(str) {
  try {
    if (typeof JSON.parse(str) == "object") {
      return true;
    }
  } catch (e) {
  }
  return false;
}

function parseJSONContent(array, mode) {
  var zip = new JSZip();
  let res = zip.folder("所有地图数据")
  array.forEach(element => {

    if (element.is_deleted === "1") {
      return true;
    }

    let realTime = parseEncodeContent(element.map_real_time, mode)
    let beau = parseEncodeContent(element.map_modification, mode)
    let furn = parseEncodeContent(element.map_furnitures, mode)
    let mat = parseEncodeContent(element.map_material, mode)
    let stain = parseEncodeContent(element.map_stain, mode)
    let obs = parseEncodeContent(element.map_obstacles, mode)
    let map = res.folder(element.map_name + "「" + element.map_index + "」"  + "「" + element.update_time + "」");

    map.file("临时地图.txt", realTime);
    map.file("分区地图.txt", beau);
    map.file("家具地图.txt", furn);
    map.file("材质地图.txt", mat);
    map.file("污渍地图.txt", stain);
    map.file("障碍物地图.txt", obs);
    map.file("原始数据.text", JSON.stringify(element));
  });

  res.file("excel数据.txt", JSON.stringify(array));
  zip.generateAsync({type:"blob"}).then(function(content) {
        saveAs(content, "地图压缩包.zip");
  });  
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

function changeFile(event) {
  // 获取file对象
  const files = event.target.files
  if (files && files.length > 0) {
    const file = files[0]

    // 创建FileReader
    const reader = new FileReader()

    reader.onload = function (e) {
      // console.log(e)
      // 获取字节流
      const data = e.target.result;
      // 读取excel
      const wb = read(data, {
        type: 'binary'//以二进制的方式读取
      });
      let json = utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      // 获取json
      console.log('XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]): ', json);
      excelContent.value = JSON.stringify(json)
    }
    // 开始读文件
    reader.readAsArrayBuffer(file)
  }
}
</script>

<template>
  <div class="greetings">
    将当前输入框内数据进行 Gzip 压缩和 Base64 处理、
    <el-input placeholder="请选择文件" v-model="fileInput">
      <d-button @click="openFile"></d-button>
    </el-input>
    <input type="file" name="filename" id="open" @change="changeFile" />
    <d-popover content="1. GZip压缩, 2. base64 编码" trigger="hover" style="background-color: #7693f5; color: #fff">
      <d-button id="click" @click="parseExcel">解析Excel 内容</d-button>
    </d-popover>
    <h3>返回值</h3>
    <textarea v-model="excelContent" style="width:100%;height:400px"></textarea>
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
