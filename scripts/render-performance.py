#!/usr/bin/env python3
"""Render README case-study charts from sanitized, public metric-only data.
Requires matplotlib. Set CHART_CJK_FONT to a CJK font path if needed.
"""
from pathlib import Path
import os, json, statistics
ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("MPLCONFIGDIR", str(ROOT / "artifacts" / "matplotlib"))
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

DATA = json.loads((ROOT / "docs/performance/case-study.json").read_text())
OUT = ROOT / "docs/images"
OUT.mkdir(exist_ok=True)
CJK = os.environ.get("CHART_CJK_FONT")
if not CJK:
    for candidate in ["/System/Library/Fonts/STHeiti Light.ttc", "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"]:
        if Path(candidate).exists():
            CJK = candidate
            break
if not CJK:
    raise SystemExit("Set CHART_CJK_FONT to a Chinese font file to render both languages.")
font_manager.fontManager.addfont(CJK)
cjk_name = font_manager.FontProperties(fname=CJK).get_name()
colors = ["#8b95a7", "#089a8d", "#3565d8"]
summaries = []
for group in DATA["groups"]:
    rows = group["requests"]
    summaries.append({
        "n": len(rows),
        "speed": statistics.median(r["stream_tps"] for r in rows),
        "mean": statistics.mean(r["stream_tps"] for r in rows),
        "max": max(r["stream_tps"] for r in rows),
        "wait": statistics.median(r["ttft_seconds"] for r in rows),
        "context_min": min(r["uncached_input_tokens"] + r["cache_read_tokens"] for r in rows),
        "context_max": max(r["uncached_input_tokens"] + r["cache_read_tokens"] for r in rows),
    })
for language in ["en", "zh"]:
    zh = language == "zh"
    plt.rcParams.update({"font.family": cjk_name if zh else "DejaVu Sans",
                         "svg.fonttype": "path", "axes.unicode_minus": False})
    fig = plt.figure(figsize=(14, 10), facecolor="white")
    fig.text(.045,.94,"设置前后的速度与等待" if zh else "Speed and wait, before and after setup",
             fontsize=24,weight="bold",color="#14283f")
    fig.text(.045,.897,"OpenDesign · deepseek-v4.1-flash · 2026-10-24 · " +
             ("历史观察 / 早期原型" if zh else "historical observations / earlier prototype"),fontsize=11,color="#64748b")
    labels = ["设置前 · 历史", "设置后 · 短会话", "设置后 · 长会话"] if zh else [
        "Before · historical","After · short","After · long"]
    specs = [
        ("speed","中位数 · 典型调用" if zh else "Median · typical call",.23,.57,.045,380),
        ("mean","平均值 · 全部调用" if zh else "Mean · all calls",.71,.57,.525,380),
        ("max","最高值 · 单次峰值" if zh else "Maximum · single-call peak",.23,.22,.045,380),
        ("wait","首内容等待 · 中位数" if zh else "First-content wait · median",.71,.22,.525,16),
    ]
    for field,title,x,y,lx,maximum in specs:
        ax=fig.add_axes([x,y,.235,.205])
        vals=[g[field] for g in summaries]
        ax.set_facecolor("#f6f8fc")
        ax.barh([2,1,0],vals,height=.45,color=colors,zorder=3)
        ax.set_xlim(0,maximum);ax.set_ylim(-.55,2.55)
        ax.set_yticks([]);ax.set_xticks([0,5,10,15] if field=="wait" else [0,100,200,300])
        ax.grid(axis="x",color="#e1e7ef",zorder=0)
        ax.tick_params(colors="#64748b",length=0,labelsize=9,pad=7)
        for spine in ax.spines.values():spine.set_visible(False)
        fig.text(lx,y+.257,title,fontsize=15,weight="bold",color="#14283f")
        fig.text(x,y+.218,"秒 / s" if zh and field=="wait" else "seconds" if field=="wait" else "tok/s",
                 fontsize=10,color="#64748b")
        for i,(label,g,color,value) in enumerate(zip(labels,summaries,colors,vals)):
            fy=y+(2-i+.55)/3.1*.205
            fig.text(lx,fy+.002,label,fontsize=11,weight="bold",color=color)
            fig.text(lx,fy-.023,f"n = {g['n']}",fontsize=9,color="#64748b")
            ax.text(value+maximum*.025,2-i,f"{value:.2f}" if field=="wait" else f"{value:.1f}",
                    va="center",fontsize=14,color="#14283f",weight="bold")
    notes = [
        "均值使用每组全部调用；峰值不代表持续速度。三张速度图共用同一尺度。",
        "上下文范围：历史 166.8–183.1k；设置后短会话 15.7–19.4k；长会话 185.3–195.4k。",
        "非受控 A/B：任务、上下文、时段与负载不同。首内容等待包含重试；不代表 0.1.0 提速承诺。"
    ] if zh else [
        "Means include every call in each group. Peaks are not sustained rates. Speed panels share one scale.",
        "Input context: historical 166.8–183.1k; after short 15.7–19.4k; after long 185.3–195.4k.",
        "Not controlled A/B: tasks, context, timing and load differ. Wait includes retries. No 0.1.0 speedup promise."
    ]
    for i,line in enumerate(notes):fig.text(.045,.12-i*.03,line,fontsize=10,color="#64748b")
    path=OUT/("routing-group-comparison-"+language)
    fig.savefig(str(path)+".png",dpi=150,facecolor=fig.get_facecolor(),metadata={"Software":"matplotlib"})
    fig.savefig(str(path)+".svg",facecolor=fig.get_facecolor(),metadata={"Date":None,"Creator":"matplotlib"})
    plt.close(fig)
