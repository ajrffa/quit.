import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';
import { Colors, FontFamily } from '@/constants/Theme';
import { BlurView } from 'expo-blur';
import { Svg, Path, Circle } from 'react-native-svg';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';

function TabIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={17} style={{ marginBottom: 2 }} {...props} />;
}

// Custom naturally beating 'Heart' icon for the Premium Home tab
function HeartIcon({ color, focused }: { color: string; focused: boolean }) {
  const scale = useSharedValue(1);

  React.useEffect(() => {
    if (focused) {
      // Pronounced double heartbeat pattern: Lub-dub... Lub-dub...
      scale.value = withRepeat(
        withSequence(
          withTiming(1.6, { duration: 150, easing: Easing.out(Easing.ease) }), // Lub (stronger)
          withTiming(1.05, { duration: 150, easing: Easing.in(Easing.ease) }), // Relax slightly
          withTiming(1.45, { duration: 150, easing: Easing.out(Easing.ease) }), // Dub (stronger)
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }) // Rest
        ),
        -1, // infinite
        false // don't reverse the whole sequence
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [focused]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    marginBottom: 2,
    alignItems: 'center',
    justifyContent: 'center'
  }));

  // SVG Path for a perfect heart
  return (
    <Animated.View style={animatedStyle}>
      <Svg width="22" height="22" viewBox="0 0 24 24" fill={focused ? color : 'none'}>
        <Path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          stroke={color}
          strokeWidth={focused ? "0" : "2"}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.tabItem,
        headerShown: false,
        tabBarBackground: () => (
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => <HeartIcon color={color} focused={focused} />
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{ title: 'Today', tabBarIcon: ({ color }) => <TabIcon name="check" color={color} /> }}
      />
      <Tabs.Screen
        name="stats"
        options={{ title: 'Progress', tabBarIcon: ({ color }) => <TabIcon name="line-chart" color={color} /> }}
      />
      <Tabs.Screen
        name="community"
        options={{ title: 'Stories', tabBarIcon: ({ color }) => <TabIcon name="comment-o" color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'You', tabBarIcon: ({ color }) => <TabIcon name="user-o" color={color} /> }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    borderTopColor: Colors.border,
    borderTopWidth: 0.5,
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
    paddingTop: 8,
    position: 'absolute',
    elevation: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0.8,
    marginTop: 4,
    fontFamily: FontFamily.sans,
  },
  tabItem: {
    paddingTop: 4,
  },
});
