const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

// OGG 容器创建函数（纯 JavaScript 实现，不依赖外部工具）
function createOggContainer(opusData, sampleRate = 48000, channels = 1) {
    const pages = [];
    
    // 创建 OpusHead 数据包
    const opusHead = Buffer.alloc(19);
    opusHead.write('OpusHead', 0); // Magic signature: 8 bytes
    opusHead[8] = 1; // Version
    opusHead[9] = channels; // Channel count
    opusHead.writeUInt16LE(3840, 10); // Pre-skip (2 bytes, little-endian) - Opus 标准值，用于处理编码延迟
    opusHead.writeUInt32LE(sampleRate, 12); // Input sample rate (4 bytes, little-endian)
    opusHead.writeInt16LE(0, 16); // Output gain (2 bytes, little-endian) - 位置16，值为0表示无增益调整
    opusHead[18] = 0; // Channel mapping family
    
    // 创建 OpusTags 数据包
    const vendorString = 'Node.js OGG Encoder';
    const vendorStringLength = Buffer.byteLength(vendorString);
    // 结构：8字节(magic) + 4字节(vendor长度) + vendorString + 4字节(comment数量)
    const opusTagsSize = 8 + 4 + vendorStringLength + 4;
    const opusTags = Buffer.alloc(opusTagsSize);
    opusTags.write('OpusTags', 0); // Magic signature: 8 bytes
    opusTags.writeUInt32LE(vendorStringLength, 8); // Vendor string length (4 bytes)
    opusTags.write(vendorString, 12); // Vendor string (vendorStringLength bytes)
    // User comment list length (4 bytes) - 位置在 vendorString 之后
    const commentListOffset = 12 + vendorStringLength;
    opusTags.writeUInt32LE(0, commentListOffset); // User comment list length (0)
    
    // 创建第一个 OGG 页面（包含 OpusHead）
    pages.push(createOggPage(opusHead, 0, 0, true, false));
    
    // 创建第二个 OGG 页面（包含 OpusTags）
    pages.push(createOggPage(opusTags, 0, 1, false, false));
    
    // 将 Opus 数据包分割并封装到 OGG 页面中
    // OGG 页面最大数据大小约为 255 * 255 = 65025 字节
    const maxPageSize = 65025;
    let granulePos = 0;
    let pageSequence = 2;
    let offset = 0;
    
    while (offset < opusData.length) {
        const remaining = opusData.length - offset;
        const chunkSize = Math.min(remaining, maxPageSize);
        const chunk = opusData.slice(offset, offset + chunkSize);
        
        // 估算 granule position（每帧约 20ms，48000Hz 采样率下约 960 采样）
        // 这里简化处理，假设每个数据包对应一定数量的采样
        const samplesPerPacket = Math.floor(chunkSize / 40) * 960; // 粗略估算
        granulePos += samplesPerPacket;
        
        const isLastPage = (offset + chunkSize >= opusData.length);
        pages.push(createOggPage(chunk, granulePos, pageSequence, false, isLastPage));
        
        offset += chunkSize;
        pageSequence++;
    }
    
    // 合并所有页面
    return Buffer.concat(pages);
}

// 创建 OGG 页面
function createOggPage(data, granulePos, sequenceNumber, isBOS = false, isEOS = false) {
    // OGG 页面头结构
    const header = Buffer.alloc(27); // 基础头大小
    
    // Capture pattern: "OggS"
    header.write('OggS', 0);
    
    // Version: 0
    header[4] = 0;
    
    // Header type flag
    let headerType = 0;
    if (isBOS) headerType |= 0x02; // Beginning of stream
    if (isEOS) headerType |= 0x04; // End of stream
    header[5] = headerType;
    
    // Granule position (8 bytes, little-endian)
    header.writeUInt32LE(granulePos & 0xFFFFFFFF, 6);
    header.writeUInt32LE((granulePos / 0x100000000) | 0, 10);
    
    // Serial number (4 bytes, little-endian) - 使用固定值
    header.writeUInt32LE(0x12345678, 14);
    
    // Page sequence number (4 bytes, little-endian)
    header.writeUInt32LE(sequenceNumber, 18);
    
    // Checksum (4 bytes) - 先设为0，后面计算
    header.writeUInt32LE(0, 22);
    
    // 计算段表
    const segmentTable = [];
    let remaining = data.length;
    let offset = 0;
    
    while (remaining > 0) {
        const segmentSize = Math.min(remaining, 255);
        segmentTable.push(segmentSize);
        remaining -= segmentSize;
        offset += segmentSize;
    }
    
    // 页面段数量
    const pageSegments = segmentTable.length;
    header[26] = pageSegments;
    
    // 创建完整的页面头（包含段表）
    const segmentTableBuffer = Buffer.from(segmentTable);
    const fullHeader = Buffer.concat([header, segmentTableBuffer]);
    
    // 计算并写入校验和
    // 注意：校验和字段在 header 的位置 22-25，在 fullHeader 中也是相同位置
    const checksum = calculateOggChecksum(fullHeader, data);
    fullHeader.writeUInt32LE(checksum, 22);
    
    // 返回完整的页面（头 + 数据）
    return Buffer.concat([fullHeader, data]);
}

