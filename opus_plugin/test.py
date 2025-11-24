import os
import struct
import zlib
from dataclasses import dataclass
from typing import List

@dataclass
class AudioConfig:
    """音频配置参数"""
    sample_rate: int = 16000
    channels: int = 1
    frame_duration_ms: int = 20
    compressed_frame_size: int = 40
    header_size: int = 8

class OpusOggConverter:
    def __init__(self, config: AudioConfig = None):
        self.config = config or AudioConfig()
        self.frame_size = int(self.config.sample_rate * self.config.frame_duration_ms / 1000)
        self.stream_serial = 0x12345678  # 流序列号

    def read_custom_format(self, input_file: str) -> List[bytes]:
        """读取自定义格式文件"""
        frames = []
        frame_size_total = self.config.header_size + self.config.compressed_frame_size

        try:
            file_size = os.path.getsize(input_file)
            if file_size == 0:
                raise ValueError("输入文件为空")

            total_frames = file_size // frame_size_total

            with open(input_file, 'rb') as f:
                for i in range(total_frames):
                    frame_data = f.read(frame_size_total)
                    if len(frame_data) < frame_size_total:
                        break

                    # 提取音频数据（跳过帧头）
                    audio_data = frame_data[self.config.header_size:self.config.header_size + self.config.compressed_frame_size]
                    if len(audio_data) == self.config.compressed_frame_size:
                        frames.append(audio_data)

            print(f"成功读取 {len(frames)} 帧音频数据")
            return frames

        except Exception as e:
            print(f"读取文件失败: {e}")
            raise

    def create_opus_head(self) -> bytes:
        """创建OpusHead包"""
        opus_head = bytearray()
        opus_head.extend(b'OpusHead')  # 8字节标识
        opus_head.append(1)           # 版本
        opus_head.append(self.config.channels)  # 通道数
        opus_head.extend(struct.pack('<H', 3840))  # 预跳过样本数
        opus_head.extend(struct.pack('<I', self.config.sample_rate))  # 输入采样率
        opus_head.extend(struct.pack('<h', 0))  # 输出增益
        opus_head.append(0)           # 通道映射
        return bytes(opus_head)

    def create_opus_tags(self) -> bytes:
        """创建OpusTags包"""
        opus_tags = bytearray()
        opus_tags.extend(b'OpusTags')  # 8字节标识

        vendor_string = b'CustomOpusConverter'
        opus_tags.extend(struct.pack('<I', len(vendor_string)))
        opus_tags.extend(vendor_string)
        opus_tags.extend(struct.pack('<I', 0))  # 注释数量为0

        return bytes(opus_tags)

    def calculate_crc(self, data: bytes) -> int:
        """计算CRC32校验和"""
        return zlib.crc32(data) & 0xFFFFFFFF

    def create_ogg_page(self, packet_data: bytes, header_type: int, granule_pos: int, page_seq: int) -> bytes:
        """创建Ogg页面"""
        # 分段处理数据包
        segments = []
        pos = 0
        while pos < len(packet_data):
            seg_size = min(255, len(packet_data) - pos)
            segments.append(seg_size)
            pos += seg_size

        segment_table = bytes(segments)
        segment_count = len(segments)

        # 构建页头
        header = bytearray()
        header.extend(b'OggS')  # 捕获模式
        header.append(0)       # 版本
        header.append(header_type)  # 头部类型
        header.extend(struct.pack('<Q', granule_pos))  # 粒度位置
        header.extend(struct.pack('<I', self.stream_serial))  # 位流序列号
        header.extend(struct.pack('<I', page_seq))  # 页序列号
        header.extend(struct.pack('<I', 0))  # CRC占位符
        header.append(segment_count)  # 段数
        header.extend(segment_table)  # 段表

        # 计算CRC（包括页头、段表和包数据，但CRC字段设为0）
        crc_data = bytearray()
        crc_data.extend(header[:22])  # 前22字节（不含CRC）
        crc_data.extend(b'\x00\x00\x00\x00')  # CRC字段设为0
        crc_data.extend(header[26:])  # 段表
        crc_data.extend(packet_data)  # 包数据

        crc_value = self.calculate_crc(bytes(crc_data))

        # 更新CRC字段
        header[22:26] = struct.pack('<I', crc_value)

        # 构建完整页面
        return bytes(header) + packet_data

    def create_ogg_opus_file(self, opus_frames: List[bytes], output_file: str) -> bool:
        """创建标准的Ogg Opus文件"""
        try:
            with open(output_file, 'wb') as f:
                page_seq = 0
                granule_pos = 0

                # 1. BOS页 - OpusHead
                opus_head = self.create_opus_head()
                head_page = self.create_ogg_page(opus_head, 0x02, 0, page_seq)
                f.write(head_page)
                page_seq += 1

                # 2. 注释页 - OpusTags
                opus_tags = self.create_opus_tags()
                tags_page = self.create_ogg_page(opus_tags, 0x00, 0, page_seq)
                f.write(tags_page)
                page_seq += 1

                # 3. 音频数据页
                for i, opus_data in enumerate(opus_frames):
                    # 计算粒度位置
                    granule_pos = (i + 1) * self.frame_size

                    # 设置页面类型
                    header_type = 0x00  # 普通页
                    if i == len(opus_frames) - 1:
                        header_type = 0x04  # EOS页

                    audio_page = self.create_ogg_page(opus_data, header_type, granule_pos, page_seq)
                    f.write(audio_page)
                    page_seq += 1

                print(f"成功生成Ogg Opus文件")
                return True

        except Exception as e:
            print(f"创建Ogg文件失败: {e}")
            import traceback
            traceback.print_exc()
            return False

    def convert_to_ogg_opus(self, input_file: str, output_file: str) -> bool:
        """主转换函数"""
        print(f"开始转换: {input_file} -> {output_file}")

        if not os.path.exists(input_file):
            print(f"错误: 输入文件不存在")
            return False

        try:
            # 读取音频数据
            opus_frames = self.read_custom_format(input_file)
            if not opus_frames:
                print("错误: 没有读取到音频数据")
                return False

            duration = len(opus_frames) * self.config.frame_duration_ms / 1000
            print(f"音频信息:")
            print(f"  - 总帧数: {len(opus_frames)}")
            print(f"  - 估算时长: {duration:.2f} 秒")

            # 创建Ogg Opus文件
            success = self.create_ogg_opus_file(opus_frames, output_file)

            if success:
                file_size = os.path.getsize(output_file)
                print(f"✓ 转换成功!")
                print(f"  输出文件: {output_file}")
                print(f"  文件大小: {file_size} 字节")
                print(f"  音频时长: {duration:.2f} 秒")

                # 验证文件
                if self.verify_ogg_file(output_file):
                    print(f"✓ 文件验证通过")
                else:
                    print(f"⚠ 文件验证失败")

            return success

        except Exception as e:
            print(f"转换过程出错: {e}")
            import traceback
            traceback.print_exc()
            return False

    def verify_ogg_file(self, file_path: str) -> bool:
        """验证Ogg文件基本结构"""
        try:
            if not os.path.exists(file_path):
                return False

            file_size = os.path.getsize(file_path)
            if file_size < 100:  # 文件太小
                return False

            with open(file_path, 'rb') as f:
                # 检查文件签名
                magic = f.read(4)
                if magic != b'OggS':
                    return False

                # 检查文件结尾是否有Ogg签名
                f.seek(-100, 2)  # 跳到文件末尾前100字节
                data = f.read(100)
                if b'OggS' not in data:
                    return False

            return True

        except:
            return False

