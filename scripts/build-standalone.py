from pathlib import Path
root = Path(__file__).resolve().parent.parent
html = (root / "dist/index.html").read_text(encoding="utf-8")
for name in ("music.js", "game.js"):
    tag = '<script src="' + name + '"></script>'
    if tag not in html:
        raise ValueError("Missing script: " + name)
    js = (root / "dist" / name).read_text(encoding="utf-8")
    html = html.replace(tag, '<script>\n' + js + '\n</script>')
(root / "index.html").write_text(html, encoding="utf-8")
print("Ready:", root / "index.html")
