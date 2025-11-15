const fs = require("fs");
const path = require("path");
const os = require("os");

// 音频配置参数类
class AudioConfig {
    constructor(sampleRate = 16000, channels = 1, frameDurationMs = 20, compressedFrameSize = 40, headerSize = 8) {
        this.sampleRate = sampleRate;
        this.channels = channels;
        this.frameDurationMs = frameDurationMs;
        this.compressedFrameSize = compressedFrameSize;
        this.headerSize = headerSize;
    }
}

// Opus OGG 转换器类
class OpusOggConverter {
    constructor(config = null) {
        this.config = config || new AudioConfig();
        // Opus 内部采样率始终是 48kHz，用于计算 granule position
        this.opusSampleRate = 48000;
        // 输入采样率（用于 OpusHead）
        this.inputSampleRate = this.config.sampleRate;
        // 每帧的样本数（以 48kHz 为基准，用于 granule position）
        this.frameSize = Math.floor(this.opusSampleRate * this.config.frameDurationMs / 1000);
        this.streamSerial = 0x12345678; // 流序列号
    }

    /**
     * 读取自定义格式文件
     * @param {string} inputFile - 输入文件路径
     * @returns {Buffer[]} - 音频帧数组
     */
    readCustomFormat(inputFile) {
        const frames = [];
        const frameSizeTotal = this.config.headerSize + this.config.compressedFrameSize;

        try {
            const fileSize = fs.statSync(inputFile).size;
            if (fileSize === 0) {
                throw new Error("输入文件为空");
            }

            const totalFrames = Math.floor(fileSize / frameSizeTotal);
            const fileBuffer = fs.readFileSync(inputFile);

            for (let i = 0; i < totalFrames; i++) {
                const offset = i * frameSizeTotal;
                const frameData = fileBuffer.slice(offset, offset + frameSizeTotal);
                
                if (frameData.length < frameSizeTotal) {
                    break;
                }

                // 提取音频数据（跳过帧头）
                const audioData = frameData.slice(
                    this.config.headerSize,
                    this.config.headerSize + this.config.compressedFrameSize
                );
                
                if (audioData.length === this.config.compressedFrameSize) {
                    frames.push(audioData);
                }
            }

            console.log(`成功读取 ${frames.length} 帧音频数据`);
            
            // 将所有帧数据拼接并写入 temp.opus 文件
            if (frames.length > 0) {
                const rawOpusData = Buffer.concat(frames);
                // 将 temp.opus 保存到 test_output1 文件夹
                const outputDir = path.join(__dirname, "test_output1");
                if (!fs.existsSync(outputDir)) {
                    fs.mkdirSync(outputDir, { recursive: true });
                }
                const tempFile = path.join(outputDir, "temp.opus");
                fs.writeFileSync(tempFile, rawOpusData);
                console.log(`已将裸 opus 数据流写入: ${tempFile}`);
                console.log(`  数据大小: ${rawOpusData.length} 字节`);
            }
            
            return frames;

        } catch (error) {
            console.error(`读取文件失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 创建 OpusHead 包
     * @returns {Buffer} - OpusHead 数据包
     */
    createOpusHead() {
        const opusHead = Buffer.alloc(19);
        opusHead.write('OpusHead', 0); // 8字节标识
        opusHead[8] = 1; // 版本
        opusHead[9] = this.config.channels; // 通道数
        opusHead.writeUInt16LE(3840, 10); // 预跳过样本数 (little-endian)
        opusHead.writeUInt32LE(this.config.sampleRate, 12); // 输入采样率 (little-endian)
        opusHead.writeInt16LE(0, 16); // 输出增益 (little-endian)
        opusHead[18] = 0; // 通道映射
        return opusHead;
    }

    /**
     * 创建 OpusTags 包
     * @returns {Buffer} - OpusTags 数据包
     */
    createOpusTags() {
        const vendorString = Buffer.from('CustomOpusConverter', 'utf8');
        const vendorStringLength = vendorString.length;
        
        const opusTags = Buffer.alloc(8 + 4 + vendorStringLength + 4);
        opusTags.write('OpusTags', 0); // 8字节标识
        opusTags.writeUInt32LE(vendorStringLength, 8); // vendor string 长度
        vendorString.copy(opusTags, 12); // vendor string
        opusTags.writeUInt32LE(0, 12 + vendorStringLength); // 注释数量为0
        
        return opusTags;
    }

    

    /**
     * 计算 CRC32 校验和（符合 libogg 实现，基于 OGG 规范 RFC 3533）
     * libogg 使用正向 CRC（左移），多项式 0x04C11DB7，初始值为 0
     * 参考：https://github.com/xiph/ogg/blob/master/src/framing.c
     * @param {Buffer} data - 要计算的数据
     * @returns {number} - CRC32 值
     */
    calculateCrc(data) {
        // 生成正向 CRC32 查找表（一次性生成，缓存）
        // 使用多项式 0x04C11DB7（与 libogg 一致）
        if (!OpusOggConverter.crcTable) {
            OpusOggConverter.crcTable = [];
            for (let i = 0; i < 256; i++) {
                let crc = i << 24;
                for (let j = 0; j < 8; j++) {
                    if (crc & 0x80000000) {
                        crc = ((crc << 1) ^ 0x04C11DB7) >>> 0;
                    } else {
                        crc = (crc << 1) >>> 0;
                    }
                }
                OpusOggConverter.crcTable[i] = crc;
            }
        }
        const crcTable = OpusOggConverter.crcTable;
        
        // OGG 规范要求：初始值为 0（与 libogg 的 ogg_page_checksum_set 一致）
        let crc = 0;
        
        // libogg 风格的 CRC 更新：逐字节处理
        // 公式：crc = (crc << 8) ^ crcTable[((crc >>> 24) & 0xFF) ^ byte]
        for (let i = 0; i < data.length; i++) {
            crc = ((crc << 8) ^ crcTable[((crc >>> 24) & 0xFF) ^ data[i]]) >>> 0;
        }
        
        // 返回无符号 32 位整数
        return (crc >>> 0);
    }

    /**
     * 创建 Ogg 页面
     * @param {Buffer} packetData - 数据包
     * @param {number} headerType - 头部类型
     * @param {number} granulePos - 粒度位置
     * @param {number} pageSeq - 页序列号
     * @returns {Buffer} - Ogg 页面
     */
    createOggPage(packetData, headerType, granulePos, pageSeq) {
        // 分段处理数据包
        const segments = [];
        let pos = 0;
        while (pos < packetData.length) {
            const segSize = Math.min(255, packetData.length - pos);
            segments.push(segSize);
            pos += segSize;
        }

        const segmentTable = Buffer.from(segments);
        const segmentCount = segments.length;

        // 构建页头（参考 Python 版本实现）
        // header 包含：OggS(4) + version(1) + header_type(1) + granule_pos(8) + 
        //             stream_serial(4) + page_seq(4) + CRC(4) + segment_count(1) + segment_table(N)
        const header = Buffer.alloc(27 + segmentCount);
        header.write('OggS', 0); // 捕获模式
        header[4] = 0; // 版本
        header[5] = headerType; // 头部类型
        
        // 粒度位置 (8字节, little-endian)
        header.writeUInt32LE(granulePos & 0xFFFFFFFF, 6);
        header.writeUInt32LE(Math.floor(granulePos / 0x100000000), 10);
        
        header.writeUInt32LE(this.streamSerial, 14); // 位流序列号
        header.writeUInt32LE(pageSeq, 18); // 页序列号
        header.writeUInt32LE(0, 22); // CRC占位符
        header[26] = segmentCount; // 段数
        segmentTable.copy(header, 27); // 段表

        // 根据 OGG 规范 (RFC 3533)，CRC 应该计算整个页面（包括完整的 header 和数据）
        // 在计算时，CRC 字段（位置 22-25）必须设为 0
        // 构建完整页面用于 CRC 计算
        const fullPageForCrc = Buffer.concat([header, packetData]);
        // 确保 CRC 字段为 0（虽然已经设为 0，但为了安全再次设置）
        fullPageForCrc.writeUInt32LE(0, 22);
        
        // 计算整个页面的 CRC
        const crcValue = this.calculateCrc(fullPageForCrc);

        // 更新 header 中的 CRC 字段
        header.writeUInt32LE(crcValue, 22);

        // 构建完整页面
        return Buffer.concat([header, packetData]);
    }

    /**
     * 创建标准的 Ogg Opus 文件
     * @param {Buffer[]} opusFrames - Opus 帧数组
     * @param {string} outputFile - 输出文件路径
     * @returns {boolean} - 是否成功
     */
    createOggOpusFile(opusFrames, outputFile) {
        try {
            const pages = [];
            let pageSeq = 0;
            let granulePos = 0;

            // 1. BOS页 - OpusHead
            const opusHead = this.createOpusHead();
            const headPage = this.createOggPage(opusHead, 0x02, 0, pageSeq);
            pages.push(headPage);
            pageSeq += 1;

            // 2. 注释页 - OpusTags
            const opusTags = this.createOpusTags();
            const tagsPage = this.createOggPage(opusTags, 0x00, 0, pageSeq);
            pages.push(tagsPage);
            pageSeq += 1;

            // 3. 音频数据页
            for (let i = 0; i < opusFrames.length; i++) {
                const opusData = opusFrames[i];
                
                // 计算粒度位置（固定 20ms 每帧）
                granulePos = (i + 1) * this.frameSize;

                // 设置页面类型
                let headerType = 0x00; // 普通页
                if (i === opusFrames.length - 1) {
                    headerType = 0x04; // EOS页
                }

                const audioPage = this.createOggPage(opusData, headerType, granulePos, pageSeq);
                pages.push(audioPage);
                pageSeq += 1;
            }

            // 写入所有页面
            const outputBuffer = Buffer.concat(pages);
            fs.writeFileSync(outputFile, outputBuffer);

            console.log("成功生成Ogg Opus文件");
            return true;

        } catch (error) {
            console.error(`创建Ogg文件失败: ${error.message}`);
            console.error(error.stack);
            return false;
        }
    }

    /**
     * 主转换函数
     * @param {string} inputFile - 输入文件路径
     * @param {string} outputFile - 输出文件路径
     * @returns {boolean} - 是否成功
     */
    convertToOggOpus(inputFile, outputFile) {
        console.log(`开始转换: ${inputFile} -> ${outputFile}`);

        if (!fs.existsSync(inputFile)) {
            console.error("错误: 输入文件不存在");
            return false;
        }

        try {
            // 读取音频数据
            const opusFrames = this.readCustomFormat(inputFile);
            if (!opusFrames || opusFrames.length === 0) {
                console.error("错误: 没有读取到音频数据");
                return false;
            }

            // 计算时长（固定 20ms 每帧）
            const duration = opusFrames.length * this.config.frameDurationMs / 1000;
            console.log("音频信息:");
            console.log(`  - 总帧数: ${opusFrames.length}`);
            console.log(`  - 估算时长: ${duration.toFixed(2)} 秒`);

            // 创建Ogg Opus文件
            const success = this.createOggOpusFile(opusFrames, outputFile);

            if (success) {
                const fileSize = fs.statSync(outputFile).size;
                console.log("✓ 转换成功!");
                console.log(`  输出文件: ${outputFile}`);
                console.log(`  文件大小: ${fileSize} 字节`);
                console.log(`  音频时长: ${duration.toFixed(2)} 秒`);

                // 验证文件
                if (this.verifyOggFile(outputFile)) {
                    console.log("✓ 文件验证通过");
                } else {
                    console.log("⚠ 文件验证失败");
                }
            }

            return success;

        } catch (error) {
            console.error(`转换过程出错: ${error.message}`);
            console.error(error.stack);
            return false;
        }
    }

    /**
     * 验证 Ogg 文件基本结构
     * @param {string} filePath - 文件路径
     * @returns {boolean} - 是否验证通过
     */
    verifyOggFile(filePath) {
        try {
            if (!fs.existsSync(filePath)) {
                return false;
            }

            const fileSize = fs.statSync(filePath).size;
            if (fileSize < 100) { // 文件太小
                return false;
            }

            const fileBuffer = fs.readFileSync(filePath);
            
            // 检查文件签名
            const magic = fileBuffer.slice(0, 4);
            if (magic.toString() !== 'OggS') {
                return false;
            }

            // 检查文件结尾是否有Ogg签名
            const endData = fileBuffer.slice(-100);
            if (endData.toString().indexOf('OggS') === -1) {
                return false;
            }

            return true;

        } catch (error) {
            return false;
        }
    }
}

/**
 * 生成测试输入文件
 * @param {string} outputFile - 输出文件路径
 * @param {number} durationSeconds - 时长（秒）
 * @returns {boolean} - 是否成功
 */
function generateTestInput(outputFile, durationSeconds = 3) {
    try {
        const framesPerSecond = 50;
        const totalFrames = durationSeconds * framesPerSecond;
        const headerSize = 8;
        const opusDataSize = 40;
        const frameSize = headerSize + opusDataSize;

        const buffers = [];

        for (let i = 0; i < totalFrames; i++) {
            // 8字节帧头
            const header = Buffer.alloc(8);
            header.writeUInt32LE(0x28, 0); // 长度字段
            header.writeUInt32LE(i, 4); // 帧序号

            // 40字节模拟Opus数据
            const opusData = Buffer.alloc(opusDataSize);
            for (let j = 0; j < opusDataSize; j++) {
                opusData[j] = (i * 17 + j * 13 + 73) % 256;
            }

            buffers.push(header);
            buffers.push(opusData);
        }

        const outputBuffer = Buffer.concat(buffers);
        fs.writeFileSync(outputFile, outputBuffer);

        const fileSize = fs.statSync(outputFile).size;
        console.log(`生成测试文件: ${outputFile}`);
        console.log(`- 时长: ${durationSeconds}秒`);
        console.log(`- 总帧数: ${totalFrames}`);
        console.log(`- 文件大小: ${fileSize} 字节`);
        return true;

    } catch (error) {
        console.error(`生成测试文件失败: ${error.message}`);
        return false;
    }
}

/**
 * 主函数
 */
function main() {
    const converter = new OpusOggConverter();

    // 创建输出文件夹
    const outputDir = path.join(__dirname, "test_output1");
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`已创建输出文件夹: ${outputDir}`);
    }

    // 文件路径
    const testInput = path.join(__dirname, "1.opus");
    const testOutput = path.join(outputDir, "output_111.opus");

    // 生成测试文件（如果需要，也保存到输出文件夹）
    if (!fs.existsSync(testInput)) {
        console.log("生成测试输入文件...");
        const testInputInOutput = path.join(outputDir, "test_input.dat");
        if (!generateTestInput(testInputInOutput, 2)) {
            return;
        }
        // 如果生成了测试文件，使用输出文件夹中的文件
        if (fs.existsSync(testInputInOutput)) {
            console.log(`注意: 测试输入文件已生成在: ${testInputInOutput}`);
        }
    }

    // 检查输入文件
    if (!fs.existsSync(testInput)) {
        console.error(`错误: 输入文件不存在: ${testInput}`);
        return;
    }

    const fileSize = fs.statSync(testInput).size;
    console.log(`输入文件: ${testInput}`);
    console.log(`文件大小: ${fileSize} 字节`);
    console.log(`输出文件夹: ${outputDir}`);

    // 执行转换
    console.log("\n开始转换处理...");
    const success = converter.convertToOggOpus(testInput, testOutput);

    if (success) {
        console.log(`\n转换完成!`);
        console.log(`输出文件: ${testOutput}`);

        if (fs.existsSync(testOutput)) {
            const finalSize = fs.statSync(testOutput).size;
            console.log(`文件已生成，大小: ${finalSize} 字节`);
            console.log("可以使用VLC、ffplay或其他支持Ogg Opus的播放器打开");
        }
    } else {
        console.log("\n转换失败!");
    }
}

// 如果直接运行此文件，执行主函数
if (require.main === module) {
    main();
}

// 导出类和函数供其他模块使用
module.exports = {
    AudioConfig,
    OpusOggConverter,
    generateTestInput
};

