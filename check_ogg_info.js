const fs = require("fs");
const path = require("path");
const { execSync, exec } = require("child_process");

/**
 * 检查 ffprobe 是否可用
 * @returns {Promise<boolean>} 是否可用
 */
function checkFFprobeAvailable() {
    return new Promise((resolve) => {
        exec('ffprobe -version', (error) => {
            if (error) {
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}

/**
 * 同步检查 ffprobe 是否可用
 * @returns {boolean} 是否可用
 */
function checkFFprobeAvailableSync() {
    try {
        execSync('ffprobe -version', { stdio: 'ignore' });
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 使用 ffprobe 查看 OGG 文件信息（统一使用 ffmpeg 工具）
 * @param {string} oggFile - OGG 文件路径
 * @returns {Promise<boolean>} 是否成功
 */
async function checkOggInfoWithFFprobe(oggFile) {
    try {
        console.log(`使用 ffprobe 查看文件信息: ${oggFile}\n`);
        
        // 1. 检查文件是否存在
        if (!fs.existsSync(oggFile)) {
            throw new Error(`文件不存在: ${oggFile}`);
        }
        
        // 2. 检查文件是否可读
        try {
            fs.accessSync(oggFile, fs.constants.R_OK);
        } catch (accessError) {
            throw new Error(`文件不可读: ${oggFile} - ${accessError.message}`);
        }
        
        // 3. 检查文件大小
        const stats = fs.statSync(oggFile);
        if (stats.size === 0) {
            throw new Error(`文件为空: ${oggFile}`);
        }
        console.log(`文件大小: ${stats.size} 字节\n`);
        
        // 4. 检查 ffprobe 是否可用
        if (!checkFFprobeAvailableSync()) {
            throw new Error(
                'ffprobe 未安装或不在 PATH 中。\n' +
                '请安装 ffmpeg:\n' +
                '  - macOS: brew install ffmpeg\n' +
                '  - Ubuntu/Debian: sudo apt-get install ffmpeg\n' +
                '  - Windows: 从 https://ffmpeg.org/download.html 下载并添加到 PATH'
            );
        }
        
        // 5. 执行 ffprobe 命令，捕获详细错误信息
        let jsonOutput;
        let stderrOutput;
        
        try {
            // 先尝试获取 JSON 输出
            jsonOutput = execSync(
                `ffprobe -v error -print_format json -show_format -show_streams "${oggFile}"`,
                {
                    encoding: 'utf8',
                    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
                    stdio: ['ignore', 'pipe', 'pipe']
                }
            );
        } catch (execError) {
            // 如果失败，尝试获取详细错误信息
            try {
                stderrOutput = execSync(
                    `ffprobe -v error -print_format json -show_format -show_streams "${oggFile}" 2>&1`,
                    {
                        encoding: 'utf8',
                        maxBuffer: 10 * 1024 * 1024
                    }
                );
                
                // 检查是否是 JSON 输出（成功）还是错误信息
                if (stderrOutput.trim().startsWith('{')) {
                    jsonOutput = stderrOutput;
                } else {
                    // 获取更详细的错误信息
                    const detailedError = execSync(
                        `ffprobe -v warning -print_format json -show_format -show_streams "${oggFile}" 2>&1`,
                        {
                            encoding: 'utf8',
                            maxBuffer: 10 * 1024 * 1024
                        }
                    );
                    throw new Error(
                        `ffprobe 执行失败:\n` +
                        `命令: ffprobe -v error -print_format json -show_format -show_streams "${oggFile}"\n` +
                        `错误输出: ${detailedError}\n` +
                        `原始错误: ${execError.message}\n` +
                        `错误代码: ${execError.status || execError.code || 'N/A'}`
                    );
                }
            } catch (secondError) {
                throw new Error(
                    `ffprobe 执行失败:\n` +
                    `命令: ffprobe -v error -print_format json -show_format -show_streams "${oggFile}"\n` +
                    `错误输出: ${secondError.message}\n` +
                    `原始错误: ${execError.message}\n` +
                    `错误代码: ${execError.status || execError.code || 'N/A'}\n` +
                    `堆栈: ${execError.stack || 'N/A'}`
                );
            }
        }
        
        // 6. 解析 JSON 输出
        let info;
        try {
            info = JSON.parse(jsonOutput);
        } catch (parseError) {
            throw new Error(
                `JSON 解析失败:\n` +
                `错误: ${parseError.message}\n` +
                `输出内容 (前500字符): ${jsonOutput.substring(0, 500)}\n` +
                `可能原因: ffprobe 输出格式异常或文件格式不支持`
            );
        }
        
        // 7. 验证解析结果
        if (!info) {
            throw new Error('ffprobe 返回空结果');
        }
        
        // 8. 显示文件格式信息
        console.log("=== 文件格式信息 ===");
        if (info.format) {
            console.log(`格式名称: ${info.format.format_name || 'N/A'}`);
            console.log(`格式长名称: ${info.format.format_long_name || 'N/A'}`);
            console.log(`文件大小: ${info.format.size || stats.size} 字节`);
            if (info.format.bit_rate) {
                console.log(`比特率: ${info.format.bit_rate} bps (${(parseInt(info.format.bit_rate) / 1000).toFixed(2)} kbps)`);
            } else {
                console.log(`比特率: N/A`);
            }
            if (info.format.duration) {
                const duration = parseFloat(info.format.duration);
                console.log(`时长: ${duration.toFixed(2)} 秒 (${(duration / 60).toFixed(2)} 分钟)`);
            } else {
                console.log(`时长: N/A`);
            }
        } else {
            console.warn("警告: 未找到格式信息");
        }
        
        // 9. 显示音频流信息
        console.log("\n=== 音频流信息 ===");
        if (info.streams && info.streams.length > 0) {
            const audioStreams = info.streams.filter(s => s.codec_type === 'audio');
            
            if (audioStreams.length === 0) {
                console.warn("警告: 未找到音频流");
                console.log(`找到的流类型: ${info.streams.map(s => s.codec_type).join(', ')}`);
            } else {
                audioStreams.forEach((stream, index) => {
                    if (audioStreams.length > 1) {
                        console.log(`\n--- 音频流 #${index + 1} ---`);
                    }
                    console.log(`编码器: ${stream.codec_name || 'N/A'}`);
                    console.log(`编码器长名称: ${stream.codec_long_name || 'N/A'}`);
                    if (stream.sample_rate) {
                        console.log(`采样率: ${stream.sample_rate} Hz`);
                    } else {
                        console.log(`采样率: N/A`);
                    }
                    if (stream.channels) {
                        console.log(`通道数: ${stream.channels}`);
                    } else {
                        console.log(`通道数: N/A`);
                    }
                    console.log(`通道布局: ${stream.channel_layout || 'N/A'}`);
                    if (stream.bit_rate) {
                        console.log(`比特率: ${stream.bit_rate} bps (${(parseInt(stream.bit_rate) / 1000).toFixed(2)} kbps)`);
                    } else {
                        console.log(`比特率: N/A`);
                    }
                    console.log(`总采样数: ${stream.nb_frames || 'N/A'}`);
                    if (stream.duration) {
                        const duration = parseFloat(stream.duration);
                        console.log(`流时长: ${duration.toFixed(2)} 秒`);
                    }
                    if (stream.tags) {
                        console.log(`标签数量: ${Object.keys(stream.tags).length}`);
                    }
                });
            }
        } else {
            console.warn("警告: 未找到流信息");
        }
        
        // 10. 显示标签信息（如果有）
        if (info.format && info.format.tags) {
            const tags = info.format.tags;
            if (Object.keys(tags).length > 0) {
                console.log("\n=== 文件标签信息 ===");
                Object.entries(tags).forEach(([key, value]) => {
                    console.log(`${key}: ${value}`);
                });
            }
        }
        
        console.log("\n✓ 检查完成");
        return true;
        
    } catch (error) {
        console.error("\n❌ ffprobe 检查失败");
        console.error("=".repeat(50));
        console.error(`错误类型: ${error.constructor.name}`);
        console.error(`错误消息: ${error.message}`);
        
        if (error.stack) {
            console.error("\n详细堆栈信息:");
            console.error(error.stack);
        }
        
        // 提供故障排除建议
        console.error("\n故障排除建议:");
        console.error("1. 确认文件路径正确且文件存在");
        console.error("2. 确认文件格式为有效的 OGG/Opus 文件");
        console.error("3. 确认已安装 ffmpeg (包含 ffprobe)");
        console.error("4. 尝试运行: ffprobe -version");
        console.error("5. 尝试运行: ffprobe \"" + oggFile + "\"");
        
        return false;
    }
}

/**
 * 主函数
 */
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log("使用方法:");
        console.log("  node check_ogg_info.js <ogg文件路径>");
        console.log("\n示例:");
        console.log("  node check_ogg_info.js test_output1/output_111.opus");
        console.log("\n注意: 此工具统一使用 ffprobe (ffmpeg 套件) 检查文件信息");
        return;
    }
    
    const oggFile = args[0];
    
    // 统一使用 ffprobe 检查
    try {
        const success = await checkOggInfoWithFFprobe(oggFile);
        if (!success) {
            process.exit(1);
        }
    } catch (error) {
        console.error("\n未捕获的错误:");
        console.error(error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    checkOggInfoWithFFprobe,
    checkFFprobeAvailable
};