// 计算 OGG 页面校验和（CRC32）
function calculateOggChecksum(header, data) {
    // CRC32 查找表（一次性生成）
    if (!calculateOggChecksum.crcTable) {
        calculateOggChecksum.crcTable = [];
        for (let i = 0; i < 256; i++) {
            let crc = i;
            for (let j = 0; j < 8; j++) {
                crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
            }
            calculateOggChecksum.crcTable[i] = crc;
        }
    }
    const crcTable = calculateOggChecksum.crcTable;
    
    // OGG 使用 CRC32，初始值为 0
    let crc = 0;
    
    // 计算 header 的 CRC（跳过校验和字段，位置 22-25）
    for (let i = 0; i < header.length; i++) {
        if (i >= 22 && i < 26) continue; // 跳过校验和字段
        crc = crcTable[(crc ^ header[i]) & 0xFF] ^ (crc >>> 8);
    }
    
    // 计算 data 的 CRC
    for (let i = 0; i < data.length; i++) {
        crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
    }
    
    // 返回 CRC32 值（需要转换为无符号 32 位整数）
    return (crc >>> 0);
}

// 使用 ffmpeg 将 opus 转换为 ogg 文件
function convertToOggWithFFmpeg(inputFile, outputFile, sampleRate = 48000, channels = 1) {
    try {
        // 使用 ffmpeg 将原始 opus 数据重新封装为 ogg 容器
        // -f opus: 指定输入格式为 opus
        // -ar: 采样率
        // -ac: 通道数
        // -i: 输入文件
        // -c:a copy: 直接复制音频流，不重新编码
        // -y: 覆盖输出文件（如果存在）
        execSync(`ffmpeg -f opus -ar ${sampleRate} -ac ${channels} -i "${inputFile}" -c:a copy -y "${outputFile}"`, {
            stdio: 'pipe'
        });
        return true;
    } catch (error) {
        return false;
    }
}

