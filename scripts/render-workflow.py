#!/usr/bin/env python3
"""Render an eight-second conceptual workflow. No UI captures or measured timing.
Requires Pillow and ffmpeg. Outputs stay in artifacts until reviewed.
"""
from pathlib import Path
import os, math, subprocess, json
from PIL import Image, ImageDraw, ImageFont
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/"artifacts/workflow-motion"
OUT.mkdir(parents=True,exist_ok=True)
W,H,FPS=1280,400,24
FONT=os.environ.get("CHART_CJK_FONT","/System/Library/Fonts/STHeiti Light.ttc")
INK="#14283f"; MUTED="#64748b"; TEAL="#089a8d"; GRAY="#8190a4"; AMBER="#b45309"
def font(size):return ImageFont.truetype(FONT,size)
def ease(x):return (1-math.cos(math.pi*max(0,min(1,x))))/2
def point(path,p):
    lengths=[math.dist(a,b) for a,b in zip(path,path[1:])]
    distance=max(0,min(1,p))*sum(lengths)
    for a,b,l in zip(path,path[1:],lengths):
        if distance<=l:return (a[0]+(b[0]-a[0])*distance/l,a[1]+(b[1]-a[1])*distance/l)
        distance-=l
    return path[-1]
def frame(t,zh):
    im=Image.new("RGB",(W,H),"#ffffff");d=ImageDraw.Draw(im)
    def txt(x,y,s,size=22,color=INK):
        bounds=d.textbbox((x,y),s,font=font(size))
        assert bounds[0]>=0 and bounds[1]>=0 and bounds[2]<=W and bounds[3]<=H, (s,bounds)
        d.text((x,y),s,font=font(size),fill=color)
    def box(rect,title,sub,color):
        d.rounded_rectangle(rect,18,fill="#f6f8fc",outline=color,width=2)
        x,y,r,b=rect;txt(x+18,y+18,title,24,color);txt(x+18,y+57,sub,17,MUTED)
    upper=[(220,260),(435,260),(565,140),(800,140),(1120,140)]
    lower=[(220,260),(435,260),(565,340),(800,340),(1120,340)]
    for path,col in [(upper,TEAL),(lower,GRAY)]:
        d.line(path,fill="#dbe3ed",width=8,joint="curve")
        for a,b in zip(path,path[1:]):
            if a[1]==b[1]:
                x=(a[0]+b[0])/2;y=a[1];d.polygon([(x+9,y),(x-4,y-6),(x-4,y+6)],fill=col)
    box((40,160,250,280),"DSH","模型请求" if zh else "Model requests",INK)
    box((330,160,540,280),"域名规则" if zh else "Domain rules","精确匹配" if zh else "Exact matching",AMBER)
    box((675,40,930,160),"本机代理" if zh else "Local proxy","节点由代理软件选择" if zh else "App selects exit node",TEAL)
    box((675,240,930,360),"原有路线" if zh else "Existing route","不保证是直连" if zh else "May already use a proxy",GRAY)
    box((1020,40,1240,160),"目标 API" if zh else "Target API","匹配域名" if zh else "Matched domain",TEAL)
    box((1020,240,1240,360),"其他 API" if zh else "Other API","未匹配域名" if zh else "Unmatched domain",GRAY)
    txt(380,61,"命中" if zh else "MATCH",18,TEAL)
    txt(380,325,"未命中" if zh else "NO MATCH",18,GRAY)
    for offset,path,col,name in [(0,upper,TEAL,"model.example"),(.35,lower,GRAY,"other.example")]:
        phase=(t-offset)
        if 0<=phase<=6.2:
            returning=phase>3.4
            p=ease(phase/3.4) if not returning else 1-ease((phase-3.4)/2.8)
            x,y=point(path,p)
            d.rounded_rectangle((x-76,y-14,x+76,y+14),10,fill=col)
            label=("返回" if zh else "Response") if returning else name
            tw=d.textbbox((0,0),label,font=font(18))[2]
            txt(x-tw/2,y-12,label,18,"white")
    return im
for lang in ["en","zh"]:
    zh=lang=="zh";path=OUT/("workflow-"+lang+".mp4")
    cmd=["ffmpeg","-hide_banner","-loglevel","error","-y","-f","rawvideo","-pix_fmt","rgb24",
         "-s",f"{W}x{H}","-r",str(FPS),"-i","-","-an","-c:v","libx264","-crf","20","-pix_fmt","yuv420p","-movflags","+faststart",str(path)]
    proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
    for i in range(FPS*8):proc.stdin.write(frame(i/FPS,zh).tobytes())
    proc.stdin.close();assert proc.wait()==0
    for t in [0,1.5,3,4.5,6.5,7.9]:
        im=frame(t,zh);assert im.tobytes()==frame(t,zh).tobytes()
        im.save(OUT/f"{lang}-{t}.png")
    subprocess.run(["ffmpeg","-hide_banner","-loglevel","error","-y","-i",str(path),
        "-filter_complex","fps=12,scale=960:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3",
        "-loop","0",str(OUT/("workflow-"+lang+".gif"))],check=True)
(OUT/"qa").mkdir(exist_ok=True)
(OUT/"qa/qa.json").write_text(json.dumps({"page_errors":[],"segments":[{"id":"workflow-en","deterministic":True},{"id":"workflow-zh","deterministic":True}],"method":"Custom Pillow renderer: per-frame text boundary assertions, identical repeated sample-frame renders; temporal jump detection and normal-speed playback review were not performed. Timing is illustrative."},indent=2)+"\n")
print("Rendered both languages; text bounds checked on all frames; sampled frames deterministic.")
