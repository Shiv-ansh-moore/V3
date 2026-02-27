# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

V3App is a React Native mobile app built with Expo (SDK 54), TypeScript, and Expo Router. Targets iOS, Android, and web. New Architecture is enabled.

## Commands

- `npm start` — Start Expo dev server
- `npm run ios` — Run on iOS simulator
- `npm run android` — Run on Android emulator
- `npm run web` — Run web version
- `npm run lint` — Run ESLint (via `expo lint`)

No test framework is configured yet.

## Architecture

**Routing**: Expo Router with file-based routing in `app/`. Entry point is `app/_layout.tsx` (loads fonts, wraps app) → `app/index.tsx` (main screen).

**Navigation**: Swipeable pager (`react-native-pager-view`) with a custom animated `TabBar` component. Scroll position is tracked via `Animated.Value` and shared between the pager and tab bar for coordinated animations.

**Design tokens**: Centralized in `constants/` — `Colours.ts` (dark theme, brand orange #FF6A00) and `Fonts.ts` (Inter font family, 9 weights).

**Components**: Functional components with hooks. Styles defined locally with `StyleSheet.create()`. Props typed via interfaces.

## Key Conventions

- Dark theme with orange (#FF6A00) as the brand/accent color
- Inter font loaded from `@expo-google-fonts/inter` at app startup
- Portrait orientation only
- Safe area handling via `react-native-safe-area-context`
- British English spelling in code (e.g. `Colours` not `Colors`)