print(json.dumps({"renderer":matplotlib.__version__,"groups":summaries},indent=2))

# Per-call distributions: retain dataset order within each group; no interpolation.
for language in ["en", "zh"]:
    zh = language == "zh"
    plt.rcParams.update({"font.family": cjk_name if zh else "DejaVu Sans",
                         "svg.fonttype": "path", "axes.unicode_minus": False})
    fig = plt.figure(figsize=(14, 8), facecolor="white")
    historical = DATA["groups"][0]["requests"]
    slow = sum(r["stream_tps"] < 10 for r in historical)
    minimum = min(r["stream_tps"] for r in historical)
    fig.text(.055, .93, "慢请求，藏在中位数背后" if zh else "The slow calls behind the median",
             fontsize=25, weight="bold", color="#14283f")
    fig.text(.055, .878, "OpenDesign · deepseek-v4.1-flash · 2026-10-24 · " +
             ("早期本地原型" if zh else "earlier local prototype"), fontsize=11, color="#64748b")
    cards = [
        (f"{slow} / {len(historical)}", "历史调用低于 10 tok/s" if zh else "historical calls below 10 tok/s", "#b45309"),
        (f"{minimum:.2f} tok/s", "历史样本最低流式速度" if zh else "lowest historical streaming speed", "#b45309"),
        (str(sum(r["stream_tps"] < 10 for g in DATA["groups"][1:] for r in g["requests"])) + " / " + str(sum(len(g["requests"]) for g in DATA["groups"][1:])), "设置后样本低于 10 tok/s" if zh else "post-setup samples below 10 tok/s", "#089a8d"),
    ]
    for x, (value, caption, color) in zip([.055, .375, .695], cards):
        fig.text(x, .785, value, fontsize=27, weight="bold", color=color)
        fig.text(x, .744, caption, fontsize=11, color="#64748b")
    titles = ["设置前 · 历史样本", "设置后 · 短会话", "设置后 · 长会话"] if zh else [
        "Before · historical", "After · short context", "After · long context"]
    upper = max(r["stream_tps"] for g in DATA["groups"] for r in g["requests"])
    upper = (int(upper / 50) + 1) * 50
    for i, (group, title, color) in enumerate(zip(DATA["groups"], titles, colors)):
        ax = fig.add_axes([.07 + i * .315, .29, .275, .355])
        rows = group["requests"]
        values = [r["stream_tps"] for r in rows]
        ax.set_facecolor("#f6f8fc")
        ax.axhspan(0, 10, color="#ffedd5", zorder=0)
        ax.axhline(10, color="#d97706", linestyle="--", linewidth=1, zorder=2)
        ax.scatter(range(1, len(rows)+1), values, s=45,
                   c=["#d97706" if v < 10 else color for v in values],
                   edgecolors="white", linewidths=.7, zorder=3)
        ax.set_ylim(0, upper)
        ax.set_xlim(.3, len(rows)+.7)
        ticks = sorted(set([1, len(rows)//2, len(rows)]))
        ax.set_xticks(ticks)
        ax.set_title(title + f"  (n = {len(rows)})", loc="left", fontsize=12,
                     weight="bold", color="#14283f", pad=14)
        ax.set_xlabel("组内样本序号" if zh else "Sample index within group",
                      fontsize=10, color="#64748b", labelpad=10)
        ax.tick_params(colors="#64748b", labelsize=9, length=0)
        ax.grid(axis="y", color="#e1e7ef", linewidth=.7)
        ax.set_axisbelow(True)
        if i == 0:
            ax.set_ylabel("tok/s", fontsize=10, color="#64748b")
            j = min(range(len(rows)), key=lambda j: values[j])
            ax.annotate(f"{values[j]:.2f}", xy=(j+1,values[j]), xytext=(j-2,upper*.18),
                        fontsize=10, color="#b45309",
                        arrowprops={"arrowstyle":"-", "color":"#b45309"})
        if i == 2:
            j = max(range(len(rows)), key=lambda j: values[j])
            ax.annotate(f"{values[j]:.1f} tok/s", xy=(j+1,values[j]),
                        xytext=(j-3,upper*.78),fontsize=10,color=color,
                        arrowprops={"arrowstyle":"-", "color":color})
        for spine in ax.spines.values(): spine.set_visible(False)
    fig.text(.055, .185, "每个点代表一次有输出用量的调用；橙色点低于 10 tok/s，虚线为阈值。" if zh else
             "Every dot is an output-bearing call. Orange dots fall below the dashed 10 tok/s threshold.",
             fontsize=11, color="#14283f", weight="bold")
    notes = [
        "全部 52 个样本均展示，共用线性纵轴；横轴是组内记录顺序，不是时间轴。",
        "历史曾有一次流式跨度 324.687 秒、速度 2.12 tok/s 的调用；这不是首 token 等待时长。",
        "非受控 A/B：任务、上下文、时段与负载不同。设置后样本较少，不能据此保证不再出现慢请求。"
    ] if zh else [
        "All 52 samples are shown on a shared linear y-scale. The x-axis is record order, not elapsed time.",
        "One historical call spanned 324.687 streaming seconds at 2.12 tok/s; this was not first-token wait.",
        "Not controlled A/B: tasks, context, timing and load differ. Small post-setup samples do not guarantee no slow calls."
    ]
    for i, line in enumerate(notes):
        fig.text(.055,.132-i*.035,line,fontsize=9.5,color="#64748b")
    path = OUT / ("routing-call-distribution-" + language)
    fig.savefig(str(path)+".png",dpi=150,metadata={"Software":"matplotlib"})
    fig.savefig(str(path)+".svg",metadata={"Date":None,"Creator":"matplotlib"})
    plt.close(fig)

# README overview: pool raw call rates, never average subgroup medians.
before = DATA["groups"][0]["requests"]
after = [r for g in DATA["groups"][1:] for r in g["requests"]]
overview = [statistics.median(r["stream_tps"] for r in rows) for rows in [before,after]]
peak = max(r["stream_tps"] for r in after)
for language in ["en","zh"]:
    zh=language=="zh"
    plt.rcParams.update({"font.family":cjk_name if zh else "DejaVu Sans","svg.fonttype":"path"})
    fig=plt.figure(figsize=(12,5.4),facecolor="white")
    fig.text(.06,.9,"设置前后的整体速度" if zh else "Overall speed before and after setup",
             fontsize=23,weight="bold",color="#14283f")
    fig.text(.06,.833,"流式速度中位数 · tok/s" if zh else "Median per-call streaming speed · tok/s",
             fontsize=12,color="#64748b")
    ax=fig.add_axes([.23,.36,.67,.36])
    ax.set_facecolor("#f6f8fc")
    ax.barh([1,0],overview,color=["#8b95a7","#089a8d"],height=.46,zorder=3)
    ax.set_xlim(0,210);ax.set_ylim(-.55,1.55);ax.set_yticks([])
    ax.set_xticks([0,50,100,150,200]);ax.grid(axis="x",color="#e1e7ef",zorder=0)
    ax.tick_params(colors="#64748b",length=0,labelsize=10,pad=8)
    for spine in ax.spines.values():spine.set_visible(False)
    for y,value,label,n,color in zip([1,0],overview,["设置前","设置后"] if zh else ["Before","After"],
                                    [len(before),len(after)],["#8b95a7","#089a8d"]):
        fy=.36+(y+.55)/2.1*.36
        fig.text(.06,fy+.005,label,fontsize=18,weight="bold",color=color)
        fig.text(.06,fy-.045,f"n = {n}",fontsize=11,color="#64748b")
        ax.text(value+5,y,f"{value:.1f}",va="center",fontsize=24,weight="bold",color="#14283f")
    from matplotlib.patches import FancyBboxPatch
    fig.add_artist(FancyBboxPatch((.06,.18),.84,.115,
                   boxstyle="round,pad=0.009,rounding_size=0.012",
                   transform=fig.transFigure,facecolor="#e8f6f2",edgecolor="none"))
    fig.text(.08,.245,"设置后单次最高" if zh else "Post-setup single-call peak",
             fontsize=12,weight="bold",color="#087f75")
    fig.text(.08,.207,"来自完整样本" if zh else "From the complete sample",
             fontsize=10,color="#64748b")
    fig.text(.43,.213,f"{peak:.1f} tok/s",fontsize=28,weight="bold",color="#087f75")
    fig.text(.75,.245,"单次峰值" if zh else "One call",
             fontsize=11,weight="bold",color="#14283f")
    fig.text(.75,.207,"非持续速度" if zh else "Not a sustained rate",
             fontsize=10,color="#64748b")
    fig.text(.06,.14,"设置后合并全部 24 次调用（6 次短会话 + 18 次长会话），重新计算中位数。" if zh else
             "After: median recalculated from all 24 calls (6 short-context + 18 long-context).",
             fontsize=10,color="#64748b")
    fig.text(.06,.085,"历史观察，非受控 A/B；任务、上下文和负载不同，不代表 0.1.0 提速承诺。" if zh else
             "Historical observations, not controlled A/B. Tasks, context and load differ; no 0.1.0 speedup promise.",
             fontsize=10,color="#64748b")
    path=OUT/("routing-case-study-"+language)
    fig.savefig(str(path)+".png",dpi=150,metadata={"Software":"matplotlib"})
    fig.savefig(str(path)+".svg",metadata={"Date":None,"Creator":"matplotlib"})
    plt.close(fig)
print(json.dumps({"overview_medians":overview,"counts":[len(before),len(after)]}))
