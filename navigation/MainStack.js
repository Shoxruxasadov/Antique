import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabs from './MainTabs';
import EditProfileScreen from '../screens/settings/EditProfileScreen';
import AppSettingsScreen from '../screens/settings/AppSettingsScreen';
import CreateSpaceScreen from '../screens/main/CreateSpaceScreen';
import IdentifyScreen from '../screens/main/IdentifyScreen';
import SnapTipsScreen from '../screens/main/SnapTipsScreen';
import InfoScannerScreen from '../screens/main/InfoScannerScreen';
import ItemDetailsScreen from '../screens/main/ItemDetailsScreen';
import AnalyzingScreen from '../screens/main/AnalyzingScreen';
import CollectionDetailScreen from '../screens/main/CollectionDetailScreen';
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
      <Stack.Screen name="CreateSpace" component={CreateSpaceScreen} />
      <Stack.Screen name="Identify" component={IdentifyScreen} />
      <Stack.Screen name="SnapTips" component={SnapTipsScreen} />
      <Stack.Screen name="InfoScanner" component={InfoScannerScreen} />
      <Stack.Screen name="ItemDetails" component={ItemDetailsScreen} />
      <Stack.Screen name="Analyzing" component={AnalyzingScreen} />
      <Stack.Screen name="CollectionDetail" component={CollectionDetailScreen} />
      <Stack.Screen name="Pro" component={ProScreen} />
      <Stack.Screen name="AssistantChat" component={AssistantScreen} />
    </Stack.Navigator>
  );
}
