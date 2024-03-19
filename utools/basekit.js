function replaceLineBreak(input) {
    let value = input;
    value = value.replace(/\\\\r\\\\n/g, '')
    value = value.replace(/\\r\\n/g, '')
    value = value.replace(/\r\n/g, '')
    value = value.replace(/\\n/g, '')
    value = value.replace(/\n/g, '')
    return value;
}

function replaceBlank(input, replacement) {
    let value = input;
    value = value.replace(/       /g, replacement)
    value = value.replace(/      /g, replacement)
    value = value.replace(/     /g, replacement)
    value = value.replace(/    /g, replacement)
    value = value.replace(/   /g, replacement)
    value = value.replace(/  /g, replacement)
    value = value.replace(/ /g, replacement)
    value = value.replace(/\t|\n|\r/g, replacement)
    return value;
}

function removeEscapeCharacters(str) {
    return str.replace(/\\(?!n|r)/g, '');
  }

function isJsonString(input) {
    try {
        if (typeof JSON.parse(input) == "object") {
            return true;
        }
    } catch (e) {
    }
    return false;
}

function isObject(input) {
    try {
        if (typeof input === 'object' && input !== null) {
            return true;
          } else {
            return false;
          }          
    } catch (e) {
    }
    return false;
}

function isArray(input) {
    try {
        if (Array.isArray(input)) {
            console.log('JSON 对象是一个数组');
            return true;
        } else {
            console.log('JSON 对象不是一个数组');
            return false;
        }
    } catch (error) {
        console.error('无法解析 JSON 数据：', error);
    }
    return false;
}

function sliceLogRaw(input, start) {
    let isJson = isJsonString(input)    
    if (!isJson) {
        console.log("截取原始日志错误，输入源不是 JSON String");
        return ""
    }
    let content = JSON.parse(input);
    let startStr = start.length > 0 ? start : 'result:';
    let raw = content.__raw__;
    if (raw.length < start.length) {
        console.log("截取原始日志错误，输入源内容不正确，长度过短");
        return "";
    }

    let startIndex = raw.indexOf(startStr) + startStr.length;
    let stack = [];
    let brackets = ['{', '}', '[', ']', '(', ')'];
    let res = '';
    
    console.log("ssssss");
    for (let i = startIndex; i < raw.length; i++) {
        const char = raw[i];
        if (i > startIndex && stack.length === 0) {
            res = raw.substring(startIndex, i);
            break;
        } else {
            if (brackets.includes(char)) {
                stack.push(char);
                if (stack.length > 1) {
                    if (brackets.indexOf(stack[stack.length - 1]) % 2 === 1) {
                        const endIndex = brackets.indexOf(stack[stack.length - 1]);
                        if (stack[stack.length - 2] === brackets[endIndex - 1]) {
                            stack.pop();
                            stack.pop();
                        }
                    }

                    if (i === raw.length - 1 && stack.length === 0) {
                        res = raw.substring(startIndex, i + 1);
                    }
                }
            }
        }
    }
    return res;
}
module.exports = {
    replaceLineBreak,
    replaceBlank,
    isJsonString,
    isObject,
    isArray,
    sliceLogRaw,
    removeEscapeCharacters
      
};