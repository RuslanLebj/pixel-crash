from pathlib import Path
root = Path(__file__).resolve().parent.parent
html = (root / "dist/index.html").read_text(encoding="utf-8")
js = (root / "dist/game.js").read_text(encoding="utf-8")
(root / "index.html").write_text(html.replace('<script src="game.js"></script>', '<script>\n' + js + '\n</script>'), encoding="utf-8")
print("Ready:", root / "index.html")
