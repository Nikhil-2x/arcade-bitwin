import asyncio
import os
import shutil
import edge_tts

SCRIPTS = {
    "classroom": {
        "title": "Level 1 - Classroom",
        "text": "Room 10-B, Greenfield Public School. The Class 10 exam paper was locked in the teacher's desk. Tonight, the drawer was forced, the seal torn, and the questions leaked online. Four suspects were in the school. One of them hid the evidence. Find the truth... before the morning bell."
    },
    "railway": {
        "title": "Level 2 - Railway Station",
        "text": "Chandanpur Junction, Platform 2. An express train screeches to a halt in the dark—the home signal has been killed. Trackside, three metres of copper cable have been sliced away. Four suspects were on the platform. Someone sabotaged the line and hid the tools. Search the station... before disaster strikes."
    }
}

async def generate():
    out_dir = os.path.join("frontend", "public", "audio", "voiceover")
    os.makedirs(out_dir, exist_ok=True)

    # We generate both male (Prabhat) and female (Neerja) versions
    voices = [
        ("prabhat", "en-IN-PrabhatNeural"),
        ("neerja", "en-IN-NeerjaExpressiveNeural")
    ]

    for key, data in SCRIPTS.items():
        for voice_tag, voice_name in voices:
            filename = f"{key}_{voice_tag}.mp3"
            filepath = os.path.join(out_dir, filename)
            print(f"Generating {data['title']} ({voice_name}) -> {filepath}...")
            
            communicate = edge_tts.Communicate(data["text"], voice=voice_name, rate="-3%")
            await communicate.save(filepath)
            print(f"Generated: {filepath}")

    # Set Prabhat as default classroom.mp3 & railway.mp3
    shutil.copyfile(os.path.join(out_dir, "classroom_prabhat.mp3"), os.path.join(out_dir, "classroom.mp3"))
    shutil.copyfile(os.path.join(out_dir, "railway_prabhat.mp3"), os.path.join(out_dir, "railway.mp3"))
    print("\nShort voiceovers generated successfully!")

if __name__ == "__main__":
    asyncio.run(generate())
