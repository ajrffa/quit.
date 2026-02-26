import React from 'react';
import { Stack } from 'expo-router';

export default function DMLayout() {
    return (
        <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="[conversationId]" />
        </Stack>
    );
}
