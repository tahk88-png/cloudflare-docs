# Rentbox Booking Calendar - Design Specification

## Design Philosophy

**Scandinavian Minimalism** - Clean, functional, business-first design with excellent readability and high contrast.

## Visual Design System

### Color Palette (STRICT - DO NOT DEVIATE)

```
Accent / Active:     #1DB954  ████  Primary action color
Accent Hover:        #159A46  ████  Hover state
Background:          #F7F9F8  ████  Page/section background
Card / Surface:      #FFFFFF  ████  Cards and elevated surfaces
Border / Divider:    #E2E8E4  ████  Borders, dividers, outlines
Text Primary:        #0F172A  ████  Main text, headings
Text Muted:          #6B7280  ████  Secondary text, labels
Disabled:            #CBD5CF  ████  Disabled elements
Error:               #DC2626  ████  Error messages, warnings
Partial Booking:     #EAF7F0  ████  Partially booked indicator
Unavailable:         #F1F3F2  ████  Fully booked / past dates
```

### Typography

**Font Family**: Inter (Scandinavian aesthetic)
- Fallback: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif

**Font Weights**:
- Regular: 400 (body text)
- Medium: 500 (labels, secondary headings)
- Semibold: 600 (primary headings, buttons)
- Bold: 700 (emphasis, rarely used)

**Font Sizes**:
- Small: 12-14px (labels, metadata)
- Base: 16px (body text)
- Large: 18-20px (day numbers, time slots)
- Heading: 24-32px (month/year display)

### Spacing System

Following 4px base unit:
```
xs:  4px   (0.25rem)
sm:  8px   (0.5rem)
md:  12px  (0.75rem)
base: 16px (1rem)
lg:  24px  (1.5rem)
xl:  32px  (2rem)
2xl: 48px  (3rem)
```

### Border Radius

```
Small:   10px  (day cards, small buttons)
Default: 14px  (time slots, CTAs, main cards)
Large:   20px  (container cards)
```

### Shadows

```
Subtle:  0 1px 2px rgba(0,0,0,0.05)
Default: 0 4px 6px rgba(0,0,0,0.1)
Strong:  0 10px 15px rgba(0,0,0,0.1)
```

## Component States

### Day Card States

**Available (Default)**
- Background: #FFFFFF (white)
- Border: 1px solid #E2E8E4
- Text: #0F172A
- Hover: Border → #1DB954, subtle shadow

**Selected**
- Background: #1DB954 (green)
- Border: none
- Text: #FFFFFF (white)
- Shadow: 0 4px 6px rgba(29, 185, 84, 0.2)

**Today**
- Background: #FFFFFF
- Border: 2px solid #1DB954
- Text: #1DB954
- Font-weight: 600
- Hover: Background → #EAF7F0

**Partially Booked**
- Background: #EAF7F0 (soft green tint)
- Border: 1px solid #E2E8E4
- Text: #0F172A
- Indicator: Small green dot at bottom
- Hover: Border → #1DB954

**Fully Booked / Disabled**
- Background: #F1F3F2 (gray)
- Border: none
- Text: #9CA3AF (muted)
- Cursor: not-allowed
- No hover state

**Past Date**
- Background: #F1F3F2
- Border: none
- Text: #9CA3AF
- Opacity: 0.6
- Cursor: not-allowed

### Time Slot States

**Available (Default)**
- Background: #FFFFFF
- Border: 1px solid #E2E8E4
- Text: #0F172A
- Hover: Border → #1DB954, subtle shadow

**Selected**
- Background: #1DB954
- Border: 1px solid #1DB954
- Text: #FFFFFF
- Shadow: 0 4px 6px rgba(29, 185, 84, 0.2)

**Disabled**
- Background: #F1F3F2
- Border: 1px solid transparent
- Text: #9CA3AF
- Cursor: not-allowed

### Button States

**Primary CTA (Confirm)**
- Background: #1DB954
- Text: #FFFFFF
- Font-weight: 600
- Padding: 12px 32px
- Border-radius: 14px
- Shadow: 0 4px 6px rgba(0,0,0,0.1)
- Hover: Background → #159A46, Shadow → stronger

