#!/usr/bin/env python3
# decode_custom_opus.py
import os
os.environ['DYLD_LIBRARY_PATH'] = '/opt/homebrew/lib'

import argparse
import ctypes
import os
import struct
import sys
import binascii
import opuslib

def load_libopus():
    """加载 libopus 库，支持 Linux、macOS 和 Windows"""
    import platform
    import sys
    
    system = platform.system()
    
    # macOS
    if system == "Darwin":
        # Homebrew 安装路径
        homebrew_paths = [
            "/opt/homebrew/lib/libopus.dylib",
            "/opt/homebrew/lib/libopus.0.dylib",
            "/usr/local/lib/libopus.dylib",
            "/usr/local/lib/libopus.0.dylib"
        ]
        # 也尝试系统库路径
        system_names = ["libopus.dylib", "libopus.0.dylib"]
        
        for path in homebrew_paths:
            if os.path.exists(path):
                try:
                    return ctypes.cdll.LoadLibrary(path)
                except OSError:
                    continue
        
        for name in system_names:
            try:
                return ctypes.cdll.LoadLibrary(name)
            except OSError:
                continue
    
    # Linux
    elif system == "Linux":
        names = ["libopus.so.0", "libopus.so"]
        for name in names:
            try:
                return ctypes.cdll.LoadLibrary(name)
            except OSError:
                continue
    
    # Windows
    elif system == "Windows":
        names = ["opus.dll", "libopus-0.dll"]
        for name in names:
            try:
                return ctypes.cdll.LoadLibrary(name)
            except OSError:
                continue
    
    # 如果都失败了，提供详细的错误信息
    if system == "Darwin":
        raise OSError(
            "未找到 libopus，请安装:\n"
            "  brew install opus\n"
            "或者设置 DYLD_LIBRARY_PATH 环境变量指向 libopus.dylib 所在目录"
        )
    elif system == "Linux":
        raise OSError("未找到 libopus，请安装: sudo apt-get install libopus0 libopus-dev")
    else:
        raise OSError(f"未找到 libopus，请安装 libopus 库（{system} 系统）")

class OpusDecoder:
    def __init__(self, sample_rate: int = 16000, channels: int = 1):
        self.lib = load_libopus()
        # 函数签名
        self.lib.opus_decoder_create.argtypes = [ctypes.c_int32, ctypes.c_int, ctypes.POINTER(ctypes.c_int)]
        self.lib.opus_decoder_create.restype  = ctypes.c_void_p
        self.lib.opus_decode.argtypes = [
            ctypes.c_void_p, ctypes.POINTER(ctypes.c_ubyte), ctypes.c_int32,
            ctypes.POINTER(ctypes.c_int16), ctypes.c_int, ctypes.c_int
        ]
        self.lib.opus_decode.restype = ctypes.c_int
        self.lib.opus_decoder_destroy.argtypes = [ctypes.c_void_p]
        self.lib.opus_decoder_destroy.restype = None
        self.lib.opus_strerror.argtypes = [ctypes.c_int]
        self.lib.opus_strerror.restype  = ctypes.c_char_p

        err = ctypes.c_int(0)
        self.dec = self.lib.opus_decoder_create(sample_rate, channels, ctypes.byref(err))
        if err.value != 0 or not self.dec:
            msg = self.lib.opus_strerror(err.value).decode("utf-8", "ignore")
            raise RuntimeError(f"opus_decoder_create 失败: {err.value} ({msg})")
        self.sample_rate = sample_rate
        self.channels = channels

    def decode(self, packet: bytes, max_frame_samples: int):
        if packet:
            in_buf = (ctypes.c_ubyte * len(packet)).from_buffer_copy(packet)
            in_ptr = ctypes.cast(in_buf, ctypes.POINTER(ctypes.c_ubyte))
            in_len = ctypes.c_int32(len(packet))
        else:
            in_ptr = None
            in_len = ctypes.c_int32(0)  # PLC

        out_capacity = max_frame_samples * self.channels
        out_buf = (ctypes.c_int16 * out_capacity)()
        n = self.lib.opus_decode(self.dec, in_ptr, in_len, out_buf, max_frame_samples, 0)
        if n < 0:
            msg = self.lib.opus_strerror(n).decode("utf-8", "ignore")
            raise RuntimeError(f"opus_decode 失败: {n} ({msg})")
        total_samples = n * self.channels
        pcm = memoryview(out_buf).cast("b")[: total_samples * 2].tobytes()
        return pcm, n

    def close(self):
        if self.dec:
            self.lib.opus_decoder_destroy(self.dec)
            self.dec = None

