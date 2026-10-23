# Phase 7: UI refresh ("night watch console")

**Goal:** a more modern, interactive interface in the spirit of [loicpix.com](https://loicpix.com/): an arcade / production-tool
HUD with timecodes, frame rulers, keycaps and timing feedback, rooted in this game's world of streetlights and night routes.

## Design tokens

| Token | Value | Use |
| --- | --- | --- |
| Night ink | `#070914` | Backgrounds, plate fills |
| Panel | `#0f1430` | Cards and buttons |
| Sodium amber | `#ffb547` | The "safe / go" signal: main buttons, timecode, route, lit windows |
| Ally cyan | `#9eecff` | Priya, allies, two-player mode |
| Barrier violet | `#8a5cff` | Everything the Barrier owns |
| Muted | `#8a93c4` | Secondary text |

Type: **Bungee**, a typeface built for urban signage, for titles, numbers and labels. **Varela Round** for story and body text.
Both load from Google Fonts in `index.html`.

## Implemented

- **Shared widget kit** ([ui/widgets.ts](../../../frontend/src/game/ui/widgets.ts)):
  - `button`: a street-sign plate with cut corners. On hover the accent colour wipes in from the left and the label leans toward
    the pointer. It squashes on press and can show an optional keycap shortcut.
  - `panel`: a chamfered plate with viewfinder corner brackets.
  - `display`: text in the signage face.
  - `frame`: viewfinder chrome with a REC light, the screen name, a running timecode and a frame ruler with a sweeping playhead.
  - `backdrop`: a night skyline whose windows switch on and off, plus drizzle. It replaces the old starfield.
  - `flashlight`: a darkness layer with a soft hole that follows the pointer.
  - `stamp`: PERFECT / QUICK / GOOD timing feedback with a combo counter.
  - `banner`: a hazard-tape slab whose word slams in.
  - `soundToggle`: an ON / OFF switch, also bound to `M`.
- **Boot** ([BootScene.ts](../../../frontend/src/game/scenes/BootScene.ts)): a "Preparing the night..." loader with a
  segmented meter, a counter and a streetlight that stutters on. It ends on a click-to-enter gate, so the first click also
  unlocks browser audio for the trailer.
- **Menu** ([MenuScene.ts](../../../frontend/src/game/scenes/MenuScene.ts)): the pointer is a flashlight. The city stays dark
  and the light widens over anything you can press, echoing how allies widen Priya's light.
  - A two-line neon sign title flickers on.
  - Mode buttons have keycaps (`1` and `2`).
  - The three-nights route can be hovered to show each place.
  - A How to play drawer slides in (`H`), and `T` replays the trailer.
- **HUD** ([Hud.ts](../../../frontend/src/game/ui/Hud.ts)): a segmented phone battery, the route shown as a frame ruler with
  Priya's marker, a segmented Barrier energy meter, an isolation bar with quarter marks, ability keycaps with use pips and a
  cooldown shade, and toasts that drop in.
- **Prompt cards** ([PromptScene.ts](../../../frontend/src/game/scenes/PromptScene.ts)):
  - An INCOMING / CHOICE header and a draining ruler as the timer.
  - Keycap options, with sentence-length options left-aligned.
  - `Enter` confirms multi-pick cards.
  - A correct answer stamps PERFECT (more than 60% of the clock left), QUICK (more than 30%) or GOOD, and builds a combo.
    A wrong answer shakes the camera and resets the combo.
- **Brief, Round End, Ending, Results, Prologue and Trailer** all use the new kit. Ending titles track in from wide letter
  spacing, and good endings leave the city's windows lit while bad ones go nearly dark.
- **DOM layer** ([components/](../../../frontend/src/components), [styles/index.css](../../../frontend/src/styles/index.css)):
  - A flashlight cursor that eases after the pointer, grows over clickable things and shrinks on press. It applies to mouse
    and trackpad only.
  - A CRT scanline and vignette overlay.
  - A "Turn your phone sideways" screen for portrait phones.
  - Respects `prefers-reduced-motion`.
- **Fixes found along the way:**
  - Replaying the trailer from the menu couldn't be skipped, because `isFinishing` was never reset.
  - The trailer's controls scrolled away during the shot 1 camera pan.
  - Text drawn before the webfonts arrived stayed in the fallback face.

## How to check

`npm run dev`, then:
- Boot shows the loader and waits for a click.
- On the menu, move the mouse to light up the city, hover the buttons to see the wipe, and hover a night on the route.
- Press `H` for the drawer.
- Start with `#dev=1` to see the HUD.
- In any helpline card, answer quickly to see the PERFECT stamp.

`npm run build` and `npm run lint` pass. A headless Chrome run through Boot, Trailer, Menu, Prologue, Brief, Level 1 and a
helpline card showed no console errors.

## Left

- The keyboard can't move focus between menu buttons (hotkeys work, but there's no focus ring navigation).
- After a card resolves, the correct option isn't highlighted in the option list. Only the result plate names it.
- Bungee and Varela Round load from Google Fonts. For offline play, self-host them in `public/`.
- The flashlight darkness is redrawn every frame on the menu. That's cheap at 1280x720, but on weak devices it could be skipped
  when the pointer hasn't moved.
