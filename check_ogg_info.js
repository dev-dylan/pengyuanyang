const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

/**
 * 使用 ffprobe 查看 OGG 文件信息
 * @param {string} oggFile - OGG 文件路径
 */
function checkOggInfoWithFFprobe(oggFile) {
    try {
        console.log(`使用 ffprobe 查看文件信息: ${oggFile}\n`);
        
        // 使用 ffprobe 获取详细信息（JSON 格式）
        const jsonOutput = execSync(`ffprobe -v quiet -print_format json -show_format -show_streams "${oggFile}" 2>&1`, {
            encoding: 'utf8'
        });
        
        const info = JSON.parse(jsonOutput);
        
        console.log("=== 文件格式信息 ===");
        if (info.format) {
            console.log(`格式名称: ${info.format.format_name || 'N/A'}`);
            console.log(`格式长名称: ${info.format.format_long_name || 'N/A'}`);
            console.log(`文件大小: ${info.format.size} 字节`);
            console.log(`比特率: ${info.format.bit_rate} bps`);
            console.log(`时长: ${parseFloat(info.format.duration).toFixed(2)} 秒`);
        }
        
        console.log("\n=== 音频流信息 ===");
        if (info.streams && info.streams.length > 0) {
            const stream = info.streams[0];
            console.log(`编码器: ${stream.codec_name || 'N/A'}`);
            console.log(`编码器长名称: ${stream.codec_long_name || 'N/A'}`);
            console.log(`采样率: ${stream.sample_rate} Hz`);
            console.log(`通道数: ${stream.channels}`);
            console.log(`通道布局: ${stream.channel_layout || 'N/A'}`);
            console.log(`比特率: ${stream.bit_rate || 'N/A'} bps`);
            console.log(`总采样数: ${stream.nb_frames || 'N/A'}`);
            if (stream.duration) {
                console.log(`流时长: ${parseFloat(stream.duration).toFixed(2)} 秒`);
            }
        }
        
        return true;
    } catch (error) {
        console.error(`ffprobe 查看失败: ${error.message}`);
        return false;
    }
}

/**
 * 手动解析 OGG 文件基本信息
 * @param {string} oggFile - OGG 文件路径
 */
function checkOggInfoManually(oggFile) {
    try {
        console.log(`手动解析 OGG 文件: ${oggFile}\n`);
        
        const fileBuffer = fs.readFileSync(oggFile);
        const fileSize = fileBuffer.length;
        
        console.log("=== 文件基本信息 ===");
        console.log(`文件大小: ${fileSize} 字节`);
        
        // 检查 OGG 签名
        const magic = fileBuffer.slice(0, 4).toString();
        if (magic !== 'OggS') {
            console.error("错误: 不是有效的 OGG 文件");
            return false;
        }
        console.log(`文件签名: ${magic} (有效)`);
        
        // 解析第一个页面（应该包含 OpusHead）
        let offset = 0;
        let pageCount = 0;
        let totalSamples = 0;
        
        while (offset < fileSize) {
            // 检查是否有足够的空间读取页面头
            if (offset + 27 > fileSize) {
                break;
            }
            
            const pageMagic = fileBuffer.slice(offset, offset + 4).toString();
            if (pageMagic !== 'OggS') {
                break;
            }
            
            pageCount++;
            
            // 读取页面头信息
            const headerType = fileBuffer[offset + 5];
            const granulePosLow = fileBuffer.readUInt32LE(offset + 6);
            const granulePosHigh = fileBuffer.readUInt32LE(offset + 10);
            const granulePos = granulePosLow + (granulePosHigh * 0x100000000);
            const pageSeq = fileBuffer.readUInt32LE(offset + 18);
            const segmentCount = fileBuffer[offset + 26];
            
            // 读取段表
            const segmentTableStart = offset + 27;
            let pageDataSize = 0;
            for (let i = 0; i < segmentCount; i++) {
                pageDataSize += fileBuffer[segmentTableStart + i];
            }
            
            const pageSize = 27 + segmentCount + pageDataSize;
            
            if (pageCount === 1) {
                console.log("\n=== 第一个页面 (OpusHead) ===");
                console.log(`页面序列号: ${pageSeq}`);
                console.log(`页面类型: ${headerType.toString(16)} (BOS=${(headerType & 0x02) !== 0})`);
                console.log(`Granule Position: ${granulePos}`);
                
                // 尝试读取 OpusHead
                const dataStart = segmentTableStart + segmentCount;
                const opusHeadData = fileBuffer.slice(dataStart, dataStart + Math.min(19, pageDataSize));
                if (opusHeadData.slice(0, 8).toString() === 'OpusHead') {
                    const version = opusHeadData[8];
                    const channels = opusHeadData[9];
                    const preSkip = opusHeadData.readUInt16LE(10);
                    const sampleRate = opusHeadData.readUInt32LE(12);
                    const outputGain = opusHeadData.readInt16LE(16);
                    const channelMapping = opusHeadData[18];
                    
                    console.log("\n=== OpusHead 信息 ===");
                    console.log(`版本: ${version}`);
                    console.log(`通道数: ${channels}`);
                    console.log(`预跳过样本数: ${preSkip}`);
                    console.log(`采样率: ${sampleRate} Hz`);
                    console.log(`输出增益: ${outputGain}`);
                    console.log(`通道映射: ${channelMapping}`);
                }
            } else if (pageCount === 2) {
                console.log("\n=== 第二个页面 (OpusTags) ===");
                console.log(`页面序列号: ${pageSeq}`);
            } else if (granulePos > 0) {
                // 最后一个有数据的页面
                totalSamples = granulePos;
            }
            
            offset += pageSize;
            
            // 限制解析的页面数量（避免解析整个大文件）
            if (pageCount > 10) {
                console.log(`\n... (已解析前 ${pageCount} 个页面，停止解析)`);
                break;
            }
        }
        
        console.log("\n=== 统计信息 ===");
        console.log(`总页面数: 至少 ${pageCount} 个`);
        if (totalSamples > 0) {
            // 假设采样率是 16000（需要从 OpusHead 读取）
            const estimatedSampleRate = 16000; // 可以从第一个页面读取
            const estimatedDuration = totalSamples / estimatedSampleRate;
            console.log(`总采样数: ${totalSamples}`);
            console.log(`估算时长: ${estimatedDuration.toFixed(2)} 秒 (假设采样率 ${estimatedSampleRate}Hz)`);
        }
        
        return true;
    } catch (error) {
        console.error(`手动解析失败: ${error.message}`);
        console.error(error.stack);
        return false;
    }
}

/**
 * 主函数
 */
function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log("使用方法:");
        console.log("  node check_ogg_info.js <ogg文件路径> [--manual]");
        console.log("\n示例:");
        console.log("  node check_ogg_info.js test_output1/output_111.opus");
        console.log("  node check_ogg_info.js test_output1/output_111.opus --manual");
        return;
    }
    
    const oggFile = args[0];
    const useManual = args.includes('--manual');
    
    if (!fs.existsSync(oggFile)) {
        console.error(`错误: 文件不存在: ${oggFile}`);
        return;
    }
    
    if (useManual) {
        checkOggInfoManually(oggFile);
    } else {
        // 优先使用 ffprobe
        if (!checkOggInfoWithFFprobe(oggFile)) {
            console.log("\nffprobe 失败，尝试手动解析...\n");
            checkOggInfoManually(oggFile);
        }
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    checkOggInfoWithFFprobe,
    checkOggInfoManually
};

