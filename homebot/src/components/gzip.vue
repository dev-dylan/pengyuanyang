<script setup>
import { ref } from 'vue'
import pako from 'pako';
// import { encode, decode } from 'js-base64';
import { toByteArray } from 'base64-js'
// import Base64 from 'crypto-js/enc-base64'

// defineProps({
//   msg: {
//     type: String,
//     required: true
//   }
// })

const textdata = ref(undefined)
const decodeText = ref(undefined)

// const zip = (data) => {
//   if (!data) return data
//   // 判断数据是否需要转为JSON
//   const dataJson = typeof data !== 'string' && typeof data !== 'number' ? JSON.stringify(data) : data

//   // 使用Base64.encode处理字符编码，兼容中文
//   const str = encode(dataJson)
//   let binaryString = pako.gzip(str);
//   let arr = Array.from(binaryString);
//   let s = "";
//   arr.forEach((item, index) => {
//     s += String.fromCharCode(item)
//   })
//   return btoa(s)
// }

// // 解压
// const unzip = (b64Data) => {
//   let strData = atob(b64Data);
//   let charData = strData.split('').map(function (x) {
//     return x.charCodeAt(0);
//   });
//   let binData = new Uint8Array(charData);
//   let data = pako.ungzip(binData);

//   // ↓切片处理数据，防止内存溢出报错↓
//   let str = '';
//   const chunk = 8 * 1024
//   let i;
//   for (i = 0; i < data.length / chunk; i++) {
//     str += String.fromCharCode.apply(null, data.slice(i * chunk, (i + 1) * chunk));
//   }
//   str += String.fromCharCode.apply(null, data.slice(i * chunk));
//   // ↑切片处理数据，防止内存溢出报错↑

//   const unzipStr = decode(str);
//   let result = ''

//   // 对象或数组进行JSON转换
//   try {
//     result = JSON.parse(unzipStr)
//   } catch (error) {
//     if (/Unexpected token o in JSON at position 0/.test(error)) {
//       // 如果没有转换成功，代表值为基本数据，直接赋值
//       result = unzipStr
//     }
//   }
//   return result
// }

function gzipClick() {
  let value = textdata.value

  // let ba11 = btoa("123");
  // let de11 = atob(ba11);
  // console.log(ba11);
  // console.log(de11);

  // const data = zip(obj)
  console.log(value);
  const result = unzip(value)
  console.log(result, 'result++++++++++');


}

function formatString() {
  var value = textdata.value
  value = value.replace(/\\t|\\n|\\v|\\r|\\f/g, '\\r\\n');
  console.log(value);
}

function ungzipClick() {
  let value = textdata.value
  // console.log(value)
  // console.log(atob(value))
  // console.log(toUint8Array(value))
  // let base64 = decode(value.replaceAll(/[\r\n]/g, ''))
  // console.log(base64)
  // let ungzip = pako.ungzip(base64)
  // console.log(ungzip)
  // console.log(JSON.stringify(value))
  // console.log(value.replace(/-/g, "+").replace(/_/g, "/"))
  // console.log(document.querySelector('#textArea').value)
  const bytes = toByteArray(value.replace(/\\\\r\\\\n/g, '').replace(/\\r\\n/g, ''));
  try {
    console.log(pako)
    const gizpData = pako.ungzip(bytes, { to: 'string' });
    decodeText.value = gizpData
    console.log(gizpData);

  } catch (error) {
    console.error(error)
  }

}

</script>

<template>
  <div class="greetings">
    将当前输入框内数据进行 Gzip 压缩和 Base64 处理、
    <textarea v-model="textdata" id="textArea" rows="30" cols="70" maxlength="3000" placeholder="请输入要压缩/解压数据"></textarea>
    <button id="click" @click="gzipClick">压缩数据</button>
    <button id="click" @click="ungzipClick">解压缩数据</button>
    <button id="click" @click="formatString">添加换行符</button>

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