**Primary CTA Disabled**
- Background: #CBD5CF
- Text: #6B7280
- Cursor: not-allowed
- No shadow, no hover

**Secondary (Back)**
- Background: #FFFFFF
- Border: 1px solid #E2E8E4
- Text: #0F172A
- Font-weight: 500
- Padding: 12px 24px
- Hover: Border → #1DB954, Background → #F7F9F8

## Layout Specifications

### Calendar Grid

**Desktop (≥768px)**
- 7 columns (Mon-Sun)
- Gap: 8px between cells
- Cell size: ~72px height
- Padding: 24px around grid

**Mobile (<768px)**
- 7 columns (abbreviated day names)
- Gap: 6px between cells
- Cell size: ~60px height
- Padding: 16px around grid

### Time Slot Grid

**Desktop**
- 4 columns
- Gap: 12px
- Min width per slot: 80px

**Tablet**
- 3 columns
- Gap: 10px

**Mobile**
- 2 columns
- Gap: 8px
- Full width slots

## Accessibility Requirements

### Focus States

All interactive elements MUST have visible focus ring:
- Ring: 2px solid #1DB954
- Ring offset: 2px
- Border-radius: Matches element

### Contrast Ratios

- Text on white: ≥4.5:1 ✓
- White on #1DB954: ≥4.5:1 ✓
- Muted text: ≥3:1 (for secondary content) ✓

### Touch Targets

- Minimum: 44x44px
- Day cards: 60-72px
- Time slots: 48px+ height
- Buttons: 44px+ height

### ARIA Labels

Every interactive element includes:
- `aria-label` with date/time information
- `aria-pressed` for selected states
- `aria-disabled` for disabled states
- `tabindex` management (0 for interactive, -1 for disabled)

## Animation Guidelines

**Transitions**: 200ms cubic-bezier(0.4, 0, 0.2, 1)

**Allowed animations**:
- Border color changes
- Background color changes
- Shadow changes
- Opacity changes

**Forbidden**:
- Heavy transforms (scale, rotate)
- Sliding animations
- Bounce effects
- Gradients (unless extremely subtle)

## Mobile-First Principles

### Viewport Breakpoints

```
Mobile:  < 640px
Tablet:  640px - 1024px
Desktop: ≥ 1024px
```

### Mobile Optimizations

1. **Sticky Bottom CTA**: Confirm button always visible
2. **Vertical Flow**: Natural scroll direction
3. **Large Touch Targets**: ≥44px
4. **Minimal Horizontal Scrolling**: Stack elements vertically
5. **Performance**: < 3s load time on 3G

## Error Handling

### Error Message Display

**Container**:
- Background: rgba(220, 38, 38, 0.05) (red tint)
- Border: 1px solid rgba(220, 38, 38, 0.2)
- Border-radius: 14px
- Padding: 16px
- Icon: Error symbol (!) in #DC2626

**Text**:
- Heading: "Error" in #DC2626, font-weight 600
- Message: Plain language, no technical jargon
- Color: #DC2626 with 80% opacity

### Common Error Messages

- "Unable to load availability. Please try again."
- "This time slot is no longer available."
- "Booking failed. Please check your connection."
- "Selected time is outside business hours."

## No Dead Clicks Rule

Every click/tap MUST result in:
1. Visual feedback (immediate)
2. State change (if applicable)
3. Clear next action (progress indicator)

**Never**:
- Clickable elements that do nothing
- Buttons without visible feedback
- Actions without confirmation
- Silent failures

## Design Checklist

Before shipping:
- [ ] All colors match exact hex values
- [ ] Focus rings visible on all interactive elements
- [ ] Touch targets ≥44px on mobile
- [ ] Text contrast ratios meet WCAG AA
- [ ] Error messages in plain language
- [ ] Loading states implemented
- [ ] Keyboard navigation works
- [ ] No dead clicks
- [ ] Mobile sticky CTA present
- [ ] Animations under 200ms

## Figma/Design Files

Design source: `rentbox-calendar-design.fig`
Component library: `rentbox-components.sketch`

---

**Design Lead**: [Design Team]
**Last Updated**: December 2025
**Version**: 1.0
