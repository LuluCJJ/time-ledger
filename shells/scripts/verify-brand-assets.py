"""Regenerate Android artwork in a temporary directory and compare bytes."""

import importlib.util
import shutil
import tempfile
from pathlib import Path

source = Path(__file__).with_name("generate-brand-assets.py")
spec = importlib.util.spec_from_file_location("brand", source)
brand = importlib.util.module_from_spec(spec)
spec.loader.exec_module(brand)
assets = sorted(brand.RES.rglob("*.png"))
if not assets:
    raise SystemExit("No brand PNG assets found")

with tempfile.TemporaryDirectory() as folder:
    for index, asset in enumerate(assets):
        copy = Path(folder) / f"{index}.png"
        shutil.copy2(asset, copy)
        kind = {"ic_launcher_foreground.png": "foreground", "ic_launcher_round.png": "round", "ic_launcher.png": "icon"}.get(asset.name, "splash")
        brand.render(copy, kind)
        if copy.read_bytes() != asset.read_bytes():
            raise SystemExit(f"Generated artwork differs: {asset.relative_to(brand.RES)}")
print(f"Verified {len(assets)} deterministic Android PNG assets")
