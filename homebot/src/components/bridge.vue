<script setup>
import { ref } from 'vue'
import pako from 'pako';
import { toByteArray, fromByteArray } from 'base64-js'
import { saveAs } from 'file-saver';
import JSZip from 'jszip'
import { read, writeFileXLSX, utils } from 'xlsx'

function postMessage(paramters) {
    window.webkit.messageHandlers.iFlyHomeBot.postMessage(paramters)
}

function setUserInfo() {
    postMessage({"name": "SwiftPlugin", "action":"testName", "data":{}, "callBackFun":""})
}

function openDownloadPage() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}

function openAppReviewPage() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}

function getUserInfo() {
    postMessage({"funcNamr":"test1"})
}

function getNetworkState() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}

function getDeviceInfo() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}
function checkPermissions() {
    postMessage({"funcNamr":"test1"})
}

function openPermissionSetting() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}

function getAppInfo() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}
function getDeviceState() {
    postMessage({"funcNamr":"test1"})
}

function getWifiList() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}

function get3DMapModels() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}

function getMapCleanPath() {
    postMessage({"funcNamr":"test1"})
}

function openWifiSettings() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}

function getIpAddress() {
    postMessage({"funcNamr":"test1"})
}

function versionInfo() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}

function openUrl() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}
function openPage() {
    postMessage({"funcNamr":"test1"})
}

function logout() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}

function openAccountPersonalInfo() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}
function popToRoot() {
    postMessage({"funcNamr":"test1"})
}

function trackEvent() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}

function loadComplete() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}function test1() {
    postMessage({"funcNamr":"test1"})
}

function loadError() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}

function getSafeArea() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}

function sendMsgBySocket() {
    postMessage({"funcNamr":"test1"})
}

function connectWifi() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}

function checkSystemAbilityOpen() {
    postMessage({"name": "HomeBotPlugin", "action":"openDownloadPage", "data":{}, "callBackFun":""})
}

</script>

<template>
  <div class="greetings">
    <d-button id="click" @click="setUserInfo">setUserInfo</d-button>
    <d-button id="click" @click="openDownloadPage">openDownloadPage</d-button>
    <d-button id="click" @click="openAppReviewPage">openAppReviewPage</d-button>
    <d-button id="click" @click="getUserInfo">getUserInfo</d-button>
    <d-button id="click" @click="getNetworkState">getNetworkState</d-button>
    <d-button id="click" @click="getDeviceInfo">getDeviceInfo</d-button>
    <d-button id="click" @click="checkPermissions">checkPermissions</d-button>
    <d-button id="click" @click="openPermissionSetting">openPermissionSetting</d-button>
    <d-button id="click" @click="getAppInfo">getAppInfo</d-button>
    <d-button id="click" @click="getDeviceState">getDeviceState</d-button>
    <d-button id="click" @click="getWifiList">getWifiList</d-button>
    <d-button id="click" @click="get3DMapModels">get3DMapModels</d-button>
    <d-button id="click" @click="getMapCleanPath">getMapCleanPath</d-button>
    <d-button id="click" @click="openWifiSettings">openWifiSettings</d-button>
    <d-button id="click" @click="getIpAddress">getIpAddress</d-button>
    <d-button id="click" @click="versionInfo">versionInfo</d-button>
    <d-button id="click" @click="openUrl">openUrl</d-button>
    <d-button id="click" @click="openPage">openPage</d-button>
    <d-button id="click" @click="openAccountPersonalInfo">openAccountPersonalInfo</d-button>
    <d-button id="click" @click="logout">logout</d-button>
    <d-button id="click" @click="popToRoot">popToRoot</d-button>
    <d-button id="click" @click="trackEvent">trackEvent</d-button>
    <d-button id="click" @click="loadComplete">loadComplete</d-button>
    <d-button id="click" @click="loadError">loadError</d-button>
    <d-button id="click" @click="getSafeArea">getSafeArea</d-button>
    <d-button id="click" @click="sendMsgBySocket">sendMsgBySocket</d-button>
    <d-button id="click" @click="connectWifi">connectWifi</d-button>
    <d-button id="click" @click="checkSystemAbilityOpen">checkSystemAbilityOpen</d-button>
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
