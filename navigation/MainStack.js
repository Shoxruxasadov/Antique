import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import EditProfileScreen from '../screens/settings/EditProfileScreen';
import AppSettingsScreen from '../screens/settings/AppSettingsScreen';
import PreferredCurrencyScreen from '../screens/settings/PreferredCurrencyScreen';
import ScannerScreen from '../screens/stack/ScannerScreen';
import InfoScannerScreen from '../screens/stack/InfoScannerScreen';
import AntiqueScreen from '../screens/stack/AntiqueScreen';
import CollectionDetailScreen from '../screens/stack/CollectionDetailScreen';
import AllPostsScreen from '../screens/stack/AllPostsScreen';
import PostScreen from '../screens/stack/PostScreen';
import ProScreen from '../screens/settings/ProScreen';
import AssistantScreen from '../screens/main/AssistantScreen';

const Stack = createNativeStackNavigator();

export default function MainStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="AppSettings" component={AppSettingsScreen} />
      <Stack.Screen name="PreferredCurrency" component={PreferredCurrencyScreen} />
      <Stack.Screen name="Identify" component={ScannerScreen} />
      <Stack.Screen name="InfoScanner" component={InfoScannerScreen} />
      <Stack.Screen name="ItemDetails" component={AntiqueScreen} />
      <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
      <Stack.Screen name="AllPosts" component={AllPostsScreen} />
      <Stack.Screen name="Post" component={PostScreen} />
      <Stack.Screen name="Pro" component={ProScreen} />
      <Stack.Screen name="AssistantChat" component={AssistantScreen} />
    </Stack.Navigator>
  );
}
