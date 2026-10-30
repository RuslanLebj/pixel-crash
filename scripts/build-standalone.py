"""Assemble the split sources into dist/ and a single offline HTML file."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"


def build_outputs():
    sources = json.loads((SRC / "game-sources.json").read_text(encoding="utf-8"))
    if not sources or len(sources) != len(set(sources)):
        raise ValueError("Expected a nonempty list of unique game source files")
    parts = []
    for name in sources:
        path = (SRC / name).resolve()
        if not path.is_relative_to(SRC.resolve()) or path.suffix != ".js":
            raise ValueError("Invalid game source: " + name)
        parts.append(path.read_text(encoding="utf-8").rstrip())
    game = "'use strict';\n(() => {\n" + "\n\n".join(parts) + "\n})();\n"
    music = (SRC / "audio/music.js").read_text(encoding="utf-8")
    css = (SRC / "styles.css").read_text(encoding="utf-8")
    template = (SRC / "index.html").read_text(encoding="utf-8")
    style_tag = '<link rel="stylesheet" href="styles.css">'
    if template.count(style_tag) != 1:
        raise ValueError("Expected one stylesheet link in src/index.html")
    standalone = template.replace(style_tag, "<style>" + css + "</style>")
    for name, source in (("music.js", music), ("game.js", game)):
        tag = '<script src="' + name + '"></script>'
        if standalone.count(tag) != 1:
            raise ValueError("Expected one script tag for " + name)
        standalone = standalone.replace(tag, "<script>\n" + source + "\n</script>")
    return {
        ROOT / "dist/game.js": game,
        ROOT / "dist/music.js": music,
        ROOT / "dist/styles.css": css,
        ROOT / "dist/index.html": template,
        ROOT / "index.html": standalone,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify generated files without writing")
    args = parser.parse_args()
    outputs = build_outputs()
    if args.check:
        stale = [str(path.relative_to(ROOT)) for path, text in outputs.items()
                 if not path.exists() or path.read_text(encoding="utf-8") != text]
        if stale:
            parser.exit(1, "Generated files are stale: " + ", ".join(stale) + "\nRun python3 scripts/build-standalone.py\n")
        print("Generated files match src/: OK")
        return
    for path, text in outputs.items():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text, encoding="utf-8")
    print("Ready:", ROOT / "index.html")


if __name__ == "__main__":
    main()
