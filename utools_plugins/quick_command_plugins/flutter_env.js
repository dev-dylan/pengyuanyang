const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec } = require('child_process');

const ZSHRC_PATH = path.join(os.homedir(), '.zshrc');
const FLUTTER_CONFIG = `#FLUTTER PUB 配置
export PUB_HOSTED_URL=https://pub.flutter-io.cn
export FLUTTER_STORAGE_BASE_URL=https://storage.flutter-io.cn`;

function checkCurrentConfig() {
  try {
    const content = fs.readFileSync(ZSHRC_PATH, 'utf8');
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('#FLUTTER PUB 配置')) {
        // 检查下一行的注释状态
        if (i + 1 < lines.length) {
          const isCommented = lines[i + 1].startsWith('#');
          return {
            found: true,
            isCommented: isCommented,
            status: isCommented ? '当前使用官方源' : '当前使用国内源'
          };
        }
      }
    }
    return {
      found: false,
      isCommented: false,
      status: '未找到 Flutter 配置'
    };
  } catch (error) {
    return {
      found: false,
      isCommented: false,
      status: '读取配置失败'
    };
  }
}

function toggleFlutterConfig() {
  try {
    let content = fs.readFileSync(ZSHRC_PATH, 'utf8');
    const lines = content.split('\n');
    let found = false;
    let isCommented = false;
    let currentStatus = '';

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('#FLUTTER PUB 配置')) {
        found = true;
        // 检查下一行的注释状态
        if (i + 1 < lines.length) {
          isCommented = lines[i + 1].startsWith('#');
        }

        // 标题行保持不变
        // 只修改后面两行的注释状态
        for (let j = i + 1; j < i + 3 && j < lines.length; j++) {
          if (isCommented) {
            // 如果是注释状态，移除注释符号
            lines[j] = lines[j].startsWith('#') ? lines[j].substring(1) : lines[j];
          } else {
            // 如果不是注释状态，添加注释符号
            lines[j] = lines[j].startsWith('#') ? lines[j] : '#' + lines[j];
          }
        }
        break;
      }
    }

    if (!found) {
      // 如果没找到配置，就添加到文件末尾
      lines.push(FLUTTER_CONFIG);
      isCommented = false; // 新添加的配置默认是启用状态
    }

    fs.writeFileSync(ZSHRC_PATH, lines.join('\n'));

    // 执行 source ~/.zshrc 命令
    exec('source ~/.zshrc', { shell: '/bin/zsh' }, (error, stdout, stderr) => {
      if (error) {
        console.error('执行 source 命令失败:', error);
      }
    });

    // 获取切换后的状态
    const newConfig = checkCurrentConfig();

    return {
      success: true,
      message: isCommented ?
        '已切换到国内源 (pub.flutter-io.cn)' :
        '已切换到官方源 (pub.dev)',
      status: newConfig.status
    };
  } catch (error) {
    return {
      success: false,
      message: '操作失败：' + error.message,
      status: '配置更新失败'
    };
  }
}
const result = toggleFlutterConfig();
utools.showNotification(result.message + '\n' + result.status);
utools.outPlugin();
