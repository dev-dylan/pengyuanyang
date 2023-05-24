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
    excelContent.value = "请先选择可用的 JSON 文件"
    return
  }

  if (!isJsonString(content)) {
    excelContent.value = "请先选择可用的 JSON 文件"
    return
  }

  let json = JSON.parse(content)
  let width = json["map_width"]
  let height = json["map_height"]
  let data = json["partition_data"]

  console.log("开始解析数据")
  console.log(width)
  console.log(height)
  console.log(data)
  let result = negativeSequence(width, height, data)
  if (result.length <= 0) {
    return
  }
  let strData = new Blob([result], { type: 'text/plain;charset=utf-8' });
  saveAs(strData, "格式化地图.txt");
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

      console.log(data)

      var enc = new TextDecoder("utf-8");
      var uint8_msg = new Uint8Array(data);
      let decodedString = enc.decode(uint8_msg)
      let result = JSON.parse(decodedString)
      console.log(result)  
      excelContent.value = JSON.stringify(result)
    }
    // 开始读文件
    reader.readAsArrayBuffer(file)
  }
}
</script>

<template>
  <div class="greetings">
    <div>当前只支持固定格式 json 解析，示例如：</div>
    <div>{"map_height": 100, "map_width": 100, "partition_data": [-1,-1,-1]}</div>
    <el-input placeholder="请选择文件" v-model="fileInput">
      <d-button @click="openFile"></d-button>
    </el-input>
    <input type="file" name="filename" id="open" @change="changeFile" />
    <d-popover content="1. GZip压缩, 2. base64 编码" trigger="hover" style="background-color: #7693f5; color: #fff">
      <d-button id="click" @click="parseExcel">解析json 内容</d-button>
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
