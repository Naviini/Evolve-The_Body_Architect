/**
 * Edit Health Profile — accessible from within the app
 *
 * Thin wrapper around ProfileSetupScreen that passes edit-mode params
 * and the logged-in user's ID so the form pre-fills and saves correctly.
 */

import ProfileSetupScreen from './(auth)/profile-setup';
import { useLocalSearchParams } from 'expo-router';

export default ProfileSetupScreen;
