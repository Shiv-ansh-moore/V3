# CLAUDE.md

## Project Overview

V3App is a React Native accountability app built with Expo (SDK 54), TypeScript, and Expo Router.

## Architecture

- Routing: Expo Router with file-based routing in app/
- Navigation: Swipeable pager (react-native-pager-view) with custom animated TabBar
- Design tokens: constants/Colours.ts and constants/Fonts.ts
- Components: Functional components with hooks, StyleSheet.create for styles

## Design System

- Accent: Electric Orange #FF6B00
- Background: #0A0A0A
- Card: #1A1A1A with #222 border
- Text: #FFFFFF primary, #878787 secondary
- Font: Inter — 400 body, 500 secondary, 600 buttons/tabs, 700 headers
- Use fontFamily not fontWeight (named font variants handle weight)
- British English spelling (Colours not Colors)

## Tools

- Figma MCP connected — read design specs directly from Figma
- Figma file: https://www.figma.com/design/VniPdOVHf8qEUqznNJYWgd/demo

## Conventions

- Functional components only
- StyleSheet.create for all styles (no inline styles)
- No descriptions on goal tiles — just icon + title
- Dark theme, portrait only

## App Concept

- Accountability app for friend groups (max 7 people)
- Two pages: Personal (bento grid of goals) and Social (group chat)
- Goals are proof-based (camera → photo submission)
- Screen time locks are separate from goals (timer + lock card)
- Lock tiles always on top, goals in middle, done at bottom
- All messages left-aligned on social page (group chat style)