// 将裸 opus 数据流转换为标准的 opus 文件（OGG 容器格式）
// 参数：
//   rawOpusFile: 裸 opus 数据流文件路径
//   outputOpusFile: 输出的标准 opus 文件路径（可选，默认在相同目录下）
//   useFFmpeg: 是否使用 ffmpeg（默认 false，使用纯 JavaScript）
// 注意：固定使用 16kHz 采样率和单通道
function convertRawOpusToStandardOpus(rawOpusFile, outputOpusFile = null, useFFmpeg = false) {
    // 固定参数：16kHz 采样率，单通道
    const SAMPLE_RATE = 16000;
    const CHANNELS = 1;
    
    try {
        // 如果没有指定输出文件，自动生成
        if (!outputOpusFile) {
            const pathInfo = path.parse(rawOpusFile);
            outputOpusFile = path.join(pathInfo.dir, pathInfo.name + '_standard.opus');
        }
        
        console.log(`正在读取裸 opus 数据流: ${rawOpusFile}`);
        const rawOpusData = fs.readFileSync(rawOpusFile);
        console.log(`裸 opus 数据大小: ${rawOpusData.length} 字节`);
        console.log(`固定参数: 采样率 ${SAMPLE_RATE}Hz, ${CHANNELS} 通道`);
        
        if (useFFmpeg) {
            // 使用 ffmpeg 方案
            console.log(`使用 ffmpeg 将裸 opus 数据流转换为标准 opus 文件...`);
            
            if (convertToOggWithFFmpeg(rawOpusFile, outputOpusFile, SAMPLE_RATE, CHANNELS)) {
                console.log(`已成功使用 ffmpeg 转换为标准 opus 文件: ${outputOpusFile}`);
                console.log(`  采样率: ${SAMPLE_RATE}Hz, 通道: ${CHANNELS}`);
                const stats = fs.statSync(outputOpusFile);
                console.log(`  文件大小: ${stats.size} 字节`);
                return true;
            } else {
                console.error("ffmpeg 转换失败，回退到纯 JavaScript 方案...");
                useFFmpeg = false;
            }
        }
        
        if (!useFFmpeg) {
            // 使用纯 JavaScript 方案
            console.log(`使用纯 JavaScript 将裸 opus 数据流转换为标准 opus 文件...`);
            
            try {
                // 使用纯 JavaScript 实现创建 OGG 容器
                const oggData = createOggContainer(rawOpusData, SAMPLE_RATE, CHANNELS);
                fs.writeFileSync(outputOpusFile, oggData);
                console.log(`已成功转换为标准 opus 文件: ${outputOpusFile}`);
                console.log(`  采样率: ${SAMPLE_RATE}Hz, 通道: ${CHANNELS}`);
                console.log(`  文件大小: ${oggData.length} 字节`);
                return true;
            } catch (error) {
                console.error(`转换失败: ${error.message}`);
                return false;
            }
        }
        
        return true;
    } catch (error) {
        console.error("转换裸 opus 数据流时出错:", error.message);
        if (error.code === 'ENOENT') {
            console.error(`文件不存在: ${rawOpusFile}`);
        }
        return false;
    }
}

// 将裸 opus 数据流转换为 PCM 文件
// 参数：
//   rawOpusFile: 裸 opus 数据流文件路径
//   outputPcmFile: 输出的 PCM 文件路径（可选，默认在相同目录下）
//   useFFmpeg: 是否使用 ffmpeg（默认 true，因为需要解码 opus）
//   pcmFormat: PCM 格式（默认 's16le'，16-bit signed little-endian）
// 注意：固定使用 16kHz 采样率和单通道
function convertRawOpusToPcm(rawOpusFile, outputPcmFile = null, useFFmpeg = true, pcmFormat = 's16le') {
    // 固定参数：16kHz 采样率，单通道
    const SAMPLE_RATE = 16000;
    const CHANNELS = 1;
    
    try {
        // 如果没有指定输出文件，自动生成
        if (!outputPcmFile) {
            const pathInfo = path.parse(rawOpusFile);
            outputPcmFile = path.join(pathInfo.dir, pathInfo.name + '.pcm');
        }
        
        console.log(`正在读取裸 opus 数据流: ${rawOpusFile}`);
        const rawOpusData = fs.readFileSync(rawOpusFile);
        console.log(`裸 opus 数据大小: ${rawOpusData.length} 字节`);
        console.log(`固定参数: 采样率 ${SAMPLE_RATE}Hz, ${CHANNELS} 通道`);
        
        if (useFFmpeg) {
            // 使用 ffmpeg 方案（推荐，因为需要解码 opus）
            console.log(`使用 ffmpeg 将裸 opus 数据流转换为 PCM 文件...`);
            
            try {
                // 使用 ffmpeg 将原始 opus 数据解码为 PCM
                // -f opus: 指定输入格式为 opus
                // -ar: 采样率
                // -ac: 通道数
                // -i: 输入文件
                // -f: 输出格式（s16le = 16-bit signed little-endian PCM）
                // -y: 覆盖输出文件（如果存在）
                execSync(`ffmpeg -f opus -ar ${SAMPLE_RATE} -ac ${CHANNELS} -i "${rawOpusFile}" -f ${pcmFormat} -y "${outputPcmFile}"`, {
                    stdio: 'pipe'
                });
                
                const stats = fs.statSync(outputPcmFile);
                console.log(`已成功使用 ffmpeg 转换为 PCM 文件: ${outputPcmFile}`);
                console.log(`  采样率: ${SAMPLE_RATE}Hz, 通道: ${CHANNELS}`);
                console.log(`  PCM 格式: ${pcmFormat}`);
                console.log(`  文件大小: ${stats.size} 字节`);
                console.log(`  音频时长: 约 ${(stats.size / (SAMPLE_RATE * CHANNELS * 2)).toFixed(2)} 秒`);
                return true;
            } catch (error) {
                console.error("ffmpeg 转换失败:", error.message);
                console.error("请确保已安装 ffmpeg: brew install ffmpeg (macOS)");
                return false;
            }
        } else {
            // 纯 JavaScript 方案（需要安装 opus 解码库）
            console.error("纯 JavaScript 方案需要安装 opus 解码库（如 node-opus 或 opusscript）");
            console.error("建议使用 ffmpeg 方案（设置 useFFmpeg = true）");
            console.error("或者安装 opus 解码库后实现解码逻辑");
            return false;
        }
    } catch (error) {
        console.error("转换裸 opus 数据流为 PCM 时出错:", error.message);
        if (error.code === 'ENOENT') {
            console.error(`文件不存在: ${rawOpusFile}`);
        }
        return false;
    }
}

