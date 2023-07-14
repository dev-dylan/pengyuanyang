<script setup>
import Input from './input.vue'
import Select from './select.vue'
import Ros from './ros.vue'
// import Select from './select.vue'
import { ref } from 'vue'

const menu = ref("Input")

function menuAciton(event) {
  let key = event.key;
  menu.value = key;
}

</script>

<template>
  <div class="greetings">
    <d-menu mode="horizontal" @select="menuAciton" v-model="menu">
      <d-menu-item key="Input"> 手动输入地图内容 </d-menu-item>
      <d-menu-item key="Select"> 解析 Excel 文件 </d-menu-item>
      <d-menu-item key="Ros"> ROS 地图 </d-menu-item>
  </d-menu>
    <template v-if ="menu=='Input'"><Input/></template>
    <template v-if ="menu=='Select'"><Select/></template>
    <template v-if ="menu=='Ros'"><Ros/></template>
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
