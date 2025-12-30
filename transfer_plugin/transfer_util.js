/**
 * Node.js 版本的 UnrealtimeTransferGemini 实现
 * 对应 Flutter 中的 lib/util/audio_recognition/unrealtime_transfer_gemini.dart
 */

const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// 尝试加载 music-metadata 库（用于读取音频文件时长）
let musicMetadata = null;
try {
  musicMetadata = require('music-metadata');
} catch (e) {
  console.warn('music-metadata 库未安装，无法自动读取音频时长。请运行: npm install music-metadata');
}

// 配置信息（需要从环境变量或配置文件读取）
const CONFIG = {
  DEFAULT_LANG: 'ja',
  BASE_URL: 'http://8.219.153.155',
  APP_KEY_ID: 'xb_app',
  APP_KEY_SECRET:'7wj1SrLTO3WRcezh5qZKxxrn6qXHVol1',
  ACCESS_TOKEN: '00062638c3434c54a79cebc7efdf5161',
  X_BIZ_ID: '92f58d23db9643afb4318ccb1e619264',
  USER_ID: '92f58d23db9643afb4318ccb1e619264',
  ENABLE_AUDIOS: ['.mp3', '.pcm'],
};

const API_ENDPOINTS = {
  CREATE_TRANSCRIPTION: `${CONFIG.BASE_URL}/api/watch-core/v1/transfer-write/createTranscriptionGemini`,
  QUERY_TASK: `${CONFIG.BASE_URL}/api/watch-core/v1/transfer-write/queryTranscriptionTask`,
  GET_POLICY: `${CONFIG.BASE_URL}/api/watch-core/v1/oss/getpolicy`, // OSS 上传策略接口
}

/**
 * 签名工具类
 * 对应 Flutter 中的 lib/common/net/token_interceptor.dart
 */
class SignatureUtil {
  /**
   * 生成请求签名
   * @param {string} method - HTTP 方法
   * @param {string} url - 请求 URL
   * @param {object} data - 请求数据
   * @param {string} contentType - Content-Type
   * @returns {object} 包含所有需要添加的请求头
   */
  static generateSignature(method, url, data = null, contentType = 'application/json') {
    const appKeyId = CONFIG.APP_KEY_ID;
    const appKeySecret = CONFIG.APP_KEY_SECRET;
    // 1. 对 data 进行排序（如果是对象）
    let sortedData = data;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const keys = Object.keys(data).sort();
      sortedData = {};
      keys.forEach(key => {
        sortedData[key] = data[key];
      });
    }

    // 2. 计算 Content-MD5
    let md5String = '';
    if (data !== null && data !== undefined) {
      if (typeof data === 'string') {
        md5String = data;
      } else if (contentType === 'application/x-www-form-urlencoded' && typeof data === 'object') {
        // 特殊处理 form-urlencoded
        md5String = Object.entries(data)
          .map(([key, value]) => {
            if (Array.isArray(value)) {
              return value.map(item => `${key}=${item}`).join('&');
            }
            return `${key}=${value}`;
          })
          .join('&');
      } else {
        md5String = JSON.stringify(sortedData);
      }
    }

    const contentMD5 = md5String
      ? crypto.createHash('md5').update(md5String, 'utf8').digest('base64')
      : '';

    // 3. 生成 GMT 时间
    const date = new Date().toUTCString();