// 主函数
// useFFmpeg: true 使用 ffmpeg，false 使用纯 JavaScript 方案
function testFunc(useFFmpeg = false) {
    // 创建输出文件夹
    const outputDir = path.join(__dirname, "test_output2");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`已创建输出文件夹: ${outputDir}`);
    }
    
    // 输入文件使用当前文件夹下的 1.opus
    const inputFile = path.join(__dirname, "1.opus");
    const outputFile = path.join(outputDir, "record_processed.opus");

    try {
        // 读取 opus 文件
        console.log(`输入文件: ${inputFile}`);
        console.log(`输出文件夹: ${outputDir}`);
        console.log(`正在读取文件...`);
        const fileBuffer = fs.readFileSync(inputFile);
        console.log(`文件大小: ${fileBuffer.length} 字节`);

        // 将数据流按照每 48 字节分割
        const chunkSize = 48;
        const skipBytes = 8; // 跳过前 8 字节
        const keepBytes = 40; // 保留后续 40 字节
        
        const outputChunks = [];
        
        // 遍历文件，按 48 字节分割
        for (let i = 0; i < fileBuffer.length; i += chunkSize) {
            const chunk = fileBuffer.slice(i, i + chunkSize);
            
            // 如果块的大小小于 48 字节，跳过（可能是最后不完整的块）
            if (chunk.length < chunkSize) {
                console.log(`跳过不完整的块，大小: ${chunk.length} 字节`);
                break;
            }
            
            // 去除前 8 字节，保留后续 40 字节
            const processedChunk = chunk.slice(skipBytes, skipBytes + keepBytes);
            outputChunks.push(processedChunk);
        }
        
        // 将所有处理后的块拼接成新的 Buffer
        const outputBuffer = Buffer.concat(outputChunks);
        console.log(`处理完成，输出大小: ${outputBuffer.length} 字节`);
        console.log(`处理了 ${outputChunks.length} 个块`);
        
        // 写入新的 opus 文件
        fs.writeFileSync(outputFile, outputBuffer);
        console.log(`已保存处理后的文件: ${outputFile}`);
        
        // 将 opus 转换为标准的 ogg 音频文件
        const oggOutputFile = path.join(outputDir, "record_processed.ogg");
        
        // 固定参数：16kHz 采样率，单通道
        const SAMPLE_RATE = 16000;
        const CHANNELS = 1;
        
        if (useFFmpeg) {
            // 使用 ffmpeg 方案
            console.log(`正在将 opus 转换为 ogg 格式（使用 ffmpeg，固定 ${SAMPLE_RATE}Hz，${CHANNELS} 通道）...`);
            
            if (convertToOggWithFFmpeg(outputFile, oggOutputFile, SAMPLE_RATE, CHANNELS)) {
                console.log(`已成功使用 ffmpeg 转换为 ogg 文件: ${oggOutputFile}`);
                console.log(`  采样率: ${SAMPLE_RATE}Hz, 通道: ${CHANNELS}`);
                const stats = fs.statSync(oggOutputFile);
                console.log(`  OGG 文件大小: ${stats.size} 字节`);
            } else {
                console.error("ffmpeg 转换失败，请确保已安装 ffmpeg: brew install ffmpeg (macOS)");
                console.log("尝试使用纯 JavaScript 方案作为备选...");
                useFFmpeg = false;
            }
        }
        
        if (!useFFmpeg) {
            // 使用纯 JavaScript 方案
            console.log(`正在将 opus 转换为 ogg 格式（纯 JavaScript 实现，固定 ${SAMPLE_RATE}Hz，${CHANNELS} 通道）...`);
            
            try {
                // 使用纯 JavaScript 实现创建 OGG 容器
                const oggData = createOggContainer(outputBuffer, SAMPLE_RATE, CHANNELS);
                fs.writeFileSync(oggOutputFile, oggData);
                console.log(`已成功转换为 ogg 文件: ${oggOutputFile}`);
                console.log(`  采样率: ${SAMPLE_RATE}Hz, 通道: ${CHANNELS}`);
                console.log(`  OGG 文件大小: ${oggData.length} 字节`);
            } catch (error) {
                console.error(`转换失败: ${error.message}`);
            }
        }
        
        // 将处理后的裸 opus 文件转换为标准的 opus 文件（固定 16kHz 采样率，单通道）
        console.log("\n=== 将裸 opus 数据流转换为标准 opus 文件 ===");
        const standardOpusFile = path.join(outputDir, "record_processed_standard.opus");
        convertRawOpusToStandardOpus(outputFile, standardOpusFile, useFFmpeg);
        
    } catch (error) {
        console.error("处理文件时出错:", error.message);
        if (error.code === 'ENOENT') {
            console.error(`文件不存在: ${inputFile}`);
        }
    }
}

