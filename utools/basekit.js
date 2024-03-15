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

function isJsonString(input) {
    try {
        if (typeof JSON.parse(input) == "object") {
            return true;
        }
    } catch (e) {
    }
    return false;
}

module.exports = {
    replaceLineBreak,
    replaceBlank,
    isJsonString,
};