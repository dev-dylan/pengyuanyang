<script setup>
import Input from './input.vue'
// import Select from './select.vue'
import { ref } from 'vue'

const menu = ref(undefined)

</script>

<template>
  <div class="greetings">
    <d-menu mode="horizontal" router=true>
    <d-menu-item key="Input"> 输入内容 </d-menu-item>
    <d-menu-item key="Select"> 选择文件 </d-menu-item>
  </d-menu>
  <Input />
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
