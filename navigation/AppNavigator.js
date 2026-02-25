import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import GetStartedScreen from '../screens/auth/GetStartedScreen';
import SignInScreen from '../screens/auth/SignInScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import MainStack from './MainStack';
import { useAuthStore } from '../stores/useAuthStore';
import { useOnboardingStore } from '../stores/useOnboardingStore';

const Stack = createNativeStackNavigator();

export default function AppNavigator({ completeOnboarding }) {
  const user = useAuthStore((s) => s.user);
  const hasSkippedGetStarted = useOnboardingStore((s) => s.hasSkippedGetStarted);

  const initialRoute =
    user ? 'Main' : (hasSkippedGetStarted ? 'Main' : 'Onboarding');

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Onboarding">
        {(props) => (
          <OnboardingScreen
            {...props}
            onComplete={completeOnboarding}
            onSkip={completeOnboarding}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="GetStarted" component={GetStartedScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen
        name="Main"
        component={MainStack}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
