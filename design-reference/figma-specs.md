# Figma Design Specs — Personal Page

## Screen: 390x844, background #0a0a0a

## LockCard (2 locks = 170w each, 1 lock = 352w)
- **Size:** 170x205 (half) or 352x205 (full)
- **Background:** #191919
- **Border radius:** 20
- **Padding:** 16 left/right, 14 top/bottom
- **Item spacing (gap):** 6
- **No border stroke on cards** (just fill)

### App icon container
- 40x40, background #262626, radius 10, padding 2
- Icon image inside: 35x35

### App name
- Font: Inter, 12px, weight 400, color #878787

### Timer
- Font: Inter, 32px, weight 600, color #ffffff

### "Remaining" label
- Font: Inter, 10px, weight 200, color #878787

### Progress bar
- Track: 138w (half) or 320w (full), 5px height, #262626, radius 20
- Fill: #ff6a00, radius 20 (width varies by time remaining)

### LOCK NOW button
- Full width of content area (138 or 320)
- Height: 36, background #ff6a00, radius 10
- Text: "LOCK NOW", Inter 14px, weight 700, #ffffff

## Goal Tile (active)
- **Small:** 170x120
- **Large (full width):** 352x120
- **Background:** #191919
- **Border radius:** 20
- **No orange border** — just #191919 fill

### Icon container
- 45x45, background #262626, radius 10
- Icon inside: 40x40, stroke color #b24a00 (darker orange), strokeWidth 2.5

### Title
- Font: Inter, 14px, weight 500, color #ffffff

### Duration
- Font: Inter, 10px, weight 400, color #878787

### Checkbox (unchecked)
- 24x24 container
- Circle: 22x22, stroke #262626, strokeWidth 2, no fill

## Done Tile
- **Size:** ~170x79
- **Background:** #191919
- **Border radius:** 20
- **Padding:** 16 left/right, 22 top/bottom
- **Gap between elements:** 13
- **Layout:** horizontal row (icon, title, checkmark)

### Icon container
- 35x35, background #262626, radius 10
- Image: 30x30

### Title
- Font: Inter, 12px, weight 400, color #878787

### Checkmark circle
- 20x20 container
- Circle: 18.3x18.3, stroke #b24a00, strokeWidth 2
- Check icon: 12.5x12.5 inside

## DONE TODAY Divider
- Text: "DONE TODAY", Inter 14px, weight 500, color #191919 (same as bg — uses lines on sides)
- Lines: 122-123w, 2px height, #191919

## FAB (Add Goal Button)
- 64x64 circle
- Background: #ff6a00
- Text: "+", Inter 40px, weight 500, #ffffff

## Profile Button
- 36x36 circle
- Stroke: #ff6a00, strokeWidth 2, no fill

## Grid Layout
- Two columns, tiles 170w each with gap between
- Full-width tiles: 352w
- Horizontal padding: ~19px each side (390 - 170 - 170 - gap ≈ 390 - 352 = 38 / 2 = 19)

## Key Colours
- Background: #0a0a0a
- Card: #191919
- Icon bg: #262626
- Accent: #ff6a00
- Icon stroke: #b24a00 (darker orange)
- Text primary: #ffffff
- Text secondary: #878787
- Checkbox stroke: #262626
- Done check: #b24a00
