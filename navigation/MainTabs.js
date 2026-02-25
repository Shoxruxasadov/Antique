import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/main/HomeScreen';
import CollectionScreen from '../screens/main/CollectionScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import TabBarBackground from '../components/TabBarBackground';
import CenterTabButton from './CenterTabButton';
import AssistantTabButton from './AssistantTabButton';
import { colors, fonts } from '../theme';
import { useAppSettingsStore } from '../stores/useAppSettingsStore';
import { triggerHaptic } from '../lib/haptics';

const Tab = createBottomTabNavigator();

const TAB_ICON_SIZE = 24;

function PlaceholderScreen() {
  return <View style={{ flex: 1 }} />;
}

export default function MainTabs() {
  const vibration = useAppSettingsStore((s) => s.vibration);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarBackground: () => <TabBarBackground />,
        tabBarShowLabel: true,
        screenListeners: {
          tabPress: () => triggerHaptic(vibration),
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name="grid" size={TAB_ICON_SIZE} color={color} />
          ),
          tabBarLabel: 'Home',
        }}
      />
      <Tab.Screen
        name="Collection"
        component={CollectionScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name="folder-open" size={TAB_ICON_SIZE} color={color} />
          ),
          tabBarLabel: 'Collections',
        }}
      />
      <Tab.Screen
        name="Identify"
        component={PlaceholderScreen}
        options={{
          tabBarButton: (props) => <CenterTabButton {...props} />,
          tabBarLabel: '',
          tabBarShowLabel: false,
        }}
      />
      <Tab.Screen
        name="Assistant"
        component={PlaceholderScreen}
        options={{
          tabBarButton: (props) => <AssistantTabButton {...props} />,
          tabBarLabel: 'Assistant',
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <Ionicons name="person" size={TAB_ICON_SIZE} color={color} />
          ),
          tabBarLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -6,
    height: 117,
    borderTopWidth: 0,
    paddingTop: 26,
    zIndex: 100,
    elevation: 100,
    backgroundColor: 'transparent',
    shadowOpacity: 0,
  },
  tabBarLabel: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },
});