    // 4. 生成 Nonce (UUID)
    // Flutter 使用: UuidV8().generate() - 生成标准 UUID 格式（带连字符）
    // Node.js 推荐方式: 使用内置 crypto.randomUUID() (UUID v4, Node.js 15.6.0+)
    let nonce;
    if (crypto.randomUUID) {
      // Node.js 15.6.0+ 内置方法（推荐）
      nonce = crypto.randomUUID();
    } else {
      // 兼容旧版本：手动生成 UUID v4 格式
      nonce = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    // 5. 解析 URL
    // Flutter: Uri uri = Uri.parse(options.path);
    // 注意：Flutter 中的 options.path 是相对路径，需要与 BASE_URL 拼接
    // 但在 Node.js 中，我们传入的是完整 URL，所以需要解析
    const urlObj = new URL(url);

    // console.log('urlObj', urlObj);

    const escapedPath = urlObj.pathname;

    // Flutter: String escapedQuery = uri.hasQuery ? uri.query : '';
    // 注意：Flutter 的 uri.query 不包含 '?'，所以这里也不包含
    const escapedQuery = urlObj.search ? urlObj.search.substring(1) : '';

    // 6. 构建签名字符串（与 Flutter 版本完全一致）
    // Flutter: String signatureString = '${[method, escapedPath, escapedQuery, contentMD5, contentType, date, nonce].join('\n')}\n\n';
    const signatureString = [
      method.toUpperCase(),
      escapedPath,
      escapedQuery,
      contentMD5,
      contentType,
      date,
      nonce,
    ].join('\n') + '\n\n';

    // 7. 使用 HMAC-SHA1 计算签名
    const hmac = crypto.createHmac('sha1', appKeySecret);
    hmac.update(signatureString, 'utf8');
    const signature = hmac.digest('base64');

    // 8. 构建 Authorization（与 Flutter 版本完全一致）
    // Flutter: String authorization = 'Authorization: PROJECTION $appKeyId:$signature';
    // 注意：Flutter 代码中虽然字符串包含 'Authorization: '，但实际设置 headers 时：
    // options.headers['Authorization'] = authorization; 
    // 所以 value 应该是 'PROJECTION appKeyId:signature'（不包含 'Authorization: ' 前缀）
    const authorization = `PROJECTION ${appKeyId}:${signature}`;

    // 9. 返回请求头
    return {
      'Content-MD5': contentMD5,
      'x-date': date,
      'Nonce': nonce,
      'X-Auth-App-Id': appKeyId,
      'Authorization': authorization,
      'Access_Token': CONFIG.ACCESS_TOKEN || '',
      'X-Biz-Id': CONFIG.X_BIZ_ID || '',
      'Content-Type': contentType,
    };
  }
}

/**
 * HTTP 请求工具类
 * 对应 Flutter 中的 lib/common/net/http_manager.dart
 */
class HttpManager {
  /**
   * POST 请求
   * @param {string} url - 请求 URL
   * @param {object} params - 请求参数
   * @returns {Promise<object>} 响应数据
   */
  static async post(url, params, contentType = 'application/json') {
    params['lang'] = CONFIG.DEFAULT_LANG;
    const headers = SignatureUtil.generateSignature('POST', url, params, contentType);
    
    // 1. 对 data 进行排序（如果是对象）
    let sortedData = params;
    
    if (params && typeof params === 'object' && !Array.isArray(params)) {
      const keys = Object.keys(params).sort();
      sortedData = {};
      keys.forEach(key => {
        sortedData[key] = params[key];
      });
    }

    let finalParams = params;
    
    if (contentType == 'application/json') {
      finalParams = sortedData;
    }
    try {
      const response = await axios.post(url, finalParams, {
        headers,
        timeout: 10000,
      });

      if (response.data && (response.data.code !== 2000 && response.data.code !== 200)) {
        throw new Error(`API Error: code ${response.data.code}, ${response.data.message || 'Unknown error'}`);
      }

      return {
        code: response.data?.code || 200,
        message: response.data?.message || '',
        data: response.data?.data || response.data,
      };
    } catch (error) {
      if (error.response) {
        throw new Error(`HTTP ${error.response.status}: ${error.response.statusText}`);
      }
      throw error;
    }
  }
}

/**
 * OSS 上传工具类
 * 对应 Flutter 中的 lib/util/file_upload.dart
 */
class OssUploader {
  /**
   * 获取 OSS 上传策略
   * @param {string} objectName - 对象名称
   * @returns {Promise<object>} OSS 配置信息
   */
  static async getPolicy(objectName) {
    const url = API_ENDPOINTS.GET_POLICY;
    const params = {
      dir: CONFIG.USER_ID,
      objectName: objectName,
    };

    const response = await HttpManager.post(url, params, 'application/x-www-form-urlencoded');
    
    if (response.code !== 200) {
      throw new Error(`获取 OSS 策略失败: ${response.message}`);
    }

    return response.data;
  }