def generate_test_input(output_file: str, duration_seconds: int = 3) -> bool:
    """生成测试输入文件"""
    try:
        frames_per_second = 50
        total_frames = duration_seconds * frames_per_second

        with open(output_file, 'wb') as f:
            for i in range(total_frames):
                # 8字节帧头
                header = struct.pack('<I', 0x28)  # 长度字段
                header += struct.pack('<I', i)    # 帧序号

                # 40字节模拟Opus数据
                opus_data = bytes([(i * 17 + j * 13 + 73) % 256 for j in range(40)])

                f.write(header)
                f.write(opus_data)

        file_size = os.path.getsize(output_file)
        print(f"生成测试文件: {output_file}")
        print(f"- 时长: {duration_seconds}秒")
        print(f"- 总帧数: {total_frames}")
        print(f"- 文件大小: {file_size} 字节")
        return True

    except Exception as e:
        print(f"生成测试文件失败: {e}")
        return False

def main():
    """主函数"""
    converter = OpusOggConverter()

    # 文件路径
    test_input = "record.opus"
    test_output = "output_audio.ogg"

    # 生成测试文件
    if not os.path.exists(test_input):
        print("生成测试输入文件...")
        if not generate_test_input(test_input, duration_seconds=2):
            return

    # 检查输入文件
    file_size = os.path.getsize(test_input)
    print(f"输入文件: {test_input}")
    print(f"文件大小: {file_size} 字节")

    # 执行转换
    print("\n开始转换处理...")
    success = converter.convert_to_ogg_opus(test_input, test_output)

    if success:
        print(f"\n转换完成!")
        print(f"输出文件: {test_output}")

        if os.path.exists(test_output):
            final_size = os.path.getsize(test_output)
            print(f"文件已生成，大小: {final_size} 字节")
            print("可以使用VLC、ffplay或其他支持Ogg Opus的播放器打开")
    else:
        print("\n转换失败!")

if __name__ == "__main__":
    main()