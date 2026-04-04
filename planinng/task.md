# Calorie Tracker App — React Native + Expo + Supabase

## Phase 1: Project Setup & Foundation
- [ ] Initialize Expo project with TypeScript
- [ ] Install & configure dependencies (Supabase, Expo SQLite, React Navigation, etc.)
- [ ] Set up project folder structure
- [ ] Configure Supabase client & Expo SQLite local DB

## Phase 2: Database & Data Layer
- [ ] Design Supabase schema (users, food_items, meals, daily_logs, nutrition_data)
- [ ] Design Expo SQLite local schema (mirror + sync metadata)
- [ ] Implement sync layer between local SQLite and Supabase
- [ ] Set up Supabase Auth (email/password + social)

## Phase 3: Core UI Screens
- [ ] Onboarding / Welcome flow
- [ ] Login & Registration screens
- [ ] Home / Dashboard screen
- [ ] Daily Diary screen (meal log with breakfast/lunch/dinner/snacks)
- [ ] Food Search & Add Meal screen
- [ ] Analytics / Stats screen
- [ ] Profile / Settings screen

## Phase 4: Image Scanning & Food Recognition
- [ ] Camera integration with expo-camera
- [ ] Image capture & gallery picker UI
- [ ] Food recognition API integration (initial — using a pre-trained model)
- [ ] Display recognized food + calorie estimate
- [ ] Allow user to confirm/edit recognized food & portions

## Phase 5: Fine-Tuned Vision Model
- [ ] Select base model architecture (ViT / EfficientNet)
- [ ] Prepare Food-101 / custom dataset for fine-tuning
- [ ] Fine-tune model using transfer learning
- [ ] Deploy model as API endpoint (Supabase Edge Function or external)
- [ ] Integrate fine-tuned model into app scanning flow

## Phase 6: Offline-First & Sync
- [ ] Implement connectivity detection (@react-native-community/netinfo)
- [ ] Outbox pattern for pending mutations
- [ ] Background sync on connectivity restore
- [ ] Optimistic UI updates
- [ ] Conflict resolution strategy (last-write-wins)

## Phase 7: Web Support
- [ ] Ensure Expo web build works
- [ ] Responsive layouts for web browser
- [ ] Camera/file input fallback for web

## Phase 8: Polish & Testing
- [ ] UI/UX polish, animations, micro-interactions
- [ ] Unit tests for core logic
- [ ] Integration tests for sync layer
- [ ] End-to-end manual testing on Expo Go
