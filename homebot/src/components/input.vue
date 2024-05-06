<script setup>
import { ref } from 'vue'
import homebot from '../homebot'

const textdata = ref(undefined)
const decodeText = ref(undefined)

const fileInput = ref(undefined)

function saveData() {
  var value = textdata.value
  homebot.parseDeviceMaps(value)
  console.log("测试内容")
}

/**
 * 画地图
 * @param {HTMLCanvasElement} canvas canvas元素
 * @param {Number[]} data 地图点位数据
 * @param {Number} width 地图宽度
 * @param {Number} height 地图高度
 */
function drawMap(canvas, data, width, height) {
  const context = canvas.getContext('2d'); //得到绘图的上下文环境
  console.log(context);
  // context.scale(1 / width, 1 / height);
  
  for (let i = 0; i < data.length; i++) {
    if (data[i] === 100) {
      const x = i % width;
      context.fillStyle = 'black';
      const y = Math.floor(i / width);
      context.fillRect(x, y, 1, 1);
    } else {

    }
  }
}

</script>
<template>
  <div class="greetings">
    将当前输入框内数据进行 Gzip 压缩和 Base64 处理。
    支持格式：
    1. GZIP 压缩后的地图数据
    2. getFull 接口全量报文
    <textarea v-model="textdata" id="textArea" rows="15" cols="100" placeholder="请输入要压缩/解压数据"></textarea>
    <d-popover content="1. 保存当前返回值到本地 txt 文件中" trigger="hover" style="background-color: #7693f5; color: #fff">
      <d-button id="click" @click="saveData">解析数据并保存到本地</d-button>
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