// 从命令行参数读取配置
// 使用方法：
//   node test.js              - 使用纯 JavaScript 方案（默认）
//   node test.js --ffmpeg     - 使用 ffmpeg 方案
//   node test.js --js         - 使用纯 JavaScript 方案
const args = process.argv.slice(2);
const useFFmpeg = args.includes('--ffmpeg') || args.includes('-f');

if (useFFmpeg) {
    console.log("使用 ffmpeg 方案进行转换");
} else {
    console.log("使用纯 JavaScript 方案进行转换（默认）");
}

// testFunc(useFFmpeg);


function testPCM() {
    const rawOpusFile = path.join(os.homedir(), "Downloads", "record_processed.opus");
const standardOpusFile = path.join(os.homedir(), "Downloads", "record_standard.opus");
convertRawOpusToStandardOpus(rawOpusFile, standardOpusFile, false);
}


testFunc();
// ============================================
// 单独使用 convertRawOpusToStandardOpus 方法的示例：
// ============================================
// 注意：固定使用 16kHz 采样率和单通道
// 
// // 将裸 opus 数据流转换为标准 opus 文件（纯 JavaScript）
// const rawOpusFile = path.join(os.homedir(), "Downloads", "record_processed.opus");
// const standardOpusFile = path.join(os.homedir(), "Downloads", "record_standard.opus");
// convertRawOpusToStandardOpus(rawOpusFile, standardOpusFile, false);
//
// // 将裸 opus 数据流转换为标准 opus 文件（使用 ffmpeg）
// convertRawOpusToStandardOpus(rawOpusFile, standardOpusFile, true);
//
// // 使用默认输出文件名（会在原文件同目录下生成 _standard.opus 文件）
// convertRawOpusToStandardOpus(rawOpusFile);
//
// ============================================
// 单独使用 convertRawOpusToPcm 方法的示例：
// ============================================
// 注意：固定使用 16kHz 采样率和单通道
// 
// // 将裸 opus 数据流转换为 PCM 文件（使用 ffmpeg，推荐）
// const rawOpusFile = path.join(os.homedir(), "Downloads", "record_processed.opus");
// const pcmFile = path.join(os.homedir(), "Downloads", "record.pcm");
// convertRawOpusToPcm(rawOpusFile, pcmFile, true, 's16le');
//
// // 使用默认输出文件名（会在原文件同目录下生成 .pcm 文件）
// convertRawOpusToPcm(rawOpusFile);
//
// // 使用不同的 PCM 格式（32-bit float）
// convertRawOpusToPcm(rawOpusFile, pcmFile, true, 'f32le');