def read_exact(f, n: int) -> bytes:
    buf = bytearray()
    while len(buf) < n:
        chunk = f.read(n - len(buf))
        if not chunk:
            break
        buf.extend(chunk)
    return bytes(buf)

def main():
    ap = argparse.ArgumentParser(description="解码自定义原始Opus流为PCM（16k/mono，帧头8字节：BE长度(4)+字段(4)）")
    ap.add_argument("input", help="输入文件（自定义 .opus 原始流）")
    ap.add_argument("output", help="输出 .pcm（s16le）")
    ap.add_argument("--sample-rate", type=int, default=16000)
    ap.add_argument("--channels", type=int, default=1)
    ap.add_argument("--frame-ms", type=int, default=20, help="期望每帧时长，默认20ms")
    ap.add_argument("--max-frame-ms", type=int, default=120, help="解码器输出上限缓冲，默认120ms")
    ap.add_argument("--expect-len", type=int, default=40, help="帧内Opus载荷长度，默认40字节")
    ap.add_argument("--skip-bad", action="store_true", help="遇到坏帧跳过（不输出任何音频）")
    ap.add_argument("--plc", action="store_true", help="坏帧时使用PLC（调用空包解码，合成丢包音频）")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(args.input):
        print(f"输入不存在: {args.input}", file=sys.stderr)
        return 1

    max_frame_samples = args.sample_rate * args.max_frame_ms // 1000
    dec = OpusDecoder(args.sample_rate, args.channels)

    frames = 0
    samples_out = 0
    try:
        with open(args.input, "rb") as fin, open(args.output, "wb") as fout:
            while True:
                # 读取8字节帧头：前4字节为大端长度，后4字节为时间戳/序号（丢弃）
                hdr = read_exact(fin, 8)
                if not hdr:
                    break
                if len(hdr) < 8:
                    if args.verbose:
                        print("残缺帧头，结束", file=sys.stderr)
                    break

                payload_len = struct.unpack(">I", hdr[:4])[0]
                ts_bytes = hdr[4:8]  # 仅用于调试
                if args.expect_len and payload_len != args.expect_len and args.verbose:
                    print(f"[frame {frames}] len={payload_len} (预期 {args.expect_len}) ts={binascii.hexlify(ts_bytes).decode()}",
                          file=sys.stderr)
                print(f"[payload_len {payload_len}] 载荷残缺，结束")
                packet = read_exact(fin, payload_len)
                if len(packet) < payload_len:
                    if args.verbose:
                        print(f"[frame {frames}] 载荷残缺，结束", file=sys.stderr)
                    break

                try:
                    pcm, n = dec.decode(packet, max_frame_samples)
                except RuntimeError as e:
                    if args.verbose:
                        print(f"[frame {frames}] 解码失败: {e}", file=sys.stderr)
                    if args.plc:
                        pcm, n = dec.decode(b"", max_frame_samples)  # 生成PLC
                    elif args.skip_bad:
                        frames += 1
                        continue
                    else:
                        raise

                fout.write(pcm)
                frames += 1
                samples_out += n

    finally:
        dec.close()

    dur = samples_out / float(args.sample_rate)
    print(f"完成：{frames} 帧，{samples_out} 样本，约 {dur:.2f}s -> {args.output}")
    return 0

if __name__ == "__main__":
    sys.exit(main())