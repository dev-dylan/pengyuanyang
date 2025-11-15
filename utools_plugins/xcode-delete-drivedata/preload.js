const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const DERIVED_DATA_PATH = path.join(process.env.HOME, 'Library/Developer/Xcode/DerivedData');

function checkDerivedDataSize() {
  try {
    // 使用du命令获取文件夹大小
    return new Promise((resolve, reject) => {
      exec(`du -sh "${DERIVED_DATA_PATH}"`, (error, stdout, stderr) => {
        if (error) {
          resolve('无法获取大小');
          return;
        }
        resolve(stdout.split('\t')[0]);
      });
    });
  } catch (error) {
    return Promise.resolve('无法获取大小');
  }
}

function deleteDerivedData() {
  try {
    if (fs.existsSync(DERIVED_DATA_PATH)) {
      // 使用rm命令删除文件夹
      exec(`rm -rf "${DERIVED_DATA_PATH}"`, (error, stdout, stderr) => {
        if (error) {
          utools.showNotification('删除失败：' + error.message);
          return;
        }
        // 创建新的空文件夹
        fs.mkdirSync(DERIVED_DATA_PATH);
        utools.showNotification('DerivedData 文件夹已清空');
      });
    } else {
      utools.showNotification('DerivedData 文件夹不存在');
    }
  } catch (error) {
    utools.showNotification('操作失败：' + error.message);
  }
}

window.exports = {
  'xcode_clean': {
    mode: 'none',
    args: {
      enter: async () => {
        const size = await checkDerivedDataSize();
        const confirmDelete = await utools.showMessageBox({
          type: 'info',
          title: '确认删除',
          message: `是否要删除 DerivedData？\n当前大小: ${size}`,
          buttons: ['确认', '取消']
        });
        
        if (confirmDelete.response === 0) {
          deleteDerivedData();
        }
        utools.outPlugin();
      }
    }
  }
}