  /**
   * 上传文件到 OSS
   * @param {string} filePath - 本地文件路径
   * @returns {Promise<object>} OSS 上传结果
   */
  static async upload2Oss(filePath) {
    const objectName = path.basename(filePath);
    
    // 1. 获取 OSS 策略
    const ossConfig = await this.getPolicy(objectName);
    
    // 2. 构建 FormData
    const formData = new FormData();
    formData.append('OSSAccessKeyId', ossConfig.ossAccessKeyId);
    formData.append('key', `${ossConfig.dir}/${objectName}`);
    formData.append('policy', ossConfig.policy);
    formData.append('success_action_status', ossConfig.success_action_status || '200');
    formData.append('signature', ossConfig.signature);
    formData.append('file', fs.createReadStream(filePath));

    // 3. 上传文件
    try {
      const response = await axios.post(ossConfig.host, formData, {
        headers: formData.getHeaders(),
        timeout: 60000,
      });

      if (response.status === 200) {
        return {
          status: true,
          bucketName: ossConfig.bucketName,
          dir: ossConfig.dir,
          objectName: objectName,
        };
      } else {
        throw new Error(`OSS 上传失败: HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('OSS 上传失败:', error);
      return {
        status: false,
      };
    }
  }
}

/**
 * UnrealtimeTransferGemini 类
 * 对应 Flutter 中的 lib/util/audio_recognition/unrealtime_transfer_gemini.dart
 */
class UnrealtimeTransferGemini {
  constructor(options = {}) {
    this.duration = options.duration || 0;
    this.ossFilePath = options.ossFilePath;
    this.ossUrl = undefined;
    this.lang = CONFIG.DEFAULT_LANG;
  }

  /**
   * 开始转写流程
   * @returns {Promise<object>} 转写结果文档
   */
  async start() {
    // 1. 上传文件到 OSS
    const taskId = await this._upload();
    
    // 2. 轮询查询转写结果
    const segments = await this._queryTask(taskId);
    
    // 3. 构建 TranscriptDoc
    const transcriptDoc = {
      sessionId: taskId,
      lang: this.lang,
      sampleRate: '16000',
      createdAt: new Date().toISOString(),
      speakers: [],
      meta: {
        channel: '',
        codec: '',
      },
      segments: segments,
      count: 0,
    };

    // 4. 提取说话人列表并计算文字数量
    const speakerMap = new Map();
    let count = 0;
    
    segments.forEach((segment, index) => {
      segment.id = (index + 1).toString();
      segment.words = segment.words || [];
      
      if (!speakerMap.has(segment.speakerId)) {
        speakerMap.set(segment.speakerId, {
          id: segment.speakerId,
          name: '',
        });
      }
      count += segment.text.length;
    });

    transcriptDoc.speakers = Array.from(speakerMap.values());
    transcriptDoc.count = count;

    return transcriptDoc;
  }

  /**
   * 上传文件并创建转写任务
   * @returns {Promise<string>} 任务 ID
   */
  async _upload() {
    let ossResult;

    // 如果已有 OSS URL，直接使用
    if (this.ossUrl) {
      try {
        ossResult = JSON.parse(this.ossUrl);
        console.log('使用已有 OSS URL:', this.ossUrl);
      } catch (e) {
        throw new Error('OSS URL 格式错误');
      }
    } else {
      // 上传文件到 OSS
      if (!this.ossFilePath) {
        throw new Error('ossFilePath 或 ossUrl 必须提供其一');
      }

      console.log('开始上传文件到 OSS，路径：', this.ossFilePath);
      ossResult = await OssUploader.upload2Oss(this.ossFilePath);
      
      if (!ossResult.status) {
        throw new Error('OSS 上传失败');
      }
      
      console.log('完成上传文件到 OSS');
    }

    // 创建转写任务
    console.log('开始创建转写任务:', JSON.stringify(ossResult));
    
    const url = API_ENDPOINTS.CREATE_TRANSCRIPTION;
    const params = {
      ossObjectName: `${ossResult.dir}/${ossResult.objectName}`,
      bucketName: ossResult.bucketName,
      language: this.lang,
    };

    const response = await HttpManager.post(url, params);
    const taskId = response.data.taskId;

    if (!taskId) {
      throw new Error('创建转写任务失败: 未返回 taskId');
    }

    console.log('创建转写任务成功: taskId:', taskId);
    return taskId;
  }

  /**
   * 轮询查询转写任务状态
   * @param {string} taskId - 任务 ID
   * @returns {Promise<Array>} 转写结果片段列表
   */
  async _queryTask(taskId) {
    return new Promise((resolve, reject) => {
      let errorCount = 0;
      const maxErrors = 5;

      const timer = setInterval(async () => {
        try {
          const url = API_ENDPOINTS.QUERY_TASK;
          const params = {
            taskId: taskId,
          };

          const response = await HttpManager.post(url, params);
          const status = (response.data.status || '').toLowerCase();

          if (status === 'completed') {
            console.log('转写完成:', this.ossFilePath);
            clearInterval(timer);

            let resultList = [];
            if (typeof response.data.result === 'string') {
              resultList = JSON.parse(response.data.result);
            } else if (Array.isArray(response.data.result)) {
              resultList = response.data.result;
            }

            if (!Array.isArray(resultList) || resultList.length === 0) {
              reject(new Error('转写结果为空'));
              return;
            }

            // 处理结果，添加 id 和 words 字段
            const segments = resultList.map((seg, index) => {
              return {
                ...seg,
                id: (index + 1).toString(),
                words: seg.words || [],
              };
            });

            resolve(segments);
          } else if (status === 'failed') {
            console.log('转写失败:', JSON.stringify(response.data));
            clearInterval(timer);
            reject(new Error(`转写失败: ${response.data.errorMessage || '未知错误'}`));
          } else {
            console.log('转写中:', this.ossFilePath);
          }
        } catch (error) {
          console.error('查询转写结果异常:', error);
          errorCount++;
          
          if (errorCount >= maxErrors) {
            clearInterval(timer);
            reject(new Error(`查询转写结果失败: ${error.message}`));
          }
        }
      }, 3000); // 每 3 秒查询一次
    });
  }
}

/**
 * 从转写结果中提取文本内容
 * @param {object} transcriptDoc - 转写结果文档对象
 * @returns {string} 提取的文本内容
 */
function extractTextFromTranscriptDoc(transcriptDoc) {
  if (!transcriptDoc.segments || !Array.isArray(transcriptDoc.segments)) {
    return '';
  }

  const texts = [];
  transcriptDoc.segments.forEach((segment) => {
    if (segment.text) {
      texts.push(segment.text);
      // 如果 isParagraphBreak 为 true，添加换行符
      if (segment.isParagraphBreak) {
        texts.push('\n');
      }
    }
  });

  return texts.join('');
}

/**
 * 读取音频文件时长（秒）
 * @param {string} filePath - 音频文件路径
 * @returns {Promise<number>} 音频时长（秒），如果读取失败返回 0
 */
async function getAudioDuration(filePath) {
  if (!musicMetadata) {
    console.warn('music-metadata 库未安装，无法读取音频时长');
    return 0;
  }

  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    const metadata = await musicMetadata.parseFile(filePath);
    const duration = metadata.format.duration;
    
    if (duration && duration > 0) {
      const durationInSeconds = Math.round(duration);
      console.log(`音频文件时长: ${durationInSeconds} 秒 (${Math.floor(durationInSeconds / 60)}分${durationInSeconds % 60}秒)`);
      return durationInSeconds;
    } else {
      console.warn('无法从音频文件中读取时长信息');
      return 0;
    }
  } catch (error) {
    console.error('读取音频时长失败:', error.message);
    return 0;
  }
}

/**
 * 从 JSON 文件中提取 segments 的 text 并生成 .txt 文件
 * @param {string} jsonFilePath - JSON 文件路径
 * @returns {string} 生成的 .txt 文件路径
 */
function extractTextFromJson(jsonFilePath) {
  try {
    // 读取 JSON 文件
    const jsonContent = fs.readFileSync(jsonFilePath, 'utf8');
    const data = JSON.parse(jsonContent);

    // 检查是否有 segments
    if (!data.segments || !Array.isArray(data.segments)) {
      throw new Error('JSON 文件中没有找到 segments 数组');
    }

    // 提取文本
    const fullText = extractTextFromTranscriptDoc(data);

    // 生成同名的 .txt 文件路径
    const dir = path.dirname(jsonFilePath);
    const basename = path.basename(jsonFilePath, path.extname(jsonFilePath));
    const txtFilePath = path.join(dir, `${basename}.txt`);

    // 写入 .txt 文件
    fs.writeFileSync(txtFilePath, fullText, 'utf8');

    console.log(`成功生成文件: ${txtFilePath}`);
    console.log(`文本长度: ${fullText.length} 字符`);
    console.log(`片段数量: ${data.segments.length}`);

    return txtFilePath;
  } catch (error) {
    console.error('处理失败:', error.message);
    throw error;
  }
}

/**
 * 处理单个音频文件的转写
 * @param {string} filePath - 音频文件路径
 * @returns {Promise<object>} 转写结果对象
 */
async function processSingleAudioFile(filePath) {
  try {
    console.log(`\n开始处理文件: ${filePath}`);
    
    // 自动读取音频文件时长
    console.log('正在读取音频文件时长...');
    let duration = await getAudioDuration(filePath);
    
    // 如果读取失败（返回 0），使用默认值
    if (!duration || duration === 0) {
      console.warn(`无法读取音频时长，文件路径： ${filePath}`);
      duration = 305;
    }
    
    const args = {
      duration: duration,
      ossFilePath: filePath,
    };

    const result = await unrealtimeTransferEntry(args);
    const transcriptDoc = JSON.parse(result);
    
    console.log('转写成功！');
    console.log('任务 ID:', transcriptDoc.sessionId);
    console.log('片段数量:', transcriptDoc.segments.length);
    console.log('文字总数:', transcriptDoc.count);
    console.log('说话人数量:', transcriptDoc.speakers.length);
    
    return {
      success: true,
      filePath: filePath,
      transcriptDoc: transcriptDoc,
    };
  } catch (error) {
    console.error(`文件转写失败: ${filePath}`, error.message);
    return {
      success: false,
      filePath: filePath,
      error: error.message,
    };
  }
}

/**
 * 主入口函数
 * 对应 Flutter 中的 _unrealtimeTransferEntry 函数
 * @param {object} args - 参数对象
 * @returns {Promise<string>} JSON 字符串格式的转写结果
 */
async function unrealtimeTransferEntry(args) {
  const {
    duration,
    ossFilePath,
  } = args;

  try {
    // 创建转写实例
    const transfer = new UnrealtimeTransferGemini({
      duration: duration,
      ossFilePath: ossFilePath,
    });

    // 开始转写
    const transcriptDoc = await transfer.start();

    console.log('转写完成，原地址：', ossFilePath);

    // 保存结果到文件，使用和 ossFilePath 相同路径，但改为 json 后缀
    if (ossFilePath) {
      const jsonFilePath = ossFilePath.replace(/\.[^/.]+$/, '') + '.json';
      fs.writeFileSync(jsonFilePath, JSON.stringify(transcriptDoc, null, 2), 'utf8');
      console.log('转写结果已保存到:', jsonFilePath);

      // 提取 segments 的 text 并生成 .txt 文件
      if (transcriptDoc.segments && Array.isArray(transcriptDoc.segments)) {
        const fullText = extractTextFromTranscriptDoc(transcriptDoc);

        // 生成同名的 .txt 文件路径
        const txtFilePath = ossFilePath.replace(/\.[^/.]+$/, '') + '.txt';
        fs.writeFileSync(txtFilePath, fullText, 'utf8');
        console.log('文本文件已保存到:', txtFilePath);
        console.log(`文本长度: ${fullText.length} 字符`);
      }
    }

    // 返回 JSON 字符串
    return JSON.stringify(transcriptDoc);
  } catch (error) {
    console.error('转写失败，原地址：', ossFilePath, error);
    throw error;
  }
}


/**
 * 深度遍历文件夹，查找所有 MP3 文件
 * @param {string} dirPath - 文件夹路径
 * @param {Array} fileList - 文件列表（递归使用）
 * @returns {Array} MP3 文件路径数组
 */
function findAllMp3Files(dirPath, fileList = []) {
  try {
    if (!fs.existsSync(dirPath)) {
      throw new Error(`文件夹不存在: ${dirPath}`);
    }

    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        // 递归遍历子文件夹
        findAllMp3Files(filePath, fileList);
      } else if (stat.isFile()) {
        // 检查是否是 MP3 文件（不区分大小写）
        const ext = path.extname(file).toLowerCase();
        let list = CONFIG.ENABLE_AUDIOS;
        if (list.includes(ext)) {
          fileList.push(filePath);
        }
      }
    });

    return fileList;
  } catch (error) {
    console.error(`遍历文件夹失败: ${dirPath}`, error.message);
    return fileList;
  }
}

/**
 * 批量处理文件夹下的所有 MP3 文件
 * @param {string} folderPath - 文件夹路径
 * @param {object} options - 选项配置
 * @param {boolean} options.parallel - 是否并行处理（默认 false，串行处理）
 * @param {number} options.maxConcurrent - 最大并发数（仅在 parallel=true 时有效，默认 3）
 * @returns {Promise<object>} 处理结果统计
 */
async function processFolderMp3Files(folderPath, options = {}) {
  const {
    parallel = false,
    maxConcurrent = 3,
  } = options;

  console.log(`\n开始扫描文件夹: ${folderPath}`);
  const mp3Files = findAllMp3Files(folderPath);
  
  if (mp3Files.length === 0) {
    console.log('未找到任何 MP3 文件');
    return {
      total: 0,
      success: 0,
      failed: 0,
      results: [],
    };
  }

  console.log(`找到 ${mp3Files.length} 个 MP3 文件`);
  console.log('文件列表:');
  mp3Files.forEach((file, index) => {
    console.log(`  ${index + 1}. ${file}`);
  });

  const results = [];
  let successCount = 0;
  let failedCount = 0;

  if (parallel) {
    // 并行处理
    console.log(`\n开始并行处理（最大并发数: ${maxConcurrent}）...`);
    
    // 分批处理，控制并发数
    for (let i = 0; i < mp3Files.length; i += maxConcurrent) {
      const batch = mp3Files.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(filePath => processSingleAudioFile(filePath));
      const batchResults = await Promise.all(batchPromises);
      
      batchResults.forEach(result => {
        results.push(result);
        if (result.success) {
          successCount++;
        } else {
          failedCount++;
        }
      });
      
      console.log(`\n进度: ${Math.min(i + maxConcurrent, mp3Files.length)}/${mp3Files.length}`);
    }
  } else {
    // 串行处理
    console.log(`\n开始串行处理...`);
    
    for (let i = 0; i < mp3Files.length; i++) {
      const filePath = mp3Files[i];
      console.log(`\n[${i + 1}/${mp3Files.length}] 处理文件: ${path.basename(filePath)}`);
      
      const result = await processSingleAudioFile(filePath);
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
      
      console.log(`进度: ${i + 1}/${mp3Files.length} (成功: ${successCount}, 失败: ${failedCount})`);
    }
  }

  // 输出统计信息
  console.log('\n' + '='.repeat(60));
  console.log('处理完成！统计信息:');
  console.log(`  总文件数: ${mp3Files.length}`);
  console.log(`  成功: ${successCount}`);
  console.log(`  失败: ${failedCount}`);
  console.log('='.repeat(60));

  // 输出失败的文件列表
  if (failedCount > 0) {
    console.log('\n失败的文件:');
    results.filter(r => !r.success).forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.filePath}`);
      console.log(`     错误: ${result.error}`);
    });
  }

  return {
    total: mp3Files.length,
    success: successCount,
    failed: failedCount,
    results: results,
  };
}

async function main() {
  try {
    // 示例 1: 使用本地文件路径
    // console.log('=== 示例 1: 使用本地文件路径 ===');
    // const filePath = '/Users/pengyuanyang/Downloads/rec1.mp3';
    // await processSingleAudioFile(filePath);

      // 示例 2: 遍历文件夹所有 mp3 文件
      console.log('=== 示例 2: 遍历文件夹所有 mp3 文件 ===');
      const folderPath = '/Users/pengyuanyang/Downloads/1.2m';
      await processFolderMp3Files(folderPath);
      console.log('=== 示例 2: 遍历文件夹所有 mp3 文件 完成 ===');

  } catch (error) {
    console.error('转写失败:', error.message);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
}

// 运行示例
if (require.main === module) {
  main();
}

// 导出模块
module.exports = {
  UnrealtimeTransferGemini,
  unrealtimeTransferEntry,
  HttpManager,
  SignatureUtil,
  OssUploader,
  extractTextFromJson,
  extractTextFromTranscriptDoc,
  getAudioDuration,
  processSingleAudioFile,
  findAllMp3Files,
  processFolderMp3Files,
  main
};

