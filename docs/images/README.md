# Documentation images

Configuration screenshots are real captures from an isolated DSH profile using synthetic provider hostnames and example port 7897. They show two scroll positions at full viewport width: config.jpg shows domains/address; config-controls.jpg shows routing, recording and save controls. Routing is disabled in these captures. The en/ versions use the English interface. No screenshots contain the private source-path panel.

Routes and performance screenshots use local synthetic calls, including a deliberately unreachable proxy. Their values are UI demonstrations, not model benchmarks.

Performance case-study SVG/PNG figures use sanitized historical numeric data under ../performance/. See that directory for metric definitions, sample limitations and reproduction instructions. Generate both languages with scripts/render-performance.py from the project root.

Badges are local static SVGs. They describe version, tested host, Node requirement and license; they do not claim a published release or passing remote CI.

The bilingual workflow GIFs are eight-second conceptual diagrams, not UI captures or speed measurements. Matching domains use the configured local proxy; other destinations retain their existing route, which may also be proxied. The compact animation omits titles, recording panels and footnotes; the timing caveat remains in the README caption. Static alternatives use the final diagram frame. Reproduce with python3 scripts/render-workflow.py (Pillow and ffmpeg; set CHART_CJK_FONT for your system), review artifacts/workflow-motion, then copy the approved GIFs and final stills here. Production reports and MP4s remain ignored.

The README case-study figure uses two bars: the median of 28 historical calls and the pooled median of all 24 post-setup calls. The detailed routing-group-comparison figure uses four panels: per-call median, arithmetic mean, maximum, and median first-content wait. All three speed panels share the same scale; a maximum is not sustained throughput.
