import asyncio,json,edge_tts
from pathlib import Path
text="This glass can survive a hammer blow. But snap its tiny tail, and the whole thing shatters. It's a Prince Rupert's drop. Molten glass hardens outside first in cold water. As the center cools and shrinks, it traps stress inside. The surface is squeezed tight. The core stays under tension. Break the tail, and cracks race into the head... tearing the entire drop apart."
Path("narration.txt").write_text(text+"\n")
Path("script_manifest.json").write_text(json.dumps({"beats":[{"phrase":text}]},indent=2))
async def main():
    c=edge_tts.Communicate(text, "en-US-AndrewMultilingualNeural", rate="+12%", volume="+0%")
    await c.save("narration.mp3")
asyncio.run(main())
